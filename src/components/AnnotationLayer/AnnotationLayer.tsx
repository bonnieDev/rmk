import { useEffect, useRef } from 'react'
import { buildChalk, type Chalk } from './chalk'
import { buildMark, pick, rand, type MarkFit, type MarkKind, type Pt } from './marks'
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

const MAX_MICRO = 6
/**
 * Pointing is scarce on purpose. Two marks on screen at once are not pointing
 * at anything — they are decoration that happens to be near something.
 */
const MAX_POINT = 1
/** How long the pointer has to actually rest on a thing before it is a target. */
const DWELL_MS = 520
/** A target will not be pointed at twice inside this window. */
const REPOINT_MS = 9000

/**
 * What each kind of target deserves. This is the whole vocabulary of "hey,
 * look at this" — a ring for a small status object, an underline under actual
 * words, a bracket holding a real block, a locator on a single point.
 */
const POINT_AT: { selector: string; kind: MarkKind }[] = [
  { selector: '.entry__status', kind: 'ring' },
  { selector: '.entry__num', kind: 'locator' },
  { selector: '.entry__toggle', kind: 'underline' },
  { selector: '.ghost-btn', kind: 'underline' },
  { selector: '.entry__title', kind: 'underline' },
  { selector: '.rmk-mark', kind: 'locator' },
  { selector: '.entry__cover, .entry__media', kind: 'bracket' },
  { selector: '.entry', kind: 'bracket' },
]

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

    function spawn(
      kind: MarkKind,
      x: number,
      y: number,
      dir: number,
      accent: boolean,
      fit?: MarkFit,
    ) {
      const list = marksRef.current
      const count = list.filter((m) => m.accent === accent).length
      if (count >= (accent ? MAX_POINT : MAX_MICRO)) return

      const { strokes } = buildMark(kind, x, y, dir, fit)
      const width = accent ? rand(1.9, 2.6) : rand(1.4, 2.0)
      list.push({
        chalk: buildChalk(strokes, width),
        born: performance.now(),
        // fast hand notation — accents get a touch more room to travel
        drawMs: reduced ? 1 : accent ? rand(300, 460) : rand(110, 210),
        // A point is held: long enough to be read as a statement rather than
        // a flicker. Ambient chatter stays brief.
        lifeMs: reduced ? rand(420, 700) : accent ? rand(1500, 2200) : rand(520, 980),
        width,
        color: Math.random() < 0.06 ? WARM : pick(COLORS),
        // A point does not wander off the thing it is pointing at.
        drift: reduced || accent ? [0, 0] : [rand(-5, 5), rand(-9, 3) + dir * 3],
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

    /**
     * The empty column beside the content, if there is one.
     *
     * Ambient chatter belongs in the margin — the rule that separates it from
     * pointing is that it never lands on anything. On a narrow screen there is
     * no margin, so there is no chatter.
     */
    function gutter(): [number, number] | null {
      const content = document.querySelector('.entry, .section')
      if (!content) return null
      const r = content.getBoundingClientRect()
      const left = r.left - 12
      const right = w - (r.right + 12)
      if (left < 48 && right < 48) return null
      return left > right ? [8, r.left - 12] : [r.right + 12, w - 8]
    }

    const onScroll = () => {
      const now = performance.now()
      const y = window.scrollY
      const delta = y - lastScrollY
      lastScrollY = y
      if (Math.abs(delta) < 4) return
      if (now - scrollGate < (reduced ? 1400 : 620)) return
      const band = gutter()
      if (!band) return
      scrollGate = now

      const dir = delta > 0 ? 1 : -1
      const kind: MarkKind = dir > 0 ? pick(['tick', 'drag', 'tick']) : pick(['tick', 'underline'])
      spawn(kind, rand(band[0], band[1]), rand(h * 0.2, h * 0.85), dir, false)
    }

    // ---- pointing -------------------------------------------------------

    /**
     * The true box of an element's first line of text.
     *
     * An element's own rect is the whole block, so underlining it draws a rule
     * the width of the column rather than the width of the words. A Range over
     * its contents returns what was actually typeset.
     */
    function firstLineRect(el: Element): { left: number; right: number; bottom: number } | null {
      const range = document.createRange()
      range.selectNodeContents(el)
      const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0)
      if (!rects.length) return null
      // A title split across spans yields one rect per span, so rects[0] is the
      // first *word group*, not the first line. Union everything sharing that
      // line's baseline, or the mark underlines half a title and stops.
      const first = rects[0]
      let left = first.left
      let right = first.right
      let bottom = first.bottom
      for (const r of rects) {
        if (Math.abs(r.top - first.top) > first.height * 0.5) continue
        left = Math.min(left, r.left)
        right = Math.max(right, r.right)
        bottom = Math.max(bottom, r.bottom)
      }
      return { left, right, bottom }
    }

    /** Where a mark has to be, and how big, to actually be about this element. */
    function aim(el: Element, kind: MarkKind): { x: number; y: number; fit: MarkFit } | null {
      const r = el.getBoundingClientRect()
      if (!r.width || !r.height) return null

      switch (kind) {
        case 'underline': {
          const line = firstLineRect(el) ?? { left: r.left, right: r.right, bottom: r.bottom }
          const w = Math.min(line.right - line.left, 320)
          // Sits under the baseline, never through the words: a rule crossing
          // text costs contrast on the text, which is not a trade worth making.
          return { x: line.left + w / 2, y: Math.min(line.bottom + 6, h - 6), fit: { w } }
        }
        case 'ring':
        case 'arc': {
          // Only worth circling something small enough to be circled.
          if (r.width > 180 || r.height > 120) return null
          return {
            x: r.left + r.width / 2,
            y: r.top + r.height / 2,
            fit: { r: Math.hypot(r.width, r.height) / 2 + 9 },
          }
        }
        case 'locator': {
          return {
            x: r.left + r.width / 2,
            y: r.top + r.height / 2,
            fit: { r: Math.max(r.width, r.height) / 2 + 4 },
          }
        }
        case 'bracket':
        default: {
          const height = Math.min(r.height, 220)
          return { x: Math.max(10, r.left - 14), y: r.top + height / 2, fit: { h: height } }
        }
      }
    }

    const pointedAt = new WeakMap<Element, number>()

    /** One considered mark, on a real target, sized to it. */
    function point(el: Element) {
      const now = performance.now()
      const last = pointedAt.get(el)
      if (last != null && now - last < REPOINT_MS) return
      if (marksRef.current.some((m) => m.accent)) return

      const rule = POINT_AT.find((entry) => el.matches(entry.selector))
      if (!rule) return
      const aimed = aim(el, rule.kind)
      if (!aimed) return
      const r = el.getBoundingClientRect()
      if (r.bottom < 40 || r.top > h - 20) return

      pointedAt.set(el, now)
      spawn(rule.kind, aimed.x, aimed.y, 1, true, aimed.fit)
    }

    /** The most specific thing under the pointer that is worth pointing at. */
    function targetFrom(node: Element | null): Element | null {
      for (const rule of POINT_AT) {
        const hit = node?.closest?.(rule.selector)
        if (hit) return hit
      }
      return null
    }

    // Dwell, not pass-through. Sweeping the pointer across the page used to
    // spray a mark off every element it crossed; pointing means the pointer
    // came to rest on something first.
    let dwellTimer: number | null = null
    let dwellTarget: Element | null = null

    const onPointerOver = (e: PointerEvent) => {
      const el = targetFrom(e.target as Element | null)
      if (el === dwellTarget) return
      dwellTarget = el
      if (dwellTimer != null) window.clearTimeout(dwellTimer)
      if (!el) return
      dwellTimer = window.setTimeout(() => {
        if (dwellTarget === el) point(el)
      }, DWELL_MS)
    }

    const onPointerDown = (e: PointerEvent) => {
      // A click is already a decision — point at what was chosen.
      const el = targetFrom(e.target as Element | null)
      if (el) point(el)
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('pointerdown', onPointerDown, { passive: true })
    window.addEventListener('pointerover', onPointerOver, { passive: true })

    // Section reveal: one considered mark as a block arrives, aimed at the
    // block itself rather than dropped somewhere near its corner.
    const seen = new WeakSet<Element>()
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (!en.isIntersecting || seen.has(en.target)) continue
          seen.add(en.target)
          point(en.target)
        }
      },
      { threshold: 0.35 },
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
