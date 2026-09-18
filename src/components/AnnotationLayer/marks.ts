/**
 * The gesture vocabulary.
 *
 * Every generator returns a plain polyline in screen space. Drawing, glow,
 * fading and lifetime are the renderer's job — these only describe shape, so
 * a mark can be tested and reasoned about as geometry.
 *
 * Irregularity is baked in here rather than at draw time: a hand doesn't
 * produce the same stroke twice, and jittering once keeps a mark stable
 * across the frames it's alive for.
 */

export type Pt = [number, number]
export type MarkKind =
  | 'tick'
  | 'drag'
  | 'underline'
  | 'bracket'
  | 'arc'
  | 'ring'
  | 'arrowhead'
  | 'locator'
  | 'sweep'

/** Deterministic-ish jitter: small enough to read as a hand, not a glitch. */
function jitter(pts: Pt[], amount: number): Pt[] {
  return pts.map(([x, y]) => [
    x + (Math.random() - 0.5) * amount,
    y + (Math.random() - 0.5) * amount,
  ])
}

/** Samples a quadratic curve so strokes bow slightly instead of running true. */
function curve(a: Pt, b: Pt, bow: number, steps = 10): Pt[] {
  const mx = (a[0] + b[0]) / 2
  const my = (a[1] + b[1]) / 2
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len = Math.hypot(dx, dy) || 1
  // control point pushed perpendicular to the stroke
  const cx = mx + (-dy / len) * bow
  const cy = my + (dx / len) * bow
  const out: Pt[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const u = 1 - t
    out.push([
      u * u * a[0] + 2 * u * t * cx + t * t * b[0],
      u * u * a[1] + 2 * u * t * cy + t * t * b[1],
    ])
  }
  return out
}

function arcPts(cx: number, cy: number, r: number, from: number, to: number, steps = 18): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i <= steps; i++) {
    const a = from + (to - from) * (i / steps)
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
  }
  return out
}

const rand = (a: number, b: number) => a + Math.random() * (b - a)
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)]

/**
 * A mark is one or more strokes — a bracket and a locator need separate
 * pen-downs, and forcing them into one polyline would draw a connecting line.
 */
export interface MarkShape {
  strokes: Pt[][]
}

export function buildMark(kind: MarkKind, x: number, y: number, dir: number): MarkShape {
  const d = dir >= 0 ? 1 : -1

  switch (kind) {
    case 'tick': {
      const len = rand(20, 34)
      const lean = rand(0.4, 0.9) * d
      return {
        strokes: [jitter(curve([x, y], [x + len * lean, y + len * d], rand(-1.2, 2.16)), 1.1)],
      }
    }

    case 'drag': {
      const len = rand(64, 130)
      const lean = rand(-0.35, 0.35)
      return {
        strokes: [
          jitter(curve([x, y], [x + len * lean, y + len * d], rand(-5, 9.0), 14), 1.4),
        ],
      }
    }

    case 'underline': {
      const w = rand(58, 124)
      return { strokes: [jitter(curve([x - w / 2, y], [x + w / 2, y], rand(1.5, 8.1), 12), 1.2)] }
    }

    case 'bracket': {
      const h = rand(42, 74)
      const w = rand(11, 18)
      const s = pick([1, -1])
      return {
        strokes: [
          jitter(
            [
              [x + w * s, y - h / 2],
              [x, y - h / 2],
              [x, y + h / 2],
              [x + w * s, y + h / 2],
            ],
            1.1,
          ),
        ],
      }
    }

    case 'arc': {
      const r = rand(28, 56)
      const from = rand(0, Math.PI * 2)
      return { strokes: [jitter(arcPts(x, y, r, from, from + rand(0.8, 3.78)), 1.2)] }
    }

    case 'ring': {
      const r = rand(22, 40)
      const from = rand(0, Math.PI * 2)
      // deliberately not closed — a hand overshoots or leaves a gap
      return { strokes: [jitter(arcPts(x, y, r, from, from + rand(5.1, 10.98), 26), 1.0)] }
    }

    case 'arrowhead': {
      const s = rand(14, 24)
      return {
        strokes: [
          jitter(
            [
              [x - s, y - s * d],
              [x, y],
              [x + s, y - s * d],
            ],
            0.9,
          ),
        ],
      }
    }

    case 'locator': {
      const g = rand(9, 15)
      const l = rand(13, 22)
      return {
        strokes: [
          jitter([[x - g - l, y], [x - g, y]], 1.26),
          jitter([[x + g, y], [x + g + l, y]], 1.26),
          jitter([[x, y - g - l], [x, y - g]], 1.26),
          jitter([[x, y + g], [x, y + g + l]], 1.26),
        ],
      }
    }

    case 'sweep':
    default: {
      const w = rand(130, 260)
      return {
        strokes: [jitter(curve([x - w / 2, y], [x + w / 2, y + rand(-14, 25.2) * d], rand(8, 20), 18), 1.5)],
      }
    }
  }
}

/** Constant, quiet background chatter. */
export const MICRO_KINDS: MarkKind[] = ['tick', 'drag', 'underline', 'bracket', 'arrowhead']
/** Reserved for clicks, section reveals and opening a project. */
export const ACCENT_KINDS: MarkKind[] = ['arc', 'ring', 'locator', 'sweep']

export { pick, rand }
