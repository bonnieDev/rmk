import { useEffect, useRef } from 'react'
import { buildChalk } from '../AnnotationLayer/chalk'
import type { Pt } from '../AnnotationLayer/marks'
import './ChalkAttractor.css'

/**
 * A Lorenz attractor drawn once in chalk beside the mark, then left alone.
 *
 * It traces itself on load and settles; it never loops, so it never competes
 * with the logo for attention. Visitors who prefer reduced motion get the
 * finished drawing.
 */

const COLOR = '#9be8ff'
/** Slow on purpose: the line should feel drawn by a hand, not plotted. */
const DRAW_MS = 24000
const START_DELAY_MS = 900
/** Integration steps: a couple of loops on each wing, open enough to read. */
const STEPS = 2200
const DT = 0.005

/** Classic Lorenz system, projected onto x/z so it reads as the butterfly. */
function lorenz(): Pt[] {
  const a = 10, b = 28, c = 8 / 3
  let x = 0.1, y = 0, z = 0
  const pts: Pt[] = []
  for (let i = 0; i < STEPS + 200; i++) {
    const dx = a * (y - x)
    const dy = x * (b - z) - y
    const dz = x * y - c * z
    x += dx * DT
    y += dy * DT
    z += dz * DT
    // skip the run-in from the origin; keep every other step
    if (i >= 200 && i % 2 === 0) pts.push([x, z])
  }
  return pts
}

/** Fit the curve into the box, with a slight hand-set tilt. */
function fit(pts: Pt[], w: number, h: number, pad: number): Pt[] {
  const tilt = -0.12
  const cos = Math.cos(tilt), sin = Math.sin(tilt)
  const rot = pts.map(([x, y]): Pt => [x * cos - y * sin, x * sin + y * cos])
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const [x, y] of rot) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x)
    minY = Math.min(minY, y); maxY = Math.max(maxY, y)
  }
  const s = Math.min((w - pad * 2) / (maxX - minX), (h - pad * 2) / (maxY - minY))
  const ox = (w - (maxX - minX) * s) / 2
  const oy = (h - (maxY - minY) * s) / 2
  // flip y so the wings open upward, like the drawing in the source page
  return rot.map(([x, y]): Pt => [ox + (x - minX) * s, h - (oy + (y - minY) * s)])
}

export function ChalkAttractor() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const curve = lorenz()
    let raf = 0
    let timer = 0
    let started = 0

    const rect = canvas.getBoundingClientRect()
    const w = rect.width
    const h = rect.height
    if (!w || !h) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.floor(w * dpr)
    canvas.height = Math.floor(h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    // Chalk-weight grains, matching the annotation marks; thinner and they
    // fall below a pixel and read as noise instead of chalk.
    const chalk = buildChalk([fit(curve, w, h, 8)], w < 180 ? 1.1 : 1.3)

    // Chalk only ever accumulates, so each frame lays down just the grains
    // the tip has passed since the last one.
    const next = chalk.buckets.map(() => 0)
    ctx.fillStyle = COLOR
    const paint = (t: number) => {
      const target = chalk.total * t
      chalk.buckets.forEach((bucket, b) => {
        ctx.globalAlpha = bucket.alpha
        ctx.beginPath()
        let i = next[b]
        // dabs ascend in `d`, so the first one past the tip ends the bucket
        for (; i < bucket.dabs.length && bucket.dabs[i].d <= target; i++) {
          const g = bucket.dabs[i]
          ctx.moveTo(g.x + g.r, g.y)
          ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2)
        }
        next[b] = i
        ctx.fill()
      })
    }

    if (reduced) {
      paint(1)
      return
    }

    const frame = (now: number) => {
      started ||= now
      const t = Math.min(1, (now - started) / DRAW_MS)
      // eases in and out, so the hand settles into the stroke and lifts gently
      paint(0.5 - Math.cos(Math.PI * t) / 2)
      if (t < 1) raf = requestAnimationFrame(frame)
    }
    timer = window.setTimeout(() => {
      raf = requestAnimationFrame(frame)
    }, START_DELAY_MS)

    return () => {
      window.clearTimeout(timer)
      cancelAnimationFrame(raf)
    }
  }, [])

  return <canvas ref={canvasRef} className="chalk-attractor" aria-hidden="true" />
}
