import type { CellShape } from './types'

/** Cell edge length in viewBox units. Everything else is derived from this. */
export const CELL = 10
/** Gap between cells — wide enough that the halo never bridges two shapes. */
export const CELL_GAP = 1.6
/** Gap between letters */
export const LETTER_GAP = 14

export const letterWidth = (cols: number) => cols * CELL + (cols - 1) * CELL_GAP
export const letterHeight = (rows: number) => rows * CELL + (rows - 1) * CELL_GAP

export const markWidth = (cols: number, letters: number) =>
  letters * letterWidth(cols) + (letters - 1) * LETTER_GAP

/**
 * Rounded rectangle with per-corner control.
 *
 * SVG's <rect rx> rounds all four corners equally, but the mark's "round"
 * cells round an arbitrary subset — so those have to be drawn as a path.
 */
function roundedRectPath(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  c: { tl: boolean; tr: boolean; br: boolean; bl: boolean },
): string {
  const tl = c.tl ? r : 0
  const tr = c.tr ? r : 0
  const br = c.br ? r : 0
  const bl = c.bl ? r : 0
  return [
    `M${x + tl} ${y}`,
    `H${x + w - tr}`,
    tr ? `A${tr} ${tr} 0 0 1 ${x + w} ${y + tr}` : '',
    `V${y + h - br}`,
    br ? `A${br} ${br} 0 0 1 ${x + w - br} ${y + h}` : '',
    `H${x + bl}`,
    bl ? `A${bl} ${bl} 0 0 1 ${x} ${y + h - bl}` : '',
    `V${y + tl}`,
    tl ? `A${tl} ${tl} 0 0 1 ${x + tl} ${y}` : '',
    'Z',
  ]
    .filter(Boolean)
    .join(' ')
}

/** The wedge cell is a right triangle with one corner cut away. */
function wedgePath(x: number, y: number, s: number, cut: 'tl' | 'tr' | 'br' | 'bl'): string {
  const pts = {
    tl: `M${x + s} ${y} L${x + s} ${y + s} L${x} ${y + s} Z`,
    tr: `M${x} ${y} L${x + s} ${y + s} L${x} ${y + s} Z`,
    br: `M${x} ${y} L${x + s} ${y} L${x} ${y + s} Z`,
    bl: `M${x} ${y} L${x + s} ${y} L${x + s} ${y + s} Z`,
  }
  return pts[cut]
}

export interface CellGeometry {
  kind: 'rect' | 'circle' | 'path'
  x: number
  y: number
  size: number
  /** set when kind === 'path' */
  d?: string
}

/** Turns a cell's logical shape into drawable SVG geometry. */
export function cellGeometry(shape: CellShape, x: number, y: number): CellGeometry {
  const s = CELL
  switch (shape.type) {
    case 'circle':
      return { kind: 'circle', x, y, size: s }
    case 'round':
      return { kind: 'path', x, y, size: s, d: roundedRectPath(x, y, s, s, s / 2, shape.corners) }
    case 'wedge':
      return { kind: 'path', x, y, size: s, d: wedgePath(x, y, s, shape.cut) }
    default:
      return { kind: 'rect', x, y, size: s }
  }
}
