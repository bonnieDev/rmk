import { useEffect, useRef } from 'react'
import './ChalkAttractor.css'

/**
 * A Lorenz attractor etched into the glass beside the mark, cut once by a
 * slow point of light and then left alone.
 *
 * One continuous line, never repeating, in three layers: light glowing up
 * from beneath the glass, the frosted cut itself (its bevel comes from CSS),
 * and the point of light doing the cutting. The path is turned slightly in
 * space so the near side of each wing reads brighter than the far side, and
 * light builds where the path passes again and again. It never loops, so it
 * never competes with the logo. Visitors who prefer reduced motion get the
 * finished drawing.
 */

/** Slow on purpose: a glide, not a plot. */
const DRAW_MS = 32000
const START_DELAY_MS = 900
/** Skip the spiral out from the origin; start already on the attractor. */
const RUN_IN = 1500
/** Enough loops for the wings to fill with light, few enough to stay open. */
const STEPS = 7000
const DT = 0.004
/** Turn in space (radians): gives the wings depth instead of a flat outline. */
const YAW = -0.6
const PITCH = -0.18

/** Near side white-cyan, far side deep teal. */
const NEAR = [232, 246, 255]
const FAR = [64, 150, 170]

type P3 = [number, number, number]

function lorenz(): P3[] {
  const a = 10, b = 28, c = 8 / 3
  let x = 0.1, y = 0, z = 0
  const pts: P3[] = []
  for (let i = 0; i < RUN_IN + STEPS; i++) {
    const dx = a * (y - x)
    const dy = x * (b - z) - y
    const dz = x * y - c * z
    x += dx * DT
    y += dy * DT
    z += dz * DT
    if (i >= RUN_IN) pts.push([x, y, z - 25])
  }
  return pts
}

interface Seg {
  x: number
  y: number
  /** 0 = far, 1 = near */
  depth: number
  /** cumulative length, for constant-speed drawing */
  d: number
}

/** Rotate in space, project flat, fit into the box. */
function project(pts: P3[], w: number, h: number, pad: number): Seg[] {
  const cy = Math.cos(YAW), sy = Math.sin(YAW)
  const cp = Math.cos(PITCH), sp = Math.sin(PITCH)
  const rot = pts.map(([x, y, z]) => {
    const x1 = x * cy - y * sy
    const y1 = x * sy + y * cy
    const z1 = z * cp - y1 * sp
    const depth = y1 * cp + z * sp
    return [x1, z1, depth] as const
  })
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  let minD = Infinity, maxD = -Infinity
  for (const [x, y, d] of rot) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x)
    minY = Math.min(minY, y); maxY = Math.max(maxY, y)
    minD = Math.min(minD, d); maxD = Math.max(maxD, d)
  }
  const s = Math.min((w - pad * 2) / (maxX - minX), (h - pad * 2) / (maxY - minY))
  const ox = (w - (maxX - minX) * s) / 2
  const oy = (h - (maxY - minY) * s) / 2
  let d = 0
  let px = 0, py = 0
  return rot.map(([x, y, dep], i) => {
    const sx = ox + (x - minX) * s
    // screen y grows downward; flip so the wings open upward
    const syy = h - (oy + (y - minY) * s)
    if (i) d += Math.hypot(sx - px, syy - py)
    px = sx; py = syy
    return { x: sx, y: syy, depth: (dep - minD) / (maxD - minD), d }
  })
}

const mix = (t: number) =>
  `rgb(${NEAR.map((n, i) => Math.round(FAR[i] + (n - FAR[i]) * t)).join(',')})`

export function ChalkAttractor() {
  const glowRef = useRef<HTMLCanvasElement>(null)
  const traceRef = useRef<HTMLCanvasElement>(null)
  const tipRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const glow = glowRef.current
    const trace = traceRef.current
    const tip = tipRef.current
    const gctx = glow?.getContext('2d')
    const ctx = trace?.getContext('2d')
    const tctx = tip?.getContext('2d')
    if (!glow || !trace || !tip || !gctx || !ctx || !tctx) return

    const rect = trace.getBoundingClientRect()
    const w = rect.width
    const h = rect.height
    if (!w || !h) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    for (const [c, cx] of [[glow, gctx], [trace, ctx], [tip, tctx]] as const) {
      c.width = Math.floor(w * dpr)
      c.height = Math.floor(h * dpr)
      cx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const segs = project(lorenz(), w, h, 10)
    const total = segs[segs.length - 1].d

    for (const c of [gctx, ctx]) {
      c.lineCap = 'round'
      c.lineJoin = 'round'
    }
    // Light adds up beneath, where the path passes again: the wings fill
    // from within.
    gctx.globalCompositeOperation = 'lighter'
    // The cut itself is laid down opaque, so where one tiny segment's end
    // overlaps the next nothing doubles up into a bead; depth is carried by
    // color instead of transparency.
    // the light beneath: wider and saturated; CSS blurs it and drops it below
    gctx.lineWidth = 2.4
    // the cut: a pale, frosted hairline
    ctx.lineWidth = 0.55

    let drawn = 1
    /** Lay down every segment the tip has passed since last frame. */
    const advance = (target: number) => {
      for (; drawn < segs.length && segs[drawn].d <= target; drawn++) {
        const a = segs[drawn - 1]
        const b = segs[drawn]
        const depth = (a.depth + b.depth) / 2
        gctx.globalAlpha = 0.08 + depth * 0.22
        gctx.strokeStyle = mix(depth * 0.5)
        gctx.beginPath()
        gctx.moveTo(a.x, a.y)
        gctx.lineTo(b.x, b.y)
        gctx.stroke()
        ctx.strokeStyle = mix(0.5 + depth * 0.5)
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
      }
    }

    /** The point of light drawing the path, with a short bright tail. */
    const paintTip = (fade: number) => {
      tctx.clearRect(0, 0, w, h)
      if (fade <= 0) return
      const head = segs[Math.min(drawn, segs.length - 1)]
      const from = Math.max(1, drawn - 60)
      tctx.lineCap = 'round'
      for (let i = from; i < drawn; i++) {
        const k = (i - from) / (drawn - from)
        tctx.globalAlpha = k * k * 0.8 * fade
        tctx.strokeStyle = '#e8f6ff'
        tctx.lineWidth = 0.6 + k * 0.6
        tctx.beginPath()
        tctx.moveTo(segs[i - 1].x, segs[i - 1].y)
        tctx.lineTo(segs[i].x, segs[i].y)
        tctx.stroke()
      }
      const glow = tctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 7)
      glow.addColorStop(0, `rgba(255,255,255,${0.95 * fade})`)
      glow.addColorStop(0.35, `rgba(155,232,255,${0.45 * fade})`)
      glow.addColorStop(1, 'rgba(155,232,255,0)')
      tctx.globalAlpha = 1
      tctx.fillStyle = glow
      tctx.beginPath()
      tctx.arc(head.x, head.y, 7, 0, Math.PI * 2)
      tctx.fill()
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      advance(total)
      return
    }

    let raf = 0
    let started = 0
    let finished = 0
    const frame = (now: number) => {
      started ||= now
      const t = Math.min(1, (now - started) / DRAW_MS)
      // even pace through the middle, a gentle start and a gentle landing
      const eased = t < 0.06 ? (t / 0.06) ** 2 * 0.03
        : t > 0.94 ? 1 - ((1 - t) / 0.06) ** 2 * 0.03
        : 0.03 + (t - 0.06) / 0.88 * 0.94
      advance(total * eased)
      if (t < 1) {
        paintTip(1)
        raf = requestAnimationFrame(frame)
        return
      }
      // the light lifts off the finished line
      finished ||= now
      const fade = 1 - (now - finished) / 1800
      paintTip(fade)
      if (fade > 0) raf = requestAnimationFrame(frame)
    }
    const timer = window.setTimeout(() => {
      raf = requestAnimationFrame(frame)
    }, START_DELAY_MS)

    return () => {
      window.clearTimeout(timer)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div className="chalk-attractor" aria-hidden="true">
      <canvas ref={glowRef} className="chalk-attractor__glow" />
      <canvas ref={traceRef} className="chalk-attractor__etch" />
      <canvas ref={tipRef} className="chalk-attractor__tip" />
    </div>
  )
}
