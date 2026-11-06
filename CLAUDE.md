# rmk.systems — notes for Claude

Bonnie's portfolio. Vite + React, deployed by pushing `main` (live in about a
minute). Projects are data in `src/data/projects.ts`; live demos are static
pages in `public/demos/`. The site is a floor of sheets seen through a camera
(`src/components/Floor`, positions and timings in `src/content/floor.ts`):
Home, one sheet per project (`ProjectSheet`), and About. A new project needs
an entry in `projects.ts` and a spot in `floor.ts`.

`dist/` is build output and every build wipes it: never keep source files
there. Bonnie's working files go in `caps/<project>/` (git-ignored) or the
project's own folder; design briefs and references go in `docs/`. A project's `stills` can include videos (`video`: a Stream iframe
src, with `src` as its thumbnail); they play in the gallery with a sound
toggle.

## Active feature: floor camera
Read docs/FLOOR-CAMERA.md before touching the homepage, project pages, routing, or global styles.
Keep its Decision log current (see "Staying in the loop").

`public/demos/skull-live/` is a built copy of SNBN Presents: Skull from
`~/Documents/_Otherly/snbn` (run `npx vite build` there, copy `dist/snbn.js`,
`dist/snbn.css` and the art it needs). The real one is on otherly.shop, which
Shopify won't let other sites embed.

### Kinedic Bloom hosting

rmk.systems is where all of Bonnie's sites load Kinedic Bloom from, because the
Bloom repo (`~/Documents/_portfolio/kinedic-bloom`) is private and jsDelivr
can't reach it.

- `public/bloom/vX.Y.Z/`: one folder per tagged release, with
  `kinedic-bloom.js`, `kinedic-bloom.css`, and the release's `LICENSE`,
  `NOTICE` and `USE-POLICY.md` (GPL versions must ship with their license).
  Sites load `https://rmk.systems/bloom/vX.Y.Z/kinedic-bloom.{js,css}`.
- **New release:** tag it in the Bloom repo, then make a new folder with
  `git -C ../kinedic-bloom show vX.Y.Z:src/kinedic-bloom.js > public/bloom/vX.Y.Z/kinedic-bloom.js`
  (same for the CSS and the three text files), commit, push `main`.
- **Never change a published version folder.** Other sites rely on it staying
  the same; a fix is a new version.
- Versions from v0.8 on may have a different license (see the Bloom repo).
  Copy whatever LICENSE that tag has.
- The Bloom demo page (`public/demos/kinedic-bloom.html`) loads
  `../bloom/vX.Y.Z/`. Move it to each new version after testing it.

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
| `ui_click` | `part`, `section`, `control` | Any click on a link, button or image, named by where and what ("Kitty & Pip: Next: Cher Bomba"). A project's sheet is named by its title; the view-from-above controls are "Floor". Labels skip decorative and screen-reader-only text |
| `section_view` | `section`, `order` | A place is first reached: a sheet lands (hero for Home, each project id, about), or Home's index / About's record scrolls into view on the sheet in focus |
| `page_exit` | `last_section`, `sections_seen`, `seconds_on_page` | Tab hidden or page closed (sent as beacon; can repeat if they return) |
| `project_open` | `project`, `position` | A project's sheet is landed on (row click, Next, from above, back/forward, or a deep link) |
| `view_from_above` | `from` (sheet id) | The camera pulls all the way up (masthead button or Esc) |
| `nav_click` | `section` | Masthead navigation |
| `resume_open` | — | Résumé link |
| `email_click` | `from` (manifest / record / footer) | Any email link |
| `video_sound_on` | `video` | Sound toggled on |
| `video_progress` | `video`, `percent` (25/50/75/100) | Watched with sound to that point |
| `song_play` / `song_complete` | `demo`, `song_title` | Listening Room |
| `demo_interact` | `demo`, `action` | Decoder: `ring_drag`, `type_message`, `race`. Kinedic drop: `replay`. Skull live (`skull-live.html`): `start`, `start_muted`, `song_pick`, `pause`, `resume`, `camera`, `shop`, `finish`, `section_<name>`. Kinedic Bloom: `bloom_shaky_tried` only (a click on the demo's own button). Nothing Bloom notices about a visitor is ever sent (Use Policy) |

Registered custom dimensions (Bonnie to confirm in GA): `part`, `control`, `section`, `project`,
`video`, `percent`, `song_title`, `demo`, `action`, `last_section`, `from`.

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
  fallback (logo, the Kinedic drop and ripple). The floor camera never flies:
  a 240ms cross-fade lands on the sheet, and the view from above is flat (no
  tilt). New motion must ship with one, usually showing the finished state.
- **The floor:** only the sheet in focus is reachable; the rest are `inert`
  and `aria-hidden`. Every flight starts from a real `<button>`; on landing
  the sheet's `h1` takes focus and a polite live region says its name. From
  above, each sheet is a labeled button ("Open Kitty & Pip") and focus starts
  on the sheet you came from. Esc toggles in and out. The skip link focuses
  the current sheet's heading.
- **Keyboard and focus:** visible `:focus-visible` outlines using
  `--rmk-focus`. Toggles use real `<button>`s with `aria-pressed` (stills,
  video sound).
- **Text:** 12px minimum (`--rmk-meta-size`, see `src/tokens/tokens.css`).
- **Images:** every still has a descriptive `alt` in `projects.ts`, written to
  say what the image shows. Decorative canvases and glows are `aria-hidden`.
- **Frames and links:** iframes have descriptive `title`s; links that open a
  new tab say so with visually-hidden text.
- **Media:** videos autoplay **muted** and never start sound on their own.
  Sound needs a deliberate click.
- **One sound at a time:** starting sound anywhere stops the rest
  (`src/sound.ts`). A demo with sound loads `public/demos/one-sound.js`
  before its own scripts and sets `window.rmkSoundStop` to its own pause
  (Listening Room pauses; Skull's stage presses its Pause so cues stay in time).
- **Media fits the screen:** a project's frame or still is 16:10 at most as
  tall as the screen under the masthead, shown whole on a black mat.
- **Contrast:** the palette is checked: faint labels #8c8b87 are 5.7:1 on
  the ground, muted 7.7:1, amber 9.8:1.

### Known gaps (not yet fixed)

- **Captions:** no video has captions or a transcript (WCAG 1.2.2 / 1.2.3).
  Cher Bomba is music-led, so at minimum a text description is needed.
- **Decoder demo** (`digital-decoder-ring.html`): no ARIA labels, and the
  ring can only be turned by dragging, with no keyboard alternative
  (WCAG 2.1.1, 2.5.7).
- **Demos in general** were built as standalone pages. Audit each one for
  keyboard access, labels and contrast before calling it done.
- **Safari:** the floor was tested in Chrome only (desktop and phone size).
  Test 3D transforms, backdrop-filter and the SVG guides in Safari, desktop
  and iOS, on a real device.
- **Text on the floor** (the names under each sheet and the guide readout)
  is decorative and hidden from screen readers; the same names are on the
  labeled sheet buttons.

When you fix a gap, move it to "already does".
