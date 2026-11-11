/**
 * The floor: where every sheet lies, how much it's turned, and how the camera
 * moves between them. Bonnie edits this file; components only read it.
 * See docs/FLOOR-CAMERA.md.
 *
 * Desktop is a 5 × 4 floor with Home in the middle of the top three rows. Her original 3 × 3 sits in
 * columns 1–3 unchanged; the outer columns hold the rest of the index.
 * Keep every rotation under 3°: curated, not a messy pile.
 */
export interface FloorSpot {
  id: string
  col: number
  row: number
  /** degrees; Home is never rotated */
  rotation: number
}

export const floor = {
  grid: { cols: 5, rows: 4, gapX: 0.22, gapY: 0.3 },
  sheets: [
    // Complex interfaces and accessibility sit around Home; creative work on the outside
    { id: 'kitty-n-pip', col: 0, row: 0, rotation: -2.4 },
    { id: 'digital-decoder', col: 1, row: 0, rotation: -1.2 },
    { id: 'aether-command', col: 2, row: 0, rotation: 1.1 },
    { id: 'lil-swaps', col: 3, row: 0, rotation: -2.1 },
    { id: 'listening-room', col: 4, row: 0, rotation: 1.9 },

    { id: 'cher-bomba', col: 0, row: 1, rotation: 1.8 },
    { id: 'kinedic-bloom', col: 1, row: 1, rotation: 2.6 },
    { id: 'home', col: 2, row: 1, rotation: 0 },
    { id: 'otherly', col: 3, row: 1, rotation: -1.3 },
    { id: 'skull-and-beau', col: 4, row: 1, rotation: 2.2 },

    { id: 'frostbyte', col: 0, row: 2, rotation: 1.4 },
    { id: 'bounce-cal', col: 1, row: 2, rotation: -1.6 },
    { id: 'about', col: 2, row: 2, rotation: 0.9 },
    { id: 'bunny-anarchy', col: 3, row: 2, rotation: -2.8 },
    // at the right edge: its long label has open floor beside it
    { id: 'kinedic-tripwire', col: 4, row: 2, rotation: 1.6 },

    { id: 'tech-literacy-translated', col: 1, row: 3, rotation: 1.3 },
    // one column over, so the book's long label has open floor beside it
    { id: 'kinedic-drop', col: 3, row: 3, rotation: -1.9 },
  ] satisfies FloorSpot[],
  /** milliseconds */
  // no line-up hold: after the pull-up the camera waits for the visitor
  timing: { pullUp: 1250, dive: 1350, aerial: 1500, back: 900 },
  /** perspective in px, tilts in degrees */
  camera: { perspective: 2200, pullTilt: 16, aerialTilt: 14 },
  /**
   * Roaming from above (§3.5): fling decay per frame, zoom range, and what
   * counts as a click that lands: moves under tapSlopPx, lasts at most
   * tapMaxMs, and comes at least settleMs after a drag ends.
   */
  roam: {
    momentumDecay: 0.92,
    minZoomOfFit: 0.75,
    maxZoom: 0.75,
    tapSlopPx: 5,
    tapMaxMs: 300,
    settleMs: 350,
    panMarginOfGap: 0.2,
  },
  /** Below this width: one column, shorter flights, gentler tilt */
  narrow: { maxWidth: 860, timeScale: 0.7, tilt: 8, rotation: 1.2 },
}
