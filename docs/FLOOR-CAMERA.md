# rmk.systems: the floor and the camera

**Handoff brief for Claude Code.** Put this in the repo (suggested: `docs/FLOOR-CAMERA.md`) and reference it from `CLAUDE.md` so it loads every session:

```md
## Active feature: floor camera
Read docs/FLOOR-CAMERA.md before touching the homepage, project pages, routing, or global styles.
Keep its Decision log current (see "Staying in the loop").
```

Owner: Bonnie Caroline Remeika. Reference prototype: `docs/reference/floor-prototype.html`. It's working vanilla HTML/CSS/JS. Port the behavior, not the file.

---

## 1. Why this exists

rmk.systems is being tightened for an Apple interview (Aesthetics team). The site's identity stays: the RMK pixel mark, the system manifest, the project index, the Problem / Build / Milestone briefs, and Bonnie's voice. What changes is the **point of view**.

**The idea in one sentence:** the site looks like a normal flat website until you click a project. Then the camera pulls up toward the ceiling, and you discover the page was a sheet lying on a floor all along, with every project laid out around it. Lines line up the thing you picked, and the camera dives down onto it.

The surprise is the point. Nothing in the first view should give away that there's a floor.

## 2. What Bonnie disliked before (don't regress)

- Not enough visual work showing. Images were hidden in closed drawers.
- The RMK mark wasn't heavy enough.
- No point of view, in either sense: no strong statement, and no spatial idea.
- Too many accent colors, navy wash, grid lines everywhere ("HUD" look).

## 3. The experience, step by step

### 3.1 Resting state (focused)
- One sheet fills the viewport exactly, at scale 1 with no tilt. It behaves like a normal page: it scrolls internally, links work, text is selectable.
- Home is the default sheet. Every project, plus About, is its own sheet.

### 3.2 Click a project row on Home (the reveal)
Timings are from the prototype; tune by feel, but keep the three beats.

| Beat | What happens | Duration | Easing |
|---|---|---|---|
| 1. Pull up | Camera rises and tilts ~16° on X, framing the origin sheet and the target sheet together. Sheet corners round (0 to 28px), the floor grid and the floor labels fade in. | ~1250ms | ease-out cubic |
| 2. Line up | Amber guide lines draw: an orthogonal elbow path from **the exact row clicked** to the target sheet's center, plus dashed extensions of the target's four edges (drafting-table feel), plus a mono distance readout. Then the camera **waits**: the target gets an amber ring and the hint reads "Click [project] to go in · or drag to look around". Nothing dives on its own. | path draw 650ms, then no time limit | cubic-bezier(.6,0,.3,1) |
| 3. Dive (only when the visitor chooses) | Guides fade, tilt returns to 0, camera descends and **rotates to match the target sheet's slight angle** so it lands perfectly flat and fills the viewport. | ~1350ms | ease-in-out cubic |

After landing: reset the target's scroll to the top, mark it focused, update the URL.

### 3.3 "View from above"
A control on every sheet's masthead, plus a floating HUD pill that appears only in the aerial view. It pulls all the way up to show all nine sheets (scale is about 0.86 × the fit, tilt 14°). Clicking any sheet from there draws guides and dives in.

### 3.5 Roaming the floor

Bonnie's brain expects to drag the floor around once it's revealed. The reveal is the surprise; roaming is the reward ("while I'm here"). Floor and aerial view only; the focused flat page scrolls normally. Code: `src/components/Floor/useRoam.ts`; tunables in `floor.ts` → `roam`.

1. **You're in control on the floor.** After a row click the camera stops at floor level with the pick lined up, and stays until the visitor chooses: click the lined-up sheet to go in, click another sheet, drag around, or press Esc to go back. Keyboard focus starts on the lined-up sheet, so Enter goes in. (Grabbing during the short line-up after choosing a sheet *from above* still cancels that dive.) Going back ("← Back", "← Index", browser back/forward) hops straight there with no stop.
2. **Drag to pan.** The floor tracks the pointer 1:1: deltas are divided by the camera scale, Y also by cos(tilt), and rotated into world space by the camera's z-rotation. Pointer capture; `grab` cursor, `grabbing` while dragging; `touch-action: none` only while up.
3. **Momentum.** On release it keeps gliding, velocity × 0.92 per frame, until under 0.2px/frame. Velocity is a smoothed average of the last moves; a pause before release means no glide. Off under reduced motion.
4. **Zoom around the cursor.** The wheel zooms and the floor point under the cursor stays put. A trackpad pinch (wheel + ctrlKey) uses ≈0.01 per deltaY vs 0.0015; Safari's trackpad pinch arrives as gesture events and is handled too. Two-finger pinch on touch. Wheel `preventDefault` only while up.
5. **Clamp.** Zoom from 0.75 × the fit-all scale up to 0.75. The camera center stays within the grid's bounds plus 20% of a gap, so you can't get lost.
6. **A distinct click lands.** It has to move under 5px, last at most 300ms, start and end on the same sheet, and come at least 350ms after a drag ends. A press that stops a glide or grabs the line-up only stops the floor; it never lands. A drag never fires a click; the click that follows a drag or a handled tap is swallowed.
7. **Hint** in aerial: "You were looking down the whole time · *drag to look around* · click a sheet to land" (the middle in amber).

Keyboard is unchanged: from above, Tab moves through the sheet buttons and Enter lands; Esc goes back.

### 3.4 Other navigation
- **The chunky RMK mark is always on**, at the left of every masthead. On a project or About it is one control with a plain label: "← Back to Kitty & Pip" (the sheet you came from) or "← Back to Index" (arriving from outside, e.g. a LinkedIn link). Inside the site it *is* the browser's back, so the two never disagree; from outside it goes to the Index and never leaves the site. Phones show "← Back" only. On Home the mark goes to the top of the page.
- "Next: [project] →" flies to the next project in index order.
- **Esc**: toggles home ↔ aerial.
- Hover in aerial: amber 6px inset ring on the sheet.

## 4. Spatial layout

A 5 × 3 floor with Home in the center (the original 3 × 3 below sits in columns 1–3 unchanged; columns 0 and 4 hold the other five projects, see `src/content/floor.ts`). Every sheet is exactly viewport-sized (`W × H` = `innerWidth × innerHeight`), so landing at scale 1 fills the screen.

```
[ Kitty & Pip  -2.4° ] [ Aether Command  1.1° ] [ Otherly & SNBN -1.3° ]
[ Cher Bomba    1.8° ] [ HOME             0°  ] [ Skull & Beau    2.2° ]
[ Bunny Anarchy -1.6° ] [ About           0.9° ] [ Kinedic Drop   -2.8° ]
```

- Gaps: `GX = 0.22·W`, `GY = 0.30·H`. Margin around the grid: `M = 2.2·max(W,H)`, so the floor never shows an edge.
- Home is never rotated. That keeps the click-origin math simple.
- Small rotations are deliberate: curated, not a messy pile. Keep them all under 3°.
- **The positions are Bonnie's to change.** They live in one data object (see §6). Never hard-code them in components.

## 5. Camera math (the core)

The world is one absolutely positioned element with `transform-origin: 0 0` and `transform-style: preserve-3d`, inside a fixed stage with `perspective: 2200px`.

```js
// camera = { cx, cy, s, rz, tilt }  (world-space center, scale, z-rotation°, x-tilt°)
const xf = c =>
  `translate(${W/2}px,${H/2}px) rotateX(${c.tilt}deg) scale(${c.s}) rotate(${-c.rz}deg) translate(${-c.cx}px,${-c.cy}px)`;

const focusCam  = sheet => ({ cx: sheet.cx, cy: sheet.cy, s: 1, rz: sheet.rotation, tilt: 0 });
```

**Flights are sampled, not CSS-tweened.** Build ~48 keyframes and play them with the Web Animations API (`easing: 'linear'`, `fill: 'forwards'`). On finish, commit the end state to `style.transform` and cancel the animation. Interpolate:

- position and rotation linearly in eased time `t`
- **scale in log space**: `ln s = lerp(ln sA, ln sB, t) − dip·sin(πu)`. This is what makes the zoom feel physical rather than rubbery.
- tilt: `lerp(tiltA, tiltB, t)`, plus an optional `tiltPeak·sin(πu)`

The pull-up target ("mid" camera) is the midpoint between the click origin and the target center. Its scale is `min(0.42, W / span · 0.9)`, where `span` fits both sheets plus their size.

**Click origin to world coordinates** (so the line starts at the row you actually clicked):
```js
const r = rowEl.getBoundingClientRect();           // measured while focused at scale 1
const lx = r.left + r.width/2 - W/2, ly = r.top + r.height/2 - H/2, a = sheet.rotation*Math.PI/180;
from = { x: sheet.cx + lx*cos(a) - ly*sin(a), y: sheet.cy + lx*sin(a) + ly*cos(a) };
```

**Guide lines** live in one SVG inside the world, sized to the world. Stroke widths are divided by the current camera scale (`1.6/s`) so they read about 1.6px on screen. Animate the path with `pathLength=1` and `stroke-dashoffset` 1 → 0.

**During flight:** add `body.flying` (pointer-events off everywhere). Sheets that aren't focused get `pointer-events:none` on their contents, `cursor: zoom-in`, and `overflow:hidden`. A click anywhere on a sheet that isn't focused flies to it.

**Resize:** recompute the layout and snap the camera to the current focus (or to aerial) with no animation.

## 6. Data model

One source of truth, something like `src/content/floor.ts`. Bonnie will edit this file:

```ts
export const floor = {
  grid: { cols: 3, rows: 3, gapX: 0.22, gapY: 0.30 },
  sheets: [
    { id: 'home',           col: 1, row: 1, rotation: 0 },
    { id: 'kitty-n-pip',    col: 0, row: 0, rotation: -2.4 },
    { id: 'aether-command', col: 1, row: 0, rotation: 1.1 },
    { id: 'otherly',        col: 2, row: 0, rotation: -1.3 },
    { id: 'cher-bomba',     col: 0, row: 1, rotation: 1.8 },
    { id: 'skull-and-beau', col: 2, row: 1, rotation: 2.2 },
    { id: 'bunny-anarchy',  col: 0, row: 2, rotation: -1.6 },
    { id: 'about',          col: 1, row: 2, rotation: 0.9 },
    { id: 'kinedic-drop',   col: 2, row: 2, rotation: -2.8 },
  ],
  timing: { pullUp: 1250, lineUp: 820, dive: 1350, aerial: 1500 },
  camera: { perspective: 2200, pullTilt: 16, aerialTilt: 14 },
};
```

Project content (titles, taglines, briefs, images) stays wherever the site already keeps it. The floor file only references projects by `id`. The site currently has 12 index entries; the floor holds 8 plus Home. The other projects still appear in Home's index; decide with Bonnie whether they get their own sheets (a 4 × 3 grid) or open the way they do today.

## 7. Routing

Each sheet maps to a hash: `#aether-command`, `#otherly` and so on; Home is no hash. Deep links load **already landed** on that sheet, with no flight. Back/forward between hashes should fly (use a short flight with no guides if history navigation feels slow). Keep existing URLs and the résumé PDF link working.

## 8. Visual system (already decided)

Palette (from `rmk-refine.css`). No pure `#000` or `#fff` by default; that's Bonnie's rule.
```
--ground #0c0c0d   --floor #141413   --ink #f3f2ef   --ink-2 #d6d5d1
--muted #9d9c98    --faint #6c6b68   --line #ffffff14 --line-2 #ffffff26
--amber #f2a93b    --amber-2 #f7c271  (the one accent: tiger soul = amber)
```
- Fonts: Space Grotesk (display), Inter (body), JetBrains Mono (labels only: 11px, 0.08–0.1em tracking, uppercase).
- Project titles: title case, 600 weight, −0.04em tracking; the second word is `--muted` and turns `--ink` on hover.
- Status pips: 7px dots. Amber for live, `--faint` otherwise. No per-project rainbow colors.
- Floor: `#141413` plus fine SVG noise (≈9% alpha) and one warm overhead light pool. In aerial, a faint 1px grid at `W/8` fades in.
- Sheet shadow (lying flat under overhead light): `0 2px 3px #0000008c, 0 30px 60px #000000a6` (was three layers; see the Decision log).
- **The RMK mark is heavy:** each cell gets a same-color 1.5 stroke (closes the gaps) and stacked drop-shadows, so the cells read as physical blocks. Blue/cyan cells become amber, and the copper cell becomes `#c9772f`. The click-to-remake behavior must keep working.
- **Point-of-view headline** under the mark: "One person in the *director's chair.*" (amber on "director's chair."). The sub-line is a draft; Bonnie will rewrite it.
- Floor labels (aerial only): mono, printed below each sheet. The one under Home reads "Index · you were here".
- Hint at the top in aerial: "You were looking down the whole time · click any sheet".

## 9. Accessibility (required, not polish)

- **`prefers-reduced-motion: reduce`:** no flights. Cross-fade (≤200ms) straight to the target sheet; aerial becomes a static overview with no tilt. Apple reviewers will check this.
- Sheets that aren't focused get `inert` and `aria-hidden="true"`. Only the focused sheet is in the tab order.
- On landing, move focus to the sheet's `h1`/`h2` and announce the project title through a polite live region.
- Every flight trigger is a real `<button>` or `<a>`, so the keyboard works throughout. Esc behaves as described in §3.4.
- Keep WCAG 2.2 AA contrast. `--faint` is for labels only, never body text.

## 10. Mobile and performance

- **Narrow screens (<860px):** keep the reveal, but shorten it to about 70% of the timings, set the tilt to 8°, and use a 1-column floor (sheets stacked vertically with alternating small rotations). Test on a real phone.
- `will-change: transform` on the world only while flying. Lazy-load images on sheets that aren't adjacent to the current one. Keep the full-res stills inside the landed page, not on the floor.
- Target 60fps on a 2020 MacBook Air in Safari. **Safari is the browser that matters here.** Test 3D transforms, backdrop-filter and SVG strokes there first.

## 11. Done means

- [ ] A cold load looks like an ordinary site, with no hint of the floor.
- [ ] Clicking any Home row runs beats 1–2, the line starts at that row, and beat 3 waits for the visitor's click.
- [ ] Landing is pixel-flat with no visible rotation, and the page scrolls normally.
- [ ] Aerial view, sheet-click flights, Next, Back and Esc all work.
- [ ] Deep links land directly; back/forward works.
- [ ] Reduced-motion path works; keyboard-only path works.
- [ ] Safari desktop and iOS Safari tested.
- [ ] The RMK mark still remakes on click.
- [ ] Floor positions and timings come only from `floor.ts`.
- [x] After a row click the floor waits: it only dives when you click the lined-up sheet (or Enter); you can choose another or drag instead. (Chrome, mouse and keyboard)
- [x] Drag pans with momentum; wheel, trackpad and pinch zoom around the cursor. (Chrome: mouse drag, wheel, touch drag and two-finger pinch. Trackpad pinch and Safari's gesture events are coded but not yet tried on a real trackpad.)
- [x] A tap lands on the sheet under it; a drag never triggers a click. (Chrome, mouse and touch)
- [ ] Works with mouse, trackpad and touch, in Chrome and Safari. (Chrome done at desktop and phone size; Safari and a real trackpad still to test on Bonnie's Mac and iPhone.)
- [x] Reduced motion: no momentum, everything else works. (Chrome)

## 12. Staying in the loop (read this, Claude)

Bonnie will keep changing this: copy, which projects sit where, timings, maybe the whole layout. This document is the shared memory between her and you.

1. **Before you start any session's work**, re-read this file and the Decision log below.
2. **When Bonnie changes something**, update the matching section above *and* add a dated line to the Decision log. Do this in the same commit as the code change.
3. **Don't silently "fix" intent.** If a request conflicts with §1, §3 or §8 (for example, something that would give away the floor before the first click), say so and ask before changing it. She may be changing her mind on purpose; log it if she is.
4. **If code and this doc disagree**, the most recent Decision log entry wins. Ask if it's unclear.
5. Note anything you tried and rejected in the log, so it doesn't get retried.

### Decision log
| Date | Decision | Why / who |
|---|---|---|
| 2026-11-05 | Keep the site's structure and voice; restyle only (single amber accent, neutral ground, fewer rules, title-case titles). | Bonnie: "it's very specifically me." |
| 2026-11-05 | RMK mark made heavier (stroked cells, physical-block shadows); blue/cyan cells → amber. | Bonnie: mark "not thick enough." |
| 2026-11-05 | Added the point-of-view headline "One person in the director's chair." Sub-line is a placeholder. | Bonnie wants a strong point of view. |
| 2026-11-05 | **Floor camera:** flat site until the first click, then pull up, line up, dive. 3×3 floor, Home in the center. | Bonnie: "you think you're looking at the straight site… when you click, your POV is revealed." Approved after the prototype. |
| 2026-11-05 | **Built and shipped.** Every project gets its own sheet: a 5 × 3 floor, Home in the center, her 3 × 3 unchanged in columns 1–3; frostbyte, listening-room, lil-swaps, digital-decoder and kinedic-bloom fill the outer columns, one corner left empty. Home's index is one row per project, and every row flies. | Bonnie: "i need it to be the new design now". Claude's call on §6's open question, so all the visual work is reachable the same way. |
| 2026-11-05 | No "View from above" on Home's masthead (Esc still works there); every other sheet has it. | §1: nothing in the first view gives the floor away. Matches the prototype. |
| 2026-11-05 | Floor grain and light pool are painted on the fixed backdrop, not on the moving world. | On the world they cost the view from above 1 fps → 62 fps once moved. The grain no longer slides with the floor; the light stays overhead. |
| 2026-11-05 | Sheet shadow cut to two layers. | The 120px blur cost about a quarter of the frame rate in flight. |
| 2026-11-05 | `--rmk-ink-faint` is #8c8b87, not #6c6b68; mono labels stay 12px, not 11px. | WCAG 1.4.3: #6c6b68 is 3.6:1 on the ground; #8c8b87 is 5.7:1. 12px is the site's text minimum. |
| 2026-11-05 | Hero sub-line uses Bonnie's own sentence from About ("I work on both sides of the line between design and engineering, and I don't hand off in the middle.") instead of the draft. | Never publish claims she hasn't made. She can rewrite it. |
| 2026-11-05 | Retired: chalk annotation layer, changeover cue, cue marks on titles, the old drawer catalog and "Expand all". | They read window scroll, which the floor no longer has, and they were the HUD look §2 asks to drop. Components kept in src/components (AnnotationLayer, CueMark). |
| 2026-11-05 | **Roaming:** drag to pan, zoom, tap to land; grabbing during the line-up beat cancels the dive. Line-up hold 820 → 1100ms. Pan clamps to the real 5 × 3 grid (the prompt said 3 × 3; same intent). | Bonnie: "my brain wants to drag… first the surprise of floor view and then while I'm here." |
| 2026-11-05 | Landing from the floor needs a distinct click: quick (≤300ms), still (<5px), same sheet, not right after a drag (350ms), and never the press that stops a glide or grabs the line-up. | Bonnie: "it switches too fast when you are on floor drag. a distinct click is needed." |
| 2026-11-05 | Chunky mark always on in every masthead, labeled "← Back to …". Site back = browser back inside the site (history entries remember the sheet before); from a deep link it goes to the Index. Replaces "← rmk.systems" and the mark that only appeared after scrolling. | Bonnie: "i hate it when im on sites and it dont know when to use their navigation v the browser and then im putting this on linkedin." |
| 2026-11-06 | **No auto-dive.** After the pull-up and line-up the camera waits at floor level until the visitor clicks the lined-up sheet (or another one); `timing.lineUp` removed. "Next →" waits the same way; "← Back", "← Index" and back/forward hop straight there. Supersedes the 1100ms grab-to-stay hold. | Bonnie: "when you're on floor level it can't just go on its own. people need to have control… it only goes there if you click on it." |
| 2026-11-05 | Video and demos run only on the sheet in focus; other sheets show a still (or the title, for demos with no still). Leaving a sheet unmounts its media, which also stops its sound. | Performance, and one sound at a time. |
| | | |
