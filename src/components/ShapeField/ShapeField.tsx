import { useEffect, useRef } from 'react'
import './ShapeField.css'

/** Grid pitch and cell size in CSS px — the logo's cell/gap rhythm, scaled up. */
const PITCH = 34
const SIZE = 20
/** Resting opacity of every cell. Whisper-quiet; the grid sits under text. */
const ALPHA = 0.05
/** How long one cell takes to crossfade into its next shape (ms). */
const MORPH_MS = 2800
/** How often a new cell starts changing (ms). Lower = busier field. */
const SPAWN_MS = 140
const BASE_COLOR = '#b9d4f2'
const ACCENTS = ['#00d4ff', '#6aa8ff', '#e0a06a']
/** Share of morphs that take an accent hue instead of the pale base. */
const ACCENT_CHANCE = 0.25

type Shape = 'square' | 'circle' | 'round' | 'wedge'
const SHAPES: Shape[] = ['square', 'circle', 'round', 'wedge']

interface Look {
  shape: Shape
  rot: number
  color: string
}

interface Cell {
  x: number
  y: number
  look: Look
  /** set while morphing */
  next?: Look
  start: number
}

const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)]
const SQUARE: Look = { shape: 'square', rot: 0, color: BASE_COLOR }

function randomLook(prev: Look): Look {
  let shape = pick(SHAPES)
  if (shape === prev.shape) shape = pick(SHAPES)
  return {
    shape,
    rot: (Math.floor(Math.random() * 4) * Math.PI) / 2,
    color: Math.random() < ACCENT_CHANCE ? pick(ACCENTS) : BASE_COLOR,
  }
}

function drawLook(ctx: CanvasRenderingContext2D, x: number, y: number, look: Look, alpha: number) {
  const h = SIZE / 2
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(x, y)
  ctx.rotate(look.rot)
  ctx.beginPath()
  switch (look.shape) {
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
  ctx.fillStyle = look.color
  ctx.fill()
  ctx.restore()
}

/**
 * Full-screen field of logo cells. It starts as a plain grid of squares;
 * random cells slowly crossfade into other mark shapes. Only cells that are
 * mid-change get redrawn each frame. Decorative: aria-hidden, no pointer
 * events, and a still grid under reduced motion.
 */
export function ShapeField() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let cells: Cell[] = []
    const morphing = new Set<Cell>()
    let raf = 0
    let lastSpawn = 0

    const clearCell = (c: Cell) => ctx.clearRect(c.x - PITCH / 2, c.y - PITCH / 2, PITCH, PITCH)

    const layout = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = window.innerWidth
      const h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      // Keep what's already changed if the window just resized a little.
      const old = new Map(cells.map((c) => [`${c.x},${c.y}`, c.look]))
      cells = []
      morphing.clear()
      for (let y = PITCH / 2; y < h + PITCH / 2; y += PITCH) {
        for (let x = PITCH / 2; x < w + PITCH / 2; x += PITCH) {
          const cell = { x, y, look: old.get(`${x},${y}`) ?? SQUARE, start: 0 }
          cells.push(cell)
          drawLook(ctx, x, y, cell.look, ALPHA)
        }
      }
    }

    const frame = (now: number) => {
      if (now - lastSpawn > SPAWN_MS && cells.length) {
        lastSpawn = now
        const c = pick(cells)
        if (!morphing.has(c)) {
          c.next = randomLook(c.look)
          c.start = now
          morphing.add(c)
        }
      }
      for (const c of morphing) {
        const t = Math.min((now - c.start) / MORPH_MS, 1)
        const e = t * t * (3 - 2 * t)
        clearCell(c)
        drawLook(ctx, c.x, c.y, c.look, ALPHA * (1 - e))
        drawLook(ctx, c.x, c.y, c.next!, ALPHA * e)
        if (t >= 1) {
          c.look = c.next!
          c.next = undefined
          morphing.delete(c)
          clearCell(c)
          drawLook(ctx, c.x, c.y, c.look, ALPHA)
        }
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
