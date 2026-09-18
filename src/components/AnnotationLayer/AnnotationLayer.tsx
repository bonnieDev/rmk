import { useEffect, useRef } from 'react'
import { buildChalk, type Chalk } from './chalk'
import {
  ACCENT_KINDS,
  buildMark,
  pick,
  rand,
  type MarkKind,
  type Pt,
} from './marks'
import './AnnotationLayer.css'

/**
 * A transparent layer that annotates the page as you use it — short glowing
 * chalk gestures over glass, drawn where you're actually looking.
 *
 * Deliberate constraints:
 *  - One canvas, `pointer-events: none`, so the UI underneath is untouched.
 *  - The rAF loop only runs while marks are alive; an idle page costs nothing.
 *  - Hard caps per tier. The failure mode of an effect like this is flooding,
 *    so the budget is enforced at spawn rather than hoped for.
 */

/** Icy white through pale cyan to soft teal, with copper as a rare warm note. */
const COLORS = ['#e8f6ff', '#9be8ff', '#5fd3c8', '#b9e6ff'] as const
const WARM = '#e0a06a'

const MAX_MICRO = 14
const MAX_ACCENT = 5

interface LiveMark {
  chalk: Chalk
  born: number
  drawMs: number
  lifeMs: number
  width: number
  color: string
  drift: Pt
  accent: boolean
}

export default function AnnotationLayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const marksRef = useRef<LiveMark[]>([])
  const rafRef = useRef<number | null>(null)
  const pointerRef = useRef<Pt>([-999, -999])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx2d = canvas.getContext('2d')
    if (!ctx2d) return
    const ctx: CanvasRenderingContext2D = ctx2d

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let w = 0
    let h = 0
    let dpr = 1
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    // ---- spawning -------------------------------------------------------

    function spawn(kind: MarkKind, x: number, y: number, dir: number, accent: boolean) {
      const list = marksRef.current
      const count = list.filter((m) => m.accent === accent).length
      if (count >= (accent ? MAX_ACCENT : MAX_MICRO)) return

      const { strokes } = buildMark(kind, x, y, dir)
      const width = accent ? rand(1.9, 2.6) : rand(1.4, 2.0)
      list.push({
        chalk: buildChalk(strokes, width),
        born: performance.now(),
        // fast hand notation — accents get a touch more room to travel
        drawMs: reduced ? 1 : accent ? rand(220, 380) : rand(110, 210),
        lifeMs: reduced ? rand(420, 700) : accent ? rand(900, 1500) : rand(520, 980),
        width,
        color: Math.random() < 0.06 ? WARM : pick(COLORS),
        drift: reduced ? [0, 0] : [rand(-5, 5), rand(-9, 3) + dir * 3],
        accent,
      })
      start()
    }

    // ---- the loop -------------------------------------------------------

    function frame() {
      const now = performance.now()
      const list = marksRef.current
      ctx.clearRect(0, 0, w, h)

      for (let i = list.length - 1; i >= 0; i--) {
        const m = list[i]
        const age = now - m.born
        if (age > m.drawMs + m.lifeMs) {
          list.splice(i, 1)
          continue
        }

        const drawT = Math.min(1, age / m.drawMs)
        const fadeT = Math.max(0, (age - m.drawMs) / m.lifeMs)
        // hold briefly at full, then ease out
        const alpha = fadeT === 0 ? 1 : Math.pow(1 - fadeT, 1.7)
        const dx = m.drift[0] * fadeT
        const dy = m.drift[1] * fadeT

        ctx.save()
        ctx.translate(dx, dy)
        ctx.fillStyle = m.color

        const target = m.chalk.total * drawT
        for (const bucket of m.chalk.buckets) {
          ctx.globalAlpha = bucket.alpha * alpha
          ctx.beginPath()
          for (const g of bucket.dabs) {
            // dabs ascend in `d`, so the first one past the tip ends the bucket
            if (g.d > target) break
            ctx.moveTo(g.x + g.r, g.y)
            ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2)
          }
          ctx.fill()
        }

        ctx.restore()
      }

      if (list.length) {
        rafRef.current = requestAnimationFrame(frame)
      } else {
        rafRef.current = null
        ctx.clearRect(0, 0, w, h)
      }
    }

    function start() {
      if (rafRef.current == null) rafRef.current = requestAnimationFrame(frame)
    }

    // ---- interaction ----------------------------------------------------

    const onPointerMove = (e: PointerEvent) => {
      pointerRef.current = [e.clientX, e.clientY]
    }

    let lastScrollY = window.scrollY
    let scrollGate = 0
    const onScroll = () => {
      const now = performance.now()
      const y = window.scrollY
      const delta = y - lastScrollY
      lastScrollY = y
      if (Math.abs(delta) < 4) return
      if (now - scrollGate < (reduced ? 620 : 150)) return
      scrollGate = now

      const dir = delta > 0 ? 1 : -1
      const [px] = pointerRef.current
      // cluster around the pointer when we have one, otherwise the reading column
      const x = px > 0 ? px + rand(-160, 160) : rand(w * 0.2, w * 0.8)
      const y0 = rand(h * 0.2, h * 0.85)
      // scrolling up is lighter than scrolling down
      const kind: MarkKind = dir > 0 ? pick(['tick', 'drag', 'tick', 'arrowhead']) : pick(['tick', 'underline'])
      spawn(kind, x, y0, dir, false)
    }

    const onPointerDown = (e: PointerEvent) => {
      spawn(pick(ACCENT_KINDS), e.clientX, e.clientY, 1, true)
      if (!reduced) spawn('tick', e.clientX + rand(-18, 18), e.clientY + rand(-16, 16), 1, false)
    }

    // Hover: only on things that matter, and only once per element per pass.
    const HOVER_SELECTOR = '.entry, .ghost-btn, .entry__toggle, .masthead__nav button, .rmk-mark'
    const recentHover = new WeakSet<Element>()
    const onPointerOver = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.(HOVER_SELECTOR)
      if (!el || recentHover.has(el)) return
      recentHover.add(el)
      window.setTimeout(() => recentHover.delete(el), 2600)

      const r = el.getBoundingClientRect()
      if (r.bottom < 0 || r.top > h) return
      const kind: MarkKind = pick(['underline', 'bracket', 'locator'])
      const x = kind === 'bracket' ? r.left + rand(-6, 10) : r.left + Math.min(r.width, 220) * rand(0.15, 0.6)
      const y = kind === 'underline' ? Math.min(r.bottom - 4, h - 8) : r.top + Math.min(r.height, 180) * 0.5
      spawn(kind, x, y, 1, kind === 'locator')
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('pointerdown', onPointerDown, { passive: true })
    window.addEventListener('pointerover', onPointerOver, { passive: true })

    // Section reveal: a single guiding annotation as a block arrives.
    const seen = new WeakSet<Element>()
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (!en.isIntersecting || seen.has(en.target)) continue
          seen.add(en.target)
          const r = en.boundingClientRect
          spawn(pick(['bracket', 'arc', 'locator']), r.left + rand(6, 40), r.top + rand(20, 70), 1, true)
        }
      },
      { threshold: 0.25 },
    )
    document.querySelectorAll('.section, .entry').forEach((el) => io.observe(el))

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerover', onPointerOver)
      io.disconnect()
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      marksRef.current = []
    }
  }, [])

  return <canvas ref={canvasRef} className="annotation-layer" aria-hidden="true" />
}
