/*!
 * Kinedic Bloom v0.1.0 — an interface layer that adapts to the person using it.
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
    announce: true,
  };

  var OFF_KEY = 'kinedic-bloom:off';

  function start(options) {
    var o = Object.assign({}, DEFAULTS, options || {});
    var root = typeof o.root === 'string' ? document.querySelector(o.root) : o.root;
    if (!root) throw new Error('Kinedic Bloom: no root element (add data-bloom-root)');
    var html = document.documentElement;
    var saveKey = 'kinedic-bloom:save:' + (o.storageKey || location.pathname);

    var listeners = {};
    var state = {
      off: safeGet(OFF_KEY) === '1',
      motor: 0, cognitive: 0, motorLevel: 0,
      samples: [], ticking: false,
      field: null, fieldSince: 0, lastInput: 0, stallFired: false,
      refocus: new Map(), rereads: [], lastScrollY: window.scrollY,
      breakSnoozedUntil: 0, offered: new Set(), paused: false,
      last: performance.now(),
    };

    // ── events ────────────────────────────────────────────────────────────
    function on(type, fn) { (listeners[type] = listeners[type] || []).push(fn); return api; }
    function emit(type, detail) { (listeners[type] || []).forEach(function (fn) { fn(detail); }); }
    function log(msg, kind) { emit('log', { message: msg, kind: kind || 'info', at: Date.now() }); }

    // ── the status bar: what Bloom changed, with undo and off ─────────────
    var bar = el('div', { class: 'bloom-bar', role: 'status', 'aria-live': 'polite' });
    var barText = el('span', { class: 'bloom-bar__text' });
    var undoBtn = el('button', { type: 'button', class: 'bloom-bar__btn' }, 'Undo');
    var offBtn = el('button', { type: 'button', class: 'bloom-bar__btn' }, 'Turn off Bloom');
    bar.append(barText, undoBtn, offBtn);
    bar.hidden = true;
    root.appendChild(bar);
    // Undo starts the motor score over too, so the next shake doesn't snap
    // the change straight back.
    undoBtn.addEventListener('click', function () { state.motor = 0; setMotorLevel(0, 'undone'); hideBar(); });
    offBtn.addEventListener('click', function () { setOff(true); });

    function showBar(text, undoable) {
      if (!o.announce) return;
      barText.textContent = text;
      undoBtn.hidden = !undoable;
      bar.hidden = false;
    }
    function hideBar() { bar.hidden = true; }

    // ── motor: tremor and near-misses ─────────────────────────────────────
    function onPointerMove(e) {
      if (state.off || state.paused || e.pointerType === 'touch') return;
      var now = performance.now();
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
        showBar(level === 1 ? 'Bloom made buttons and fields easier to hit.' : 'Bloom made targets larger and easier to hit.', true);
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
      if (n === o.refocusLimit) bump('cognitive', 0.4, 'Came back to “' + label(f) + '” ' + n + ' times', f);
    }
    function onFocusOut(e) { if (e.target === state.field) state.field = null; }
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
      var saved = safeSet(saveKey, JSON.stringify(data));
      state.paused = true;
      emit('pause', { saved: saved });
      log(saved ? 'Paused. Progress saved on this device.' : 'Paused, but this browser would not save progress', 'pause');

      var shade = el('div', { class: 'bloom-pause', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'bloom-pause-title' });
      var card = el('div', { class: 'bloom-pause__card' });
      var resumeBtn = el('button', { type: 'button', class: 'bloom-offer__yes' }, 'Resume now');
      var forgetBtn = el('button', { type: 'button', class: 'bloom-offer__no' }, 'Forget saved progress');
      card.append(
        el('h2', { id: 'bloom-pause-title' }, 'Paused'),
        el('p', {}, saved
          ? 'Your progress is saved on this device. Go rest. When you come back to this page, you’ll pick up right where you left off.'
          : 'This browser won’t let pages save progress, so please keep this page open.'),
        el('p', { class: 'bloom-pause__fine' }, 'Nothing was sent anywhere. On a shared computer, choose “Forget saved progress” before you leave.'),
        resumeBtn, forgetBtn);
      shade.appendChild(card);
      document.body.appendChild(shade);
      resumeBtn.focus();
      resumeBtn.addEventListener('click', function () { shade.remove(); state.paused = false; restore(data); });
      forgetBtn.addEventListener('click', function () {
        forget();
        card.replaceChildren(el('h2', { id: 'bloom-pause-title' }, 'Saved progress removed'),
          el('p', {}, 'Nothing from this form is stored on this device.'), resumeBtn);
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

    function forget() { safeRemove(saveKey); emit('forget', {}); log('Saved progress removed from this device', 'pause'); }

    // On load: offer to resume, never resume on its own.
    function checkSaved() {
      var raw = safeGet(saveKey); if (!raw) return;
      var data; try { data = JSON.parse(raw); } catch (_) { return forget(); }
      if (!data || Date.now() - data.savedAt > o.saveTtlMs) return forget();
      var box = el('div', { class: 'bloom-break', role: 'region', 'aria-label': 'Saved progress' });
      var yes = el('button', { type: 'button', class: 'bloom-offer__yes' }, 'Resume where I left off');
      var no = el('button', { type: 'button', class: 'bloom-offer__no' }, 'Start over');
      box.append(el('p', { class: 'bloom-break__title' }, 'Welcome back.'),
        el('p', {}, 'Your progress from ' + new Date(data.savedAt).toLocaleString() + ' is saved on this device.'), yes, no);
      root.insertBefore(box, root.firstChild);
      yes.focus();
      yes.addEventListener('click', function () { box.remove(); restore(data); forget(); });
      no.addEventListener('click', function () { box.remove(); forget(); });
    }

    // ── on / off ──────────────────────────────────────────────────────────
    function setOff(off) {
      state.off = off;
      off ? safeSet(OFF_KEY, '1') : safeRemove(OFF_KEY);
      if (off) { setMotorLevel(0, 'turned off'); hideBar(); root.querySelectorAll('.bloom-offer, .bloom-break').forEach(function (n) { n.remove(); }); }
      emit('power', { off: off });
      log(off ? 'Bloom turned off' : 'Bloom turned on', 'info');
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
    tick();
    checkSaved();

    var api = {
      on: on,
      pause: pause,
      forget: forget,
      turnOn: function () { setOff(false); },
      turnOff: function () { setOff(true); },
      reset: function () {
        state.motor = 0; state.cognitive = 0; state.offered.clear(); state.refocus.clear(); state.breakSnoozedUntil = 0;
        setMotorLevel(0, 'reset'); hideBar();
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
        bar.remove(); live.remove();
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

  global.KinedicBloom = { start: start, version: '0.1.0' };
})(typeof window !== 'undefined' ? window : this);
