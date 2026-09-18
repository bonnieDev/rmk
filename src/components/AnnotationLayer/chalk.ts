/**
 * Turns a polyline into chalk.
 *
 * A stroked path reads as a line no matter how much you jitter its control
 * points, because the ink is continuous and the width never changes. Real
 * chalk is granular: pigment lands unevenly, pressure rises and falls, the
 * stick skips, and dust scatters off the edge of the stroke.
 *
 * So the line is replaced by deposited grains. They're computed once at birth
 * and never regenerated — recomputing per frame would make the texture crawl.
 */

import type { Pt } from './marks'

export interface Dab {
  x: number
  y: number
  r: number
  /** distance along the whole mark, for the draw-on reveal */
  d: number
}

/** Grains bucketed by opacity so a bucket fills in one call instead of per-dab. */
export interface ChalkBucket {
  alpha: number
  dabs: Dab[]
}

export interface Chalk {
  buckets: ChalkBucket[]
  total: number
}

const ALPHA_LEVELS = [0.22, 0.45, 0.7, 0.95]

function bucketFor(a: number) {
  let best = 0
  for (let i = 1; i < ALPHA_LEVELS.length; i++) {
    if (Math.abs(ALPHA_LEVELS[i] - a) < Math.abs(ALPHA_LEVELS[best] - a)) best = i
  }
  return best
}

/**
 * Cheap 1-D value noise. Pressure has to vary *smoothly* along a stroke —
 * per-grain randomness alone reads as static, not as a hand pressing harder.
 */
function pressureAt(seed: number, t: number) {
  const s = Math.sin((t * 0.9 + seed) * 1.7) * 0.5 + Math.sin((t * 0.31 + seed) * 3.1) * 0.5
  return 0.55 + 0.45 * (s * 0.5 + 0.5)
}

export function buildChalk(strokes: Pt[][], width: number): Chalk {
  const buckets: ChalkBucket[] = ALPHA_LEVELS.map((alpha) => ({ alpha, dabs: [] }))
  const seed = Math.random() * 100
  /** grain spacing — tight enough to read as a stroke, loose enough to feel dry */
  const STEP = 0.85
  let d = 0

  for (const pts of strokes) {
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1]
      const [x1, y1] = pts[i]
      const segLen = Math.hypot(x1 - x0, y1 - y0)
      if (segLen < 0.001) continue
      const nx = -(y1 - y0) / segLen
      const ny = (x1 - x0) / segLen
      const steps = Math.max(1, Math.round(segLen / STEP))

      for (let s = 0; s < steps; s++) {
        const f = s / steps
        const px = x0 + (x1 - x0) * f
        const py = y0 + (y1 - y0) * f
        const dHere = d + segLen * f
        const pressure = pressureAt(seed, dHere * 0.12)

        // the stick skips where pressure is lowest
        if (Math.random() > 0.34 + pressure * 0.66) continue

        // core grain — offset across the stroke so the edge is never true
        const off = (Math.random() - 0.5) * width * 1.5
        buckets[bucketFor(0.55 + pressure * 0.4)].dabs.push({
          x: px + nx * off,
          y: py + ny * off,
          r: width * (0.5 + Math.random() * 0.45) * pressure,
          d: dHere,
        })

        // dust thrown clear of the stroke
        if (Math.random() < 0.22) {
          const far = (Math.random() < 0.5 ? -1 : 1) * width * (1.6 + Math.random() * 3.4)
          buckets[bucketFor(0.12 + Math.random() * 0.3)].dabs.push({
            x: px + nx * far + (Math.random() - 0.5),
            y: py + ny * far + (Math.random() - 0.5),
            r: width * (0.16 + Math.random() * 0.3),
            d: dHere,
          })
        }
      }
      d += segLen
    }
  }

  // each bucket is already in ascending `d`, which the reveal relies on
  return { buckets: buckets.filter((b) => b.dabs.length), total: d || 1 }
}
