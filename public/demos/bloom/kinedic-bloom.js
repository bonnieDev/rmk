/*!
 * Kinedic Bloom v0.3.0 — an interface layer that adapts to the person using it.
 * Copyright (C) 2026 Bonnie Caroline Remeika. Licensed under GPL-3.0-only.
 * "Kinedic" and "Kinedic Bloom" are trademarks of Bonnie Caroline Remeika.
 *
 * Bloom reads friction, not people. Everything runs in the browser: nothing is
 * collected, nothing is sent anywhere. Every change it makes is announced and
 * can be undone, and it never rearranges what someone is in the middle of using.
 *
 * Use:  <form data-bloom-root> … </form>
 *       <script src="kinedic-bloom.js"></script>
 *       <script>const bloom = KinedicBloom.start()</script>
 */
(function (global) {
  'use strict';

  var DEFAULTS = {
    root: '[data-bloom-root]',
    // Motor friction: a tremor reads as many direction reversals over a long
    // path that goes almost nowhere, inside a short window.
    windowMs: 650,
    minReversals: 6,
    minPath: 120,
    maxNetRatio: 0.35,
    nearMissPx: 36,
    // Cognitive friction
    stallMs: 12000,          // focused on a field, no typing
    refocusLimit: 3,         // came back to the same field this many times
    rereadLimit: 3,          // scrolled back up this many times in a minute
    // Scores (0 = calm). Each signal adds; scores decay gently over time.
    motorLevels: [0.6, 1.4],
    breakAt: 1.2,
    // Gentle: about one point every two minutes, so two stalls a few minutes
    // apart still add up to a break offer.
    decayPerSec: 0.008,
    breakSnoozeMs: 5 * 60 * 1000,
    // Saved progress
    storageKey: null,        // defaults to the page path
    saveTtlMs: 7 * 24 * 60 * 60 * 1000,
    storage: null,           // where paused progress goes; see "CONNECT YOUR DATABASE" below
    announce: true,
    // Keyboard and seeing
    keyboardTabs: 3,         // Tab presses without the pointer → keyboard mode
    pointerResetPx: 400,     // real pointer travel that ends keyboard mode
    zoomOfferScale: 1.25,    // pinch-zoom past this → offer larger text
    // Clicking the wrong thing
    rageClicks: 3, rageMs: 1000, ragePx: 40,
    // Tab-readiness audit at start, fixing what's safe to fix
    audit: true,
    // Show phone numbers as 555-123-4567 once a field is left or autofilled.
    // Opt a field out with data-bloom-noformat.
    formatPhone: true,
  };

  var OFF_KEY = 'kinedic-bloom:off';

  function start(options) {
    var o = Object.assign({}, DEFAULTS, options || {});
    var root = typeof o.root === 'string' ? document.querySelector(o.root) : o.root;
    if (!root) throw new Error('Kinedic Bloom: no root element (add data-bloom-root)');
    var html = document.documentElement;
    var saveKey = 'kinedic-bloom:save:' + (o.storageKey || location.pathname);

    // ── CONNECT YOUR DATABASE ────────────────────────────────────────────
    // By default, paused progress stays on the person's device (localStorage)
    // and nothing is sent anywhere. To save it to your own backend instead,
    // pass a `storage` object with get / set / remove. Each may return a
    // Promise. `value` is a JSON string of the field values (never passwords
    // or files), the field they were in, and when they paused.
    //
    // Only do this with the person's knowledge, behind your own sign-in, and
    // with your privacy office's approval (for federal sites, the Privacy Act
    // and your system's SORN apply). Bloom's on-device default needs none of it.
    //
    //   KinedicBloom.start({
    //     storage: {
    //       // Example: your own API
    //       get:    (key)        => fetch('/api/progress/' + encodeURIComponent(key), { credentials: 'include' })
    //                                  .then((r) => (r.ok ? r.text() : null)),
    //       set:    (key, value) => fetch('/api/progress/' + encodeURIComponent(key), {
    //                                  method: 'PUT', credentials: 'include',
    //                                  headers: { 'Content-Type': 'application/json' }, body: value,
    //                                }).then((r) => r.ok),
    //       remove: (key)        => fetch('/api/progress/' + encodeURIComponent(key), { method: 'DELETE', credentials: 'include' }),
    //
    //       // Example: Supabase (a `progress` table keyed by user and form)
    //       // get:    async (key) => (await supabase.from('progress').select('value').eq('key', key).maybeSingle()).data?.value ?? null,
    //       // set:    async (key, value) => !(await supabase.from('progress').upsert({ key, value })).error,
    //       // remove: async (key) => supabase.from('progress').delete().eq('key', key),
    //     },
    //   });
    var onDevice = !o.storage;
    var store = o.storage || { get: safeGet, set: safeSet, remove: safeRemove };
    function storeGet(k) { try { return Promise.resolve(store.get(k)).catch(function () { return null; }); } catch (_) { return Promise.resolve(null); } }
    function storeSet(k, v) { try { return Promise.resolve(store.set(k, v)).then(function (ok) { return ok !== false; }, function () { return false; }); } catch (_) { return Promise.resolve(false); } }
    function storeRemove(k) { try { return Promise.resolve(store.remove(k)).catch(function () {}); } catch (_) { return Promise.resolve(); } }

    var listeners = {};
    var state = {
      off: safeGet(OFF_KEY) === '1',
      motor: 0, cognitive: 0, motorLevel: 0,
      samples: [], ticking: false,
      field: null, fieldSince: 0, lastInput: 0, stallFired: false,
      refocus: new Map(), rereads: [], lastScrollY: window.scrollY,
      breakSnoozedUntil: 0, offered: new Set(), paused: false,
      last: performance.now(),
      tabs: 0, keyboard: false, travel: 0, px: null, py: null,
      undo: null, clicks: [], textOffered: false,
    };

    // ── events ────────────────────────────────────────────────────────────
    function on(type, fn) { (listeners[type] = listeners[type] || []).push(fn); return api; }
    function emit(type, detail) { (listeners[type] || []).forEach(function (fn) { fn(detail); }); }
    function log(msg, kind) { emit('log', { message: msg, kind: kind || 'info', at: Date.now() }); }

    // ── the status bar: what Bloom changed, with undo and off ─────────────
    var bar = el('div', { class: 'bloom-bar', role: 'status', 'aria-live': 'polite' });
    var barText = el('span', { class: 'bloom-bar__text' });
    var actBtn = el('button', { type: 'button', class: 'bloom-bar__btn bloom-bar__act' });
    var undoBtn = el('button', { type: 'button', class: 'bloom-bar__btn' }, 'Undo');
    var offBtn = el('button', { type: 'button', class: 'bloom-bar__btn' }, 'Turn off Bloom');
    bar.append(barText, actBtn, undoBtn, offBtn);
    bar.hidden = true;
    root.appendChild(bar);
    // Undo reverses whatever Bloom changed last.
    undoBtn.addEventListener('click', function () { var u = state.undo; state.undo = null; if (u) u(); hideBar(); });
    offBtn.addEventListener('click', function () { setOff(true); });
    var onAct = null;
    actBtn.addEventListener('click', function () { var f = onAct; onAct = null; actBtn.hidden = true; if (f) f(); });

    // text: what to say. undo: how to reverse it (shows Undo). action: an
    // offered next step, as [label, fn].
    function showBar(text, undo, action) {
      if (!o.announce) return;
      barText.textContent = text;
      if (undo !== undefined) state.undo = undo || null;
      undoBtn.hidden = !state.undo;
      onAct = action ? action[1] : null;
      actBtn.hidden = !action;
      if (action) actBtn.textContent = action[0];
      bar.hidden = false;
    }
    function hideBar() { bar.hidden = true; }

    // ── motor: tremor and near-misses ─────────────────────────────────────
    function onPointerMove(e) {
      if (state.off || state.paused || e.pointerType === 'touch') return;
      var now = performance.now();
      if (e.isTrusted) {
        if (state.px != null) state.travel += Math.hypot(e.clientX - state.px, e.clientY - state.py);
        state.px = e.clientX; state.py = e.clientY;
        if (state.keyboard && state.travel > o.pointerResetPx) setKeyboard(false, 'pointer in use again');
      }
      state.samples.push({ x: e.clientX, y: e.clientY, t: now });
      while (state.samples.length && now - state.samples[0].t > o.windowMs) state.samples.shift();
      if (!state.ticking) { state.ticking = true; requestAnimationFrame(analyze); }
    }

    function analyze() {
      state.ticking = false;
      var s = state.samples;
      if (s.length < 8) return;
      var reversals = 0, path = 0, pdx = 0, pdy = 0;
      for (var i = 1; i < s.length; i++) {
        var dx = s[i].x - s[i - 1].x, dy = s[i].y - s[i - 1].y;
        path += Math.hypot(dx, dy);
        if (Math.abs(dx) > 1 && pdx && Math.sign(dx) !== Math.sign(pdx)) reversals++;
        if (Math.abs(dy) > 1 && pdy && Math.sign(dy) !== Math.sign(pdy)) reversals++;
        if (Math.abs(dx) > 1) pdx = dx;
        if (Math.abs(dy) > 1) pdy = dy;
      }
      var net = Math.hypot(s[s.length - 1].x - s[0].x, s[s.length - 1].y - s[0].y);
      var tremor = reversals >= o.minReversals && path >= o.minPath && net <= path * o.maxNetRatio;
      emit('motor', { reversals: reversals, path: Math.round(path), net: Math.round(net), tremor: tremor, score: state.motor });
      if (tremor) {
        bump('motor', 0.35, 'Pointer tremor: ' + reversals + ' reversals over ' + Math.round(path) + 'px, net ' + Math.round(net) + 'px');
        state.samples = [];
      }
    }

    function onPointerDown(e) {
      if (state.off || state.paused || e.button !== 0) return;
      if (e.target.closest && e.target.closest('button, a, input, select, textarea, label, [role=button]')) return;
      var near = nearestTarget(e.clientX, e.clientY);
      if (near && near.dist <= o.nearMissPx) {
        bump('motor', 0.3, 'Near-miss: ' + Math.round(near.dist) + 'px from “' + label(near.el) + '”');
        record(rep.misses, accName(near.el), { wanted: accName(near.el), closestPx: Math.round(near.dist) }, function (r) { r.closestPx = Math.min(r.closestPx, Math.round(near.dist)); });
      }
    }

    function nearestTarget(x, y) {
      var best = null;
      root.querySelectorAll('button, a[href], input, select, textarea, [role=button]').forEach(function (t) {
        var r = t.getBoundingClientRect();
        if (!r.width) return;
        var dx = Math.max(r.left - x, 0, x - r.right), dy = Math.max(r.top - y, 0, y - r.bottom);
        var d = Math.hypot(dx, dy);
        if (!best || d < best.dist) best = { el: t, dist: d };
      });
      return best;
    }

    function setMotorLevel(level, reason) {
      if (level === state.motorLevel) return;
      var up = level > state.motorLevel;
      state.motorLevel = level;
      if (level) html.setAttribute('data-bloom-motor', String(level));
      else html.removeAttribute('data-bloom-motor');
      emit('adapt', { kind: 'motor', level: level, reason: reason });
      if (level && up) {
        change('Larger targets (level ' + level + ')');
        // Undo starts the motor score over too, so the next shake doesn't
        // snap the change straight back.
        showBar(level === 1 ? 'Bloom made buttons and fields easier to hit.' : 'Bloom made targets larger and easier to hit.',
          function () { state.motor = 0; setMotorLevel(0, 'undone'); });
        log('Larger targets (level ' + level + ')', 'adapt');
      } else if (!level) {
        log('Target sizes back to normal (' + reason + ')', 'adapt');
      }
    }

    // ── cognitive: stalls, returns, re-reading, rewriting ─────────────────
    function onFocusIn(e) {
      var f = e.target;
      if (!isField(f)) return;
      state.field = f; state.fieldSince = performance.now(); state.lastInput = state.fieldSince; state.stallFired = false;
      var n = (state.refocus.get(f) || 0) + 1;
      state.refocus.set(f, n);
      if (n >= 2) record(rep.revisits, accName(f), { field: accName(f) }, function (r) { r.count = n; });
      if (n === o.refocusLimit) bump('cognitive', 0.4, 'Came back to “' + label(f) + '” ' + n + ' times', f);
    }
    function onFocusOut(e) { if (e.target === state.field) state.field = null; }
    function onAnyFocus(e) {
      if (!state.keyboard) return;
      // describe controls in the form; step out of the way everywhere else
      if (root.contains(e.target) && !isBloomUI(e.target)) describeFocus(e.target);
      else caption.hidden = true;
    }
    function onInput(e) {
      if (!isField(e.target)) return;
      state.lastInput = performance.now(); state.stallFired = false;
    }
    function onScroll() {
      var y = window.scrollY, now = performance.now();
      if (y < state.lastScrollY - 120) {
        state.rereads = state.rereads.filter(function (t) { return now - t < 60000; });
        state.rereads.push(now);
        if (state.rereads.length === o.rereadLimit) bump('cognitive', 0.4, 'Scrolled back to re-read ' + o.rereadLimit + ' times in a minute');
      }
      state.lastScrollY = y;
    }

    function tick() {
      var now = performance.now(), dt = (now - state.last) / 1000;
      state.last = now;
      if (!state.off && !state.paused) {
        state.motor = Math.max(0, state.motor - o.decayPerSec * dt);
        state.cognitive = Math.max(0, state.cognitive - o.decayPerSec * dt);
        var f = state.field;
        if (f && !state.stallFired && now - state.lastInput > o.stallMs) {
          state.stallFired = true;
          bump('cognitive', 0.5, 'Stalled on “' + label(f) + '”: ' + Math.round((now - state.lastInput) / 1000) + 's without typing', f);
          record(rep.stalls, accName(f), { field: accName(f) });
        }
        emit('tick', {
          motor: state.motor, cognitive: state.cognitive, motorLevel: state.motorLevel,
          field: f ? label(f) : null, idleMs: f ? now - state.lastInput : 0,
        });
      }
      timer = setTimeout(tick, 250);
    }
    var timer = null;

    function bump(kind, amount, why, field) {
      if (state.off || state.paused) return;
      state[kind] = Math.min(3, state[kind] + amount);
      log(why, kind);
      emit('signal', { kind: kind, amount: amount, why: why, score: state[kind] });
      if (kind === 'motor') {
        var lv = state.motor >= o.motorLevels[1] ? 2 : state.motor >= o.motorLevels[0] ? 1 : 0;
        // only ever steps up on its own; stepping down is the person's call
        if (lv > state.motorLevel) setMotorLevel(lv, why);
      } else {
        if (field) offerSteps(field);
        if (state.cognitive >= o.breakAt) offerBreak();
      }
    }

    // ── offer: answer in smaller steps ────────────────────────────────────
    function offerSteps(field) {
      var block = field.closest('[data-bloom-steps]');
      if (!block || state.offered.has(block)) return;
      var prompts;
      try { prompts = JSON.parse(block.getAttribute('data-bloom-steps')); } catch (_) { return; }
      if (!Array.isArray(prompts) || !prompts.length) return;
      state.offered.add(block);
      var offer = el('div', { class: 'bloom-offer', role: 'region', 'aria-label': 'Bloom suggestion' });
      var yes = el('button', { type: 'button', class: 'bloom-offer__yes' }, 'Yes, smaller steps');
      var no = el('button', { type: 'button', class: 'bloom-offer__no' }, 'No thanks');
      offer.append(el('p', {}, 'This question asks for a lot at once. Want to answer it in ' + prompts.length + ' smaller steps?'), yes, no);
      block.insertBefore(offer, block.firstChild);
      emit('offer', { kind: 'steps', field: label(field) });
      log('Offered smaller steps for “' + label(field) + '”', 'offer');
      announce('Suggestion: answer this question in smaller steps.');
      no.addEventListener('click', function () { offer.remove(); log('Smaller steps declined', 'offer'); });
      yes.addEventListener('click', function () { offer.remove(); runSteps(block, field, prompts); });
    }

    function runSteps(block, field, prompts) {
      var answers = [], i = 0;
      var original = Array.prototype.slice.call(block.children);
      original.forEach(function (c) { c.hidden = true; });
      var wiz = el('div', { class: 'bloom-steps' });
      var count = el('p', { class: 'bloom-steps__count' });
      var id = 'bloom-step-' + Math.random().toString(36).slice(2, 8);
      var q = el('label', { class: 'bloom-steps__q', for: id });
      var input = el('textarea', { class: 'bloom-steps__a', id: id, rows: '2' });
      var next = el('button', { type: 'button', class: 'bloom-steps__next' });
      var back = el('button', { type: 'button', class: 'bloom-steps__full' }, 'Back to the full question');
      wiz.append(count, q, input, next, back);
      block.appendChild(wiz);
      emit('adapt', { kind: 'steps', field: label(field) });
      change('Smaller steps for “' + accName(field) + '”');
      log('Smaller steps accepted for “' + label(field) + '”', 'adapt');
      function show() {
        count.textContent = 'Step ' + (i + 1) + ' of ' + prompts.length;
        q.textContent = prompts[i];
        input.value = answers[i] || '';
        next.textContent = i < prompts.length - 1 ? 'Next' : 'Put my answer together';
        input.focus();
      }
      function finish(applied) {
        wiz.remove();
        original.forEach(function (c) { c.hidden = false; });
        if (applied) {
          // nothing is rewritten silently: the joined answer lands in the
          // real field, in plain view, for the person to check and edit
          field.value = prompts.map(function (p, k) { return p + ' ' + (answers[k] || '').trim(); }).join('\n');
          var note = el('p', { class: 'bloom-note', role: 'status' }, 'Here’s your answer, put together. You can edit it before you submit.');
          field.insertAdjacentElement('afterend', note);
          field.dispatchEvent(new Event('input', { bubbles: true }));
          log('Answers put together in “' + label(field) + '” for review', 'adapt');
        }
        field.focus();
      }
      next.addEventListener('click', function () {
        answers[i] = input.value;
        if (i < prompts.length - 1) { i++; show(); } else finish(true);
      });
      back.addEventListener('click', function () { finish(false); });
      show();
    }

    // ── offer: take a break ───────────────────────────────────────────────
    function offerBreak() {
      if (performance.now() < state.breakSnoozedUntil || root.querySelector('.bloom-break')) return;
      var box = el('div', { class: 'bloom-break', role: 'region', 'aria-label': 'Bloom suggestion' });
      var pauseBtn = el('button', { type: 'button', class: 'bloom-offer__yes' }, 'Pause');
      var keep = el('button', { type: 'button', class: 'bloom-offer__no' }, 'Keep going');
      box.append(
        el('p', { class: 'bloom-break__title' }, 'Would you like to take a break?'),
        el('p', {}, 'Press pause and your progress is saved on this device. You can come back here and pick up right at this spot.'),
        pauseBtn, keep);
      // right where the person is, not at the top of a long form
      var f = state.field || (isField(document.activeElement) ? document.activeElement : null);
      var anchor = f && (f.closest('[data-bloom-steps], fieldset, .field, .usa-form-group') || f);
      if (anchor && anchor !== root) anchor.insertAdjacentElement('afterend', box);
      else root.insertBefore(box, root.firstChild);
      emit('offer', { kind: 'break' });
      change('Offered a break');
      log('Offered a break (cognitive load ' + state.cognitive.toFixed(2) + ')', 'offer');
      announce('Suggestion: take a break. Your progress can be saved.');
      keep.addEventListener('click', function () {
        box.remove();
        state.breakSnoozedUntil = performance.now() + o.breakSnoozeMs;
        log('Break declined; not asking again for a while', 'offer');
      });
      pauseBtn.addEventListener('click', function () { box.remove(); pause(); });
    }

    // ── pause and resume, saved on this device only ───────────────────────
    function fields() {
      return Array.prototype.filter.call(root.querySelectorAll('input, select, textarea'), function (f) {
        return isField(f) && f.type !== 'password' && f.type !== 'file' && !f.closest('[data-bloom-nosave]') && (f.name || f.id);
      });
    }
    function keyOf(f) { return f.name ? 'n:' + f.name + (f.type === 'radio' ? ':' + f.value : '') : 'i:' + f.id; }

    function pause() {
      var active = state.field || document.activeElement;
      var data = { v: 1, savedAt: Date.now(), scrollY: window.scrollY, focus: isField(active) ? keyOf(active) : null, values: {} };
      fields().forEach(function (f) {
        data.values[keyOf(f)] = (f.type === 'checkbox' || f.type === 'radio') ? f.checked : f.value;
      });
      state.paused = true;
      storeSet(saveKey, JSON.stringify(data)).then(function (saved) { showPaused(data, saved); });
    }

    function showPaused(data, saved) {
      var where = onDevice ? ' on this device' : '';
      change('Paused and saved progress');
      emit('pause', { saved: saved, onDevice: onDevice });
      log(saved ? 'Paused. Progress saved' + where + '.' : 'Paused, but progress could not be saved', 'pause');

      var shade = el('div', { class: 'bloom-pause', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'bloom-pause-title' });
      var card = el('div', { class: 'bloom-pause__card' });
      var resumeBtn = el('button', { type: 'button', class: 'bloom-offer__yes' }, 'Resume now');
      var forgetBtn = el('button', { type: 'button', class: 'bloom-offer__no' }, 'Forget saved progress');
      card.append(
        el('h2', { id: 'bloom-pause-title' }, 'Paused'),
        el('p', {}, saved
          ? 'Your progress is saved' + where + '. Go rest. When you come back to this page, you’ll pick up right where you left off.'
          : 'Your progress couldn’t be saved, so please keep this page open.'),
        el('p', { class: 'bloom-pause__fine' }, onDevice
          ? 'Nothing was sent anywhere. On a shared computer, choose “Forget saved progress” before you leave.'
          : 'On a shared computer, choose “Forget saved progress” before you leave.'),
        resumeBtn, forgetBtn);
      shade.appendChild(card);
      document.body.appendChild(shade);
      resumeBtn.focus();
      resumeBtn.addEventListener('click', function () { shade.remove(); state.paused = false; restore(data); });
      forgetBtn.addEventListener('click', function () {
        forget();
        card.replaceChildren(el('h2', { id: 'bloom-pause-title' }, 'Saved progress removed'),
          el('p', {}, 'Your saved progress from this form has been removed.'), resumeBtn);
        resumeBtn.textContent = 'Back to the form';
        resumeBtn.focus();
      });
    }

    function restore(data) {
      var byKey = {};
      fields().forEach(function (f) { byKey[keyOf(f)] = f; });
      Object.keys(data.values).forEach(function (k) {
        var f = byKey[k]; if (!f) return;
        if (f.type === 'checkbox' || f.type === 'radio') f.checked = !!data.values[k];
        else f.value = data.values[k];
      });
      window.scrollTo(0, data.scrollY || 0);
      var target = data.focus && byKey[data.focus];
      if (target) {
        target.focus({ preventScroll: true });
        target.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        if (target.setSelectionRange && typeof target.value === 'string') { try { target.setSelectionRange(target.value.length, target.value.length); } catch (_) {} }
      }
      state.cognitive = 0;
      emit('resume', { field: target ? label(target) : null });
      log('Resumed' + (target ? ' at “' + label(target) + '”' : ''), 'pause');
    }

    function forget() { storeRemove(saveKey); emit('forget', {}); log('Saved progress removed', 'pause'); }

    // On load: offer to resume, never resume on its own.
    function checkSaved() { storeGet(saveKey).then(offerResume); }
    function offerResume(raw) {
      if (!raw) return;
      var data; try { data = JSON.parse(raw); } catch (_) { return forget(); }
      if (!data || Date.now() - data.savedAt > o.saveTtlMs) return forget();
      var box = el('div', { class: 'bloom-break', role: 'region', 'aria-label': 'Saved progress' });
      var yes = el('button', { type: 'button', class: 'bloom-offer__yes' }, 'Resume where I left off');
      var no = el('button', { type: 'button', class: 'bloom-offer__no' }, 'Start over');
      box.append(el('p', { class: 'bloom-break__title' }, 'Welcome back.'),
        el('p', {}, 'Your progress from ' + new Date(data.savedAt).toLocaleString() + ' is saved' + (onDevice ? ' on this device' : '') + '.'), yes, no);
      root.insertBefore(box, root.firstChild);
      yes.focus();
      yes.addEventListener('click', function () { box.remove(); restore(data); forget(); });
      no.addEventListener('click', function () { box.remove(); forget(); });
    }

    // ── on / off ──────────────────────────────────────────────────────────
    function setOff(off) {
      state.off = off;
      off ? safeSet(OFF_KEY, '1') : safeRemove(OFF_KEY);
      if (off) { setMotorLevel(0, 'turned off'); setKeyboard(false, 'turned off'); setText(0); hideBar(); root.querySelectorAll('.bloom-offer, .bloom-break').forEach(function (n) { n.remove(); }); }
      emit('power', { off: off });
      log(off ? 'Bloom turned off' : 'Bloom turned on', 'info');
    }


    // ── keyboard and seeing ───────────────────────────────────────────────
    // Bloom can't know whether someone can see, and doesn't try to guess. It
    // responds to how the page is being used: moving with Tab and never the
    // pointer, zooming in, and the settings the system already declares.
    var caption = el('div', { class: 'bloom-caption', 'aria-hidden': 'true' });
    caption.hidden = true;
    document.body.appendChild(caption);

    function onKeyDown(e) {
      if (state.off || state.paused) return;
      if (e.key === 'Tab') {
        state.tabs++; state.travel = 0;
        if (!state.keyboard && state.tabs >= o.keyboardTabs) setKeyboard(true, 'Moving with Tab, not the pointer');
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) offerText('You zoomed in.');
    }
    function onViewport() {
      if (window.visualViewport && window.visualViewport.scale >= o.zoomOfferScale) offerText('You zoomed in.');
    }

    function setKeyboard(on, why) {
      if (on === state.keyboard) return;
      state.keyboard = on; rep.keyboard = rep.keyboard || on;
      if (on) html.setAttribute('data-bloom-keyboard', '');
      else { html.removeAttribute('data-bloom-keyboard'); caption.hidden = true; state.tabs = 0; }
      emit('adapt', { kind: 'keyboard', on: on, reason: why });
      log(on ? 'Keyboard mode: ' + why : 'Keyboard mode off (' + why + ')', 'adapt');
      if (on) {
        change('Keyboard mode: stronger focus ring, a description of each control');
        showBar('Bloom noticed you’re using the keyboard. It will describe each control as you move.',
          function () { setKeyboard(false, 'undone'); });
        if (root.contains(document.activeElement)) describeFocus(document.activeElement);
      }
      emitReport();
    }

    function describeFocus(n) {
      var text = describe(n);
      caption.textContent = text;
      caption.hidden = false;
      emit('describe', { text: text, element: n });
    }

    // ── INSERT YOUR AGENT HERE: where talking starts ──────────────────────
    // Bloom doesn't ship a voice or chat agent; it tells yours when to start
    // and what to say. Listen for these events:
    //
    //   'describe'  { text, element }  Keyboard mode moved to a control.
    //               `text` is a plain description ("Phone number · text field
    //               · required · 3 of 9 — We may call you…"), ready to speak.
    //   'offer'     { kind: 'break' }  Load has built up. A natural moment to
    //               offer finishing by voice instead of on the screen.
    //   'signal'    { kind, score }    Every friction signal, if your agent
    //               decides on its own when to step in.
    //
    // Example: speak each control with the browser's built-in voice.
    //
    //   const bloom = KinedicBloom.start();
    //   bloom.on('describe', ({ text }) => {
    //     speechSynthesis.cancel();
    //     speechSynthesis.speak(new SpeechSynthesisUtterance(text));
    //   });
    //
    // Example: hand off to your own agent when friction keeps climbing.
    //
    //   bloom.on('offer', ({ kind }) => {
    //     if (kind !== 'break') return;
    //     // yourAgent.offer('Would you like to finish this by talking instead?');
    //     // yourAgent.onAnswer((field, answer) => {
    //     //   field.value = answer;                                   // fill the real field
    //     //   field.dispatchEvent(new Event('input', { bubbles: true }));
    //     // });
    //   });
    //
    // Keep the person in charge: always ask before the microphone turns on,
    // and show what was heard before it goes into the form.

    function describe(n) {
      var parts = [accName(n) || 'Unnamed control', roleOf(n)];
      if (n.required || n.getAttribute('aria-required') === 'true') parts.push('required');
      if (n.type === 'checkbox' || n.type === 'radio') parts.push(n.checked ? 'selected' : 'not selected');
      var all = tabbables(), i = all.indexOf(n);
      if (i >= 0) parts.push((i + 1) + ' of ' + all.length);
      var hintIds = (n.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
      var hint = hintIds.map(function (id) { var h = document.getElementById(id); return h ? h.textContent.trim() : ''; }).join(' ');
      return parts.join(' · ') + (hint ? ' — ' + hint : '');
    }

    function offerText(why) {
      if (state.textOffered || state.off) return;
      state.textOffered = true;
      emit('offer', { kind: 'text' });
      log('Offered larger text (' + why + ')', 'offer');
      showBar(why + ' Make the form’s text larger?', undefined, ['Larger text', function () {
        setText(1);
        change('Larger text');
        showBar('Bloom made the text larger.', function () { setText(0); });
      }]);
    }
    function setText(level) {
      if (level) html.setAttribute('data-bloom-text', String(level)); else html.removeAttribute('data-bloom-text');
      emit('adapt', { kind: 'text', level: level });
    }

    // ── tab-ready audit ───────────────────────────────────────────────────
    // Fixes what's safe to fix and reports the rest. The fixes are a bandage:
    // the report is there so the site's own team fixes them properly.
    var TABBABLE = 'a[href], button, input:not([type=hidden]), select, textarea, summary, [tabindex], [contenteditable=true]';
    function tabbables() {
      return Array.prototype.filter.call(root.querySelectorAll(TABBABLE), function (n) {
        return !n.disabled && n.tabIndex >= 0 && !isBloomUI(n) && n.getClientRects().length > 0;
      });
    }
    function isBloomUI(n) { return !!(n.closest && n.closest('.bloom-bar, .bloom-offer, .bloom-break, .bloom-steps, .bloom-note, .bloom-sr')); }

    function audit() {
      var issues = [];
      Array.prototype.forEach.call(root.querySelectorAll('*'), function (n) {
        if (isBloomUI(n)) return;
        var cs = getComputedStyle(n);
        var native = n.matches(TABBABLE);
        var inControl = n.parentElement && n.parentElement.closest('a, button, label, summary, [role=button], [tabindex]');
        // 1. does something on click, but can't be reached with Tab
        if (!native && !inControl && n.hasAttribute('onclick')) {
          n.tabIndex = 0;
          if (!n.getAttribute('role')) n.setAttribute('role', 'button');
          n.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); n.click(); }
          });
          n.setAttribute('data-bloom-fixed', 'tab');
          issues.push({ kind: 'not-tab-ready', what: snippet(n), fixed: true, how: 'Made it reachable with Tab, and usable with Enter and Space' });
          return;
        }
        // 2. looks clickable, but isn't a control — it may do nothing at all
        if (!native && !inControl && cs.cursor === 'pointer' && !n.hasAttribute('onclick') &&
            !(n.parentElement && getComputedStyle(n.parentElement).cursor === 'pointer') && n.textContent.trim()) {
          issues.push({ kind: 'looks-clickable', what: snippet(n), fixed: false, how: 'Looks clickable but isn’t a link or button. Needs a person: make it a real link, or stop styling it like one' });
        }
        // 3. tab order forced out of reading order
        if (n.tabIndex > 0) {
          n.tabIndex = 0;
          issues.push({ kind: 'tab-order', what: snippet(n), fixed: true, how: 'Removed a forced tab position so Tab follows the page’s order' });
        }
        // 4. a field with no label
        if (n.matches('input:not([type=hidden]):not([type=submit]):not([type=button]), select, textarea') && !ownName(n)) {
          var guess = n.getAttribute('placeholder') || humanize(n.name || n.id);
          if (guess) {
            n.setAttribute('aria-label', guess);
            n.setAttribute('data-bloom-fixed', 'label');
            issues.push({ kind: 'no-label', what: snippet(n), fixed: true, how: 'No label. Bloom added a best guess: “' + guess + '”. Needs a real label' });
          } else issues.push({ kind: 'no-label', what: snippet(n), fixed: false, how: 'No label, and nothing to guess from. Needs a person' });
        }
        // 5. a button or link with no name (often an icon)
        if (n.matches('button, a[href], [role=button]') && !accName(n)) {
          issues.push({ kind: 'no-name', what: snippet(n), fixed: false, how: 'Has no name a screen reader could read. Needs a person to name it' });
        }
        // 7. a personal-info field the browser can't autofill (WCAG 1.3.5).
        // When you can't think, not having to type your own name matters.
        if (n.matches('input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=checkbox]):not([type=radio]), select, textarea') && !n.getAttribute('autocomplete')) {
          var purpose = guessPurpose(n);
          if (purpose) {
            n.setAttribute('autocomplete', purpose);
            issues.push({ kind: 'no-autocomplete', what: snippet(n), fixed: true, how: 'The browser couldn’t fill it in. Bloom added autocomplete="' + purpose + '". Needs to be added to the form itself' });
          }
        }
        // 6. an image with no alt text
        if (n.matches('img') && !n.hasAttribute('alt')) {
          issues.push({ kind: 'no-alt', what: snippet(n), fixed: false, how: 'Image has no alt text. Needs a person to describe it, or alt="" if decorative' });
        }
      });
      rep.audit = issues;
      var fixed = issues.filter(function (i) { return i.fixed; }).length;
      log('Tab-ready check: ' + issues.length + ' found, ' + fixed + ' fixed, ' + (issues.length - fixed) + ' need a person', 'audit');
      emit('audit', { issues: issues });
      emitReport();
      return issues;
    }

    // What a field is for, from its type, name, id and label (WCAG 1.3.5).
    function guessPurpose(n) {
      if (n.type === 'email') return 'email';
      if (n.type === 'tel') return 'tel';
      var t = [n.name, n.id, accName(n), n.getAttribute('placeholder')].join(' ').toLowerCase();
      var map = [
        [/e-?mail/, 'email'], [/phone|mobile|\btel\b|cell/, 'tel'],
        [/first|given|fname/, 'given-name'], [/last|family|surname|lname/, 'family-name'],
        [/middle/, 'additional-name'], [/full name|^\s*name\b|your name/, 'name'],
        [/zip|postal/, 'postal-code'], [/street|address( line)? ?1|\baddress\b/, 'street-address'],
        [/\bcity\b|town/, 'address-level2'], [/\bstate\b|province/, 'address-level1'],
        [/birth|\bdob\b|bday/, 'bday'], [/country/, 'country-name'],
      ];
      for (var i = 0; i < map.length; i++) if (map[i][0].test(t)) return map[i][1];
      return '';
    }

    // ── phone numbers you can check at a glance ───────────────────────────
    // Formats only on leaving the field or autofill (a 'change'), never while
    // typing, so the cursor never jumps. Only plain 10-digit US numbers, or
    // 11 with a leading 1; anything with letters or an extension is left alone.
    function onChange(e) {
      var f = e.target;
      if (!o.formatPhone || state.off || !f.matches || f.closest('[data-bloom-noformat]')) return;
      if (!(f.type === 'tel' || (f.getAttribute('autocomplete') || '').indexOf('tel') === 0)) return;
      var v = f.value;
      if (!v || /[a-z]/i.test(v)) return;
      var d = v.replace(/\D/g, '');
      var out = d.length === 10 ? d.slice(0, 3) + '-' + d.slice(3, 6) + '-' + d.slice(6)
              : d.length === 11 && d[0] === '1' ? '1-' + d.slice(1, 4) + '-' + d.slice(4, 7) + '-' + d.slice(7) : null;
      if (out && out !== v) {
        f.value = out;
        log('Formatted “' + label(f) + '” as ' + out.replace(/\d(?=\d{4})/g, '•') + ' so it’s easy to check', 'adapt');
        change('Formatted a phone number for easy checking');
      }
    }

    // ── clicking the wrong thing ──────────────────────────────────────────
    function onClick(e) {
      if (state.off || state.paused || !e.isTrusted && !o.countSyntheticClicks) return;
      var t = e.target;
      if (!root.contains(t) || isBloomUI(t)) return;
      var now = performance.now();
      state.clicks = state.clicks.filter(function (c) { return now - c.t < o.rageMs; });
      state.clicks.push({ t: now, x: e.clientX, y: e.clientY });
      var close = state.clicks.filter(function (c) { return Math.hypot(c.x - e.clientX, c.y - e.clientY) < o.ragePx; });
      if (close.length === o.rageClicks) {
        record(rep.rage, snippet(t), { on: snippet(t) });
        log('Repeated clicking on ' + snippet(t), 'motor');
      }
      var control = t.closest('a[href], button, input, select, textarea, label, summary, [role=button], [tabindex]');
      if (control) return;
      var near = nearestTarget(e.clientX, e.clientY);
      if (near && near.dist <= o.nearMissPx) return; // counted as a near-miss
      if (getComputedStyle(t).cursor === 'pointer' || t.closest('[data-bloom-fixed]')) {
        record(rep.dead, snippet(t), { clicked: snippet(t) });
        log('Clicked ' + snippet(t) + ', which isn’t a link or button', 'motor');
      }
    }

    // ── the friction report ───────────────────────────────────────────────
    // In this page's memory only. It never holds anything a person typed.
    var rep;
    function newReport() {
      rep = { since: Date.now(), misses: new Map(), dead: new Map(), rage: new Map(), stalls: new Map(),
              revisits: new Map(), changes: [], keyboard: false, os: osSettings(), audit: rep ? rep.audit : [] };
    }
    function record(map, key, init, update) {
      var r = map.get(key);
      if (!r) { r = Object.assign({ count: 0 }, init); map.set(key, r); }
      r.count++;
      if (update) update(r);
      emitReport();
    }
    function change(what) {
      var last = rep.changes[rep.changes.length - 1];
      if (last && last.what === what) { last.count = (last.count || 1) + 1; last.at = Date.now(); }
      else rep.changes.push({ what: what, at: Date.now(), count: 1 });
      emitReport();
    }
    function emitReport() { emit('report', report()); }
    function report() {
      var vals = function (m) { return Array.from(m.values()).sort(function (a, b) { return b.count - a.count; }); };
      return { since: rep.since, os: rep.os, keyboardMode: rep.keyboard, audit: rep.audit,
               nearMisses: vals(rep.misses), deadClicks: vals(rep.dead), rageClicks: vals(rep.rage),
               stalls: vals(rep.stalls), revisits: vals(rep.revisits), changes: rep.changes.slice() };
    }
    function osSettings() {
      var q = { 'reduced motion': '(prefers-reduced-motion: reduce)', 'more contrast': '(prefers-contrast: more)',
                'forced colors': '(forced-colors: active)', 'reduced transparency': '(prefers-reduced-transparency: reduce)' };
      return Object.keys(q).filter(function (k) { return window.matchMedia && matchMedia(q[k]).matches; });
    }

    // ── names, roles, snippets ────────────────────────────────────────────
    function ownName(n) {
      if (n.getAttribute('aria-label') || n.getAttribute('aria-labelledby') || n.getAttribute('title')) return true;
      if (n.id && document.querySelector('label[for="' + n.id + '"]')) return true;
      return !!(n.closest && n.closest('label'));
    }
    function accName(n) {
      if (!n) return '';
      var a = n.getAttribute('aria-label'); if (a) return a.trim();
      var lb = n.getAttribute('aria-labelledby');
      if (lb) return lb.split(/\s+/).map(function (id) { var x = document.getElementById(id); return x ? x.textContent : ''; }).join(' ').trim();
      if (n.id) { var l = document.querySelector('label[for="' + n.id + '"]'); if (l) return l.textContent.trim().replace(/\s+/g, ' '); }
      var wrap = n.closest && n.closest('label');
      if (wrap && wrap !== n) return wrap.textContent.trim().replace(/\s+/g, ' ');
      if (n.matches && n.matches('input, textarea, select')) return (n.getAttribute('title') || '').trim();
      // innerText skips hidden content, so a description only says what's showing
      var text = (n.innerText || n.textContent || '').trim().replace(/\s+/g, ' ');
      if (text) return text.slice(0, 80);
      var img = n.querySelector && n.querySelector('img[alt]');
      return (img && img.getAttribute('alt')) || n.getAttribute('title') || '';
    }
    function roleOf(n) {
      var r = n.getAttribute('role'); if (r) return r;
      var t = n.tagName.toLowerCase();
      if (t === 'a') return 'link';
      if (t === 'button') return 'button';
      if (t === 'select') return 'choice list';
      if (t === 'textarea') return 'text box';
      if (t === 'input') return n.type === 'radio' ? 'option' : n.type === 'checkbox' ? 'checkbox' : n.type === 'submit' ? 'button' : 'text field';
      return t;
    }
    function snippet(n) {
      var name = accName(n) || n.getAttribute('placeholder') || n.name || '';
      return '“' + (name || '(no text)').slice(0, 50) + '” (' + n.tagName.toLowerCase() + ')';
    }
    function humanize(s) {
      if (!s) return '';
      s = String(s).replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim();
      return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    }

    // ── helpers ───────────────────────────────────────────────────────────
    var live = el('div', { class: 'bloom-sr', 'aria-live': 'polite' });
    root.appendChild(live);
    function announce(text) { live.textContent = ''; setTimeout(function () { live.textContent = text; }, 50); }
    function isField(f) { return f && f.matches && f.matches('input:not([type=hidden]):not([type=button]):not([type=submit]), textarea, select') && root.contains(f) && !f.closest('.bloom-steps'); }
    function label(n) {
      if (!n) return '';
      var l = n.id && root.querySelector('label[for="' + n.id + '"]');
      return ((l && l.textContent) || n.getAttribute('aria-label') || n.textContent || n.name || n.id || n.tagName).trim().replace(/\s+/g, ' ').slice(0, 60);
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    root.addEventListener('focusin', onFocusIn);
    root.addEventListener('focusout', onFocusOut);
    root.addEventListener('input', onInput);
    root.addEventListener('change', onChange);
    document.addEventListener('focusin', onAnyFocus);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('click', onClick, true);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', onViewport);
    newReport();
    if (rep.os.length) log('System settings: ' + rep.os.join(', '), 'info');
    tick();
    checkSaved();
    if (o.audit) audit();

    var api = {
      on: on,
      pause: pause,
      audit: audit,
      report: report,
      describe: describe,
      forget: forget,
      turnOn: function () { setOff(false); },
      turnOff: function () { setOff(true); },
      reset: function () {
        state.motor = 0; state.cognitive = 0; state.offered.clear(); state.refocus.clear(); state.breakSnoozedUntil = 0;
        state.textOffered = false; state.undo = null; state.paused = false;
        setMotorLevel(0, 'reset'); setKeyboard(false, 'reset'); setText(0); hideBar();
        newReport(); emitReport();
        root.querySelectorAll('.bloom-offer, .bloom-break, .bloom-note').forEach(function (n) { n.remove(); });
      },
      get state() { return { off: state.off, motor: state.motor, cognitive: state.cognitive, motorLevel: state.motorLevel, paused: state.paused }; },
      stop: function () {
        clearTimeout(timer);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('scroll', onScroll);
        root.removeEventListener('focusin', onFocusIn);
        root.removeEventListener('focusout', onFocusOut);
        root.removeEventListener('input', onInput);
        root.removeEventListener('change', onChange);
        document.removeEventListener('focusin', onAnyFocus);
        document.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('click', onClick, true);
        if (window.visualViewport) window.visualViewport.removeEventListener('resize', onViewport);
        bar.remove(); live.remove(); caption.remove();
      },
    };
    return api;
  }

  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = text;
    return n;
  }
  function safeGet(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }
  function safeSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (_) { return false; } }
  function safeRemove(k) { try { localStorage.removeItem(k); } catch (_) {} }

  global.KinedicBloom = { start: start, version: '0.3.0' };
})(typeof window !== 'undefined' ? window : this);
