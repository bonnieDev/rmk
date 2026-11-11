import { useEffect, useState } from 'react'
import type { LogoPalette } from '../../data/projects'

/**
 * The mark's palette drifts slowly around the color wheel, so it never sits
 * still as one fixed trio. Every mark reads the same clock, so the big mark
 * on Home and the small ones in the mastheads always agree.
 */

/** One full trip around the wheel */
const PERIOD_MS = 240_000
/** How often the color moves; each cell's fill eases across the step */
export const DRIFT_STEP_MS = 1500
/** Start on the amber the site was built around */
const START_HUE = 36
const BASE = '#f3f2ef'

export function driftPalette(now = Date.now()): LogoPalette {
  const h = (START_HUE + (now / PERIOD_MS) * 360) % 360
  return {
    ink: BASE,
    // one family at a time: a bright tone, a pale one, a deep one
    accents: [`hsl(${h.toFixed(1)} 82% 60%)`, `hsl(${(h + 18).toFixed(1)} 88% 74%)`, `hsl(${(h - 16).toFixed(1)} 62% 50%)`],
  }
}

/** The drifting palette. Holds still when paused or when motion is reduced. */
export function useDriftPalette(active: boolean): LogoPalette {
  // reduced motion: every mark holds the starting amber
  const [palette, setPalette] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ? driftPalette(0) : driftPalette(),
  )
  useEffect(() => {
    if (!active) return undefined
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return undefined
    setPalette(driftPalette())
    const id = window.setInterval(() => setPalette(driftPalette()), DRIFT_STEP_MS)
    return () => window.clearInterval(id)
  }, [active])
  return palette
}
