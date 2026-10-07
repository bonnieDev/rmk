# rmk.systems — notes for Claude

Bonnie's portfolio. Vite + React, deployed by pushing `main` (live in about a
minute). Projects are data in `src/data/projects.ts`; live demos are static
pages in `public/demos/`.

`public/demos/bloom/` is a copy of the Kinedic Bloom library
(`~/Documents/_portfolio/kinedic-bloom`, github.com/bonnieDev/kinedic-bloom,
files in `src/`). After changing the library, copy both files back here.

---

## Analytics tagging

Google Analytics 4 only (tag `G-6Q2H4H5S3L`, in `index.html`). Microsoft
Clarity was removed on purpose (2026-10-02). Don't re-add it or any other tracker
without asking.

### Rules

- **All events go through `track()` in `src/analytics.ts`.** Don't call
  `window.gtag` from components. `track()` is a no-op when the tag is blocked,
  so the site never breaks because of analytics.
- **Demos** (`public/demos/*.html`) report through a small `rmkTrack()`
  function at the bottom of each page. It calls the parent page's `gtag`
  (same origin) and adds a `demo` parameter. It does nothing when the
  demo is opened on its own. Copy that pattern for new demos.
- **Naming:** `snake_case`, `noun_verb` (`project_open`, `song_play`).
  Event names ≤ 40 characters; parameter values ≤ 100.
- **No personal data in events.** Never send emails, typed text, or
  anything a visitor enters. The decoder reports *that* someone typed a
  message (`type_message`), never what they typed.
- **Report intent, not noise.** Fire once per meaningful action (sections
  report the first time they're reached; demo actions report once per
  visit). A muted autoplay loop isn't watching, so `video_progress` only
  counts once the sound is on.
- **New parameters must be registered** in GA (Admin → Custom definitions →
  custom dimension, event scope), or they won't appear in reports. Tell
  Bonnie the parameter name when you add one.
- **Testing:** block `*googletagmanager.com*` and `*google-analytics.com*`
  in the test browser so test visits don't pollute real data, then read
  `window.dataLayer`. Real-time checks go through GA → Reports → Realtime.

### Event catalog

| Event | Parameters | Fires when |
|---|---|---|
| `section_view` | `section`, `order` | A section is first reached (hero, index, each project id, about, record) |
| `page_exit` | `last_section`, `sections_seen`, `seconds_on_page` | Tab hidden or page closed (sent as beacon; can repeat if they return) |
| `project_open` | `project`, `position` | A project's brief is opened |
| `expand_all` | — | "Expand all" |
| `nav_click` | `section` | Masthead navigation |
| `resume_open` | — | Résumé link |
| `email_click` | `from` (manifest / record / footer) | Any email link |
| `video_sound_on` | `video` | Sound toggled on |
| `video_progress` | `video`, `percent` (25/50/75/100) | Watched with sound to that point |
| `song_play` / `song_complete` | `demo`, `song_title` | Listening Room |
| `demo_interact` | `demo`, `action` | Decoder: `ring_drag`, `type_message`, `race`. Kinedic drop: `replay`. Kinedic Bloom: `bloom_motor`, `bloom_keyboard`, `bloom_steps`, `bloom_assist`, `bloom_break_offered`, `bloom_pause`, `bloom_resume` |

Registered custom dimensions (Bonnie to confirm in GA): `section`, `project`,
`video`, `percent`, `song_title`, `demo`, `action`, `last_section`.

Outbound links and PDF downloads are recorded automatically by GA's enhanced
measurement. Don't duplicate them.

One visitor's whole path, in order, is in GA → **Explore → User explorer**.

---

## Accessibility (WCAG 2.2 AA)

Target WCAG 2.2 AA. Check every change against these. Bonnie's background is
regulated, compliance-bound product work: treat an accessibility regression
as a bug, not a polish note.

### What the site already does, so keep it

- **Skip link** to `#main`; `<html lang="en">`.
- **Reduced motion:** every animation has a `prefers-reduced-motion`
  fallback (logo, annotation chalk, cue marks, the etched attractor, the
  Kinedic drop and ripple). New motion must ship with one, usually showing
  the finished state instead of animating.
- **Keyboard and focus:** visible `:focus-visible` outlines using
  `--rmk-focus`. Toggles use real `<button>`s with `aria-expanded` /
  `aria-controls` (project briefs) or `aria-pressed` (stills, video sound).
- **Text:** 12px minimum (`--rmk-meta-size`, see `src/tokens/tokens.css`).
- **Images:** every still has a descriptive `alt` in `projects.ts`, written to
  say what the image shows. Decorative canvases and glows are `aria-hidden`.
- **Frames and links:** iframes have descriptive `title`s; links that open a
  new tab say so with visually-hidden text.
- **Media:** videos autoplay **muted** and never start sound on their own.
  Sound needs a deliberate click.

### Known gaps (not yet fixed)

- **Captions:** no video has captions or a transcript (WCAG 1.2.2 / 1.2.3).
  Cher Bomba is music-led, so at minimum a text description is needed.
- **Decoder demo** (`digital-decoder-ring.html`): no ARIA labels, and the
  ring can only be turned by dragging, with no keyboard alternative
  (WCAG 2.1.1, 2.5.7).
- **Demos in general** were built as standalone pages. Audit each one for
  keyboard access, labels and contrast before calling it done.
- **Color contrast** hasn't been formally audited. Check the dim metadata
  tones (`--rmk-ink-faint` and similar) against 4.5:1 for small text.

When you fix a gap, move it to "already does".
