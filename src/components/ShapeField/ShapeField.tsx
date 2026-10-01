import { useEffect, useRef } from 'react'
import './ShapeField.css'

/** Grid pitch in CSS px — roughly a logo cell, scaled up for the page. */
const PITCH = 56
const SIZE = 22
/** Peak opacity of a lit cell. Keep this whisper-quiet; it sits under text. */
const PEAK = 0.12
/** Share of cells lit at any moment. */
const DENSITY = 0.12
const COLORS = ['#00d4ff', '#6aa8ff', '#e0a06a', '#b9d4f2']
type Shape = 'square' | 'circle' | 'round' | 'wedge'
const SHAPES: Shape[] = ['square', 'circle', 'round', 'wedge']

interface Cell {
  x: number
  y: number
  shape: Shape
  rot: number
  color: string
  /** when this cell's current breath started, and how long it lasts (ms) */
  start: number
  dur: number
}

const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)]

function drawShape(ctx: CanvasRenderingContext2D, c: Cell) {
  const h = SIZE / 2
  ctx.save()
  ctx.translate(c.x, c.y)
  ctx.rotate(c.rot)
  ctx.beginPath()
  switch (c.shape) {
    case 'circle':
      ctx.arc(0, 0, h, 0, Math.PI * 2)
      break
    case 'round':
      // Two opposite corners rounded, like the mark's "round" cells.
      ctx.roundRect(-h, -h, SIZE, SIZE, [h, 0, h, 0])
      break
    case 'wedge':
      ctx.moveTo(-h, -h)
      ctx.lineTo(h, -h)
      ctx.lineTo(-h, h)
      break
    default:
      ctx.rect(-h, -h, SIZE, SIZE)
  }
  ctx.closePath()
  ctx.fillStyle = c.color
  ctx.fill()
  ctx.restore()
}

/**
 * Faint drafting-grid field of logo cells that breathe in and out behind
 * the page. Decorative only: aria-hidden, no pointer events, and static
 * under reduced motion.
 */
export function ShapeField() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let cells: Cell[] = []
    let raf = 0

    const newCell = (x: number, y: number, now: number, fresh: boolean): Cell => {
      const dur = 6000 + Math.random() * 7000
      return {
        x,
        y,
        shape: pick(SHAPES),
        rot: (Math.floor(Math.random() * 4) * Math.PI) / 2,
        color: pick(COLORS),
        dur,
        // Stagger the first cycle so the field doesn't pulse in unison.
        start: fresh ? now - Math.random() * dur : now + Math.random() * 4000,
      }
    }

    const layout = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = window.innerWidth
      const h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const now = performance.now()
      cells = []
      for (let y = PITCH / 2; y < h + PITCH; y += PITCH) {
        for (let x = PITCH / 2; x < w + PITCH; x += PITCH) {
          if (Math.random() < DENSITY) cells.push(newCell(x, y, now, true))
        }
      }
      if (still) {
        ctx.clearRect(0, 0, w, h)
        ctx.globalAlpha = PEAK * 0.6
        cells.forEach((c) => drawShape(ctx, c))
      }
    }

    const frame = (now: number) => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
      for (let i = 0; i < cells.length; i++) {
        const c = cells[i]
        const t = (now - c.start) / c.dur
        if (t >= 1) {
          // Breath finished: reappear as a new shape somewhere else.
          const x = PITCH / 2 + Math.floor(Math.random() * (window.innerWidth / PITCH + 1)) * PITCH
          const y = PITCH / 2 + Math.floor(Math.random() * (window.innerHeight / PITCH + 1)) * PITCH
          cells[i] = newCell(x, y, now, false)
          continue
        }
        if (t <= 0) continue
        ctx.globalAlpha = PEAK * Math.sin(Math.PI * t) ** 2
        drawShape(ctx, c)
      }
      raf = requestAnimationFrame(frame)
    }

    layout()
    window.addEventListener('resize', layout)
    if (!still) raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', layout)
    }
  }, [])

  return <canvas ref={ref} className="shape-field" aria-hidden="true" />
}
