/**
 * Roaming the floor (docs/FLOOR-CAMERA.md §3.5): once it's revealed, the
 * floor can be dragged, flung, zoomed and tapped. The reveal is the
 * surprise; roaming is the reward.
 */
import { useEffect, useRef, type RefObject } from 'react'
import { floor } from '../../content/floor'
import type { Cam, Layout } from './camera'

interface RoamOptions {
  floorRef: RefObject<HTMLDivElement | null>
  camRef: RefObject<Cam>
  layoutRef: RefObject<Layout>
  setCam: (c: Cam) => void
  /** resting in the view from above */
  canRoam: () => boolean
  /** if the line-up beat is running, cancel the dive and stay; true if it did */
  grabLineUp: () => boolean
  /** a tap landed on this sheet */
  onTap: (id: string) => void
  /** the running glide's frame, so a flight can stop it */
  momentum: RefObject<number>
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const rad = (d: number) => (d * Math.PI) / 180

/** A distance on screen as a distance on the floor, for this camera */
function screenToWorld(dx: number, dy: number, c: Cam) {
  const ux = dx / c.s
  const uy = dy / (c.s * Math.cos(rad(c.tilt)))
  const a = rad(c.rz)
  return { x: ux * Math.cos(a) - uy * Math.sin(a), y: ux * Math.sin(a) + uy * Math.cos(a) }
}

/** Keep the camera on the grid (plus a little of a gap) and in zoom range */
function clampCam(c: Cam, L: Layout): Cam {
  const placed = Object.values(L.sheets)
  const mx = L.W * floor.grid.gapX * floor.roam.panMarginOfGap
  const my = L.H * floor.grid.gapY * floor.roam.panMarginOfGap
  const x0 = Math.min(...placed.map((p) => p.x)) - mx
  const x1 = Math.max(...placed.map((p) => p.x + L.W)) + mx
  const y0 = Math.min(...placed.map((p) => p.y)) - my
  const y1 = Math.max(...placed.map((p) => p.y + L.H)) + my
  const fit = Math.min(L.W / L.spanW, L.H / L.spanH)
  return {
    ...c,
    s: clamp(c.s, fit * floor.roam.minZoomOfFit, floor.roam.maxZoom),
    cx: clamp(c.cx, x0, x1),
    cy: clamp(c.cy, y0, y1),
  }
}

export function useRoam(o: RoamOptions) {
  const opts = useRef(o)
  opts.current = o
  const momentum = o.momentum

  useEffect(() => {
    const O = () => opts.current
    const cam = () => O().camRef.current
    const L = () => O().layoutRef.current
    const move = (c: Cam) => O().setCam(clampCam(c, L()))

    const pan = (dx: number, dy: number) => {
      const c = cam()
      const d = screenToWorld(dx, dy, c)
      move({ ...c, cx: c.cx - d.x, cy: c.cy - d.y })
    }

    /** zoom by f, keeping the floor point under (mx, my) where it is */
    const zoomAt = (f: number, mx: number, my: number) => {
      const c = cam()
      const ox = mx - L().W / 2
      const oy = my - L().H / 2
      const before = screenToWorld(ox, oy, c)
      const s = clampCam({ ...c, s: c.s * f }, L()).s
      const after = screenToWorld(ox, oy, { ...c, s })
      move({ ...c, s, cx: c.cx + before.x - after.x, cy: c.cy + before.y - after.y })
    }

    const stopMomentum = () => cancelAnimationFrame(momentum.current)

    /** the sheet under a point: its button from above, else by position */
    const sheetAt = (x: number, y: number): string | null => {
      for (const el of document.elementsFromPoint(x, y)) {
        const id = (el as HTMLElement).dataset?.for ?? (el as HTMLElement).dataset?.sheet
        if (id) return id
      }
      const c = cam()
      const d = screenToWorld(x - L().W / 2, y - L().H / 2, c)
      const px = c.cx + d.x
      const py = c.cy + d.y
      const hit = Object.values(L().sheets).find(
        (p) => px >= p.x && px <= p.x + L().W && py >= p.y && py <= p.y + L().H,
      )
      return hit?.id ?? null
    }

    const pointers = new Map<number, { x: number; y: number }>()
    let start = { x: 0, y: 0 }
    let moved = false
    let lastT = 0
    let v = { x: 0, y: 0 }
    let pinch = 0
    let suppressClick = false
    /*
     * Landing needs a distinct click: quick, still, and starting and ending
     * on the same sheet. A press that stops a glide, grabs the line-up, or
     * comes right after a drag only stops the floor; it never lands.
     */
    let gliding = false
    let lastDragEnd = -Infinity
    let downT = 0
    let downSheet: string | null = null
    let noTap = false

    const dragging = (on: boolean) => O().floorRef.current?.classList.toggle('is-dragging', on)

    const spread = () => {
      const [a, b] = [...pointers.values()]
      return { d: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    }

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      if ((e.target as Element | null)?.closest?.('.floor__hud')) return
      // grabbing during the line-up keeps you up here, already dragging
      const grabbed = O().grabLineUp()
      if (!grabbed && !O().canRoam()) return
      const now = performance.now()
      if (pointers.size === 0) {
        noTap = grabbed || gliding || now - lastDragEnd < floor.roam.settleMs
        downT = now
        downSheet = sheetAt(e.clientX, e.clientY)
      }
      stopMomentum()
      gliding = false
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      try {
        O().floorRef.current?.setPointerCapture(e.pointerId)
      } catch {
        /* the pointer may already be gone */
      }
      if (pointers.size === 1) {
        start = { x: e.clientX, y: e.clientY }
        moved = false
        lastT = performance.now()
        v = { x: 0, y: 0 }
      } else if (pointers.size === 2) {
        moved = true
        pinch = spread().d
      }
    }

    const onMove = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId)
      if (!prev) return
      if (pointers.size === 1) {
        const dx = e.clientX - prev.x
        const dy = e.clientY - prev.y
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
        if (!moved && Math.hypot(e.clientX - start.x, e.clientY - start.y) < floor.roam.tapSlopPx) return
        if (!moved) dragging(true)
        moved = true
        pan(dx, dy)
        // velocity in px per 60fps frame, smoothed over the last few moves
        const now = performance.now()
        const k = 16.67 / Math.max(1, now - lastT)
        lastT = now
        v = { x: v.x * 0.6 + dx * k * 0.4, y: v.y * 0.6 + dy * k * 0.4 }
      } else if (pointers.size === 2) {
        const before = spread()
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
        const after = spread()
        pan(after.x - before.x, after.y - before.y)
        if (pinch > 0) zoomAt(after.d / pinch, after.x, after.y)
        pinch = after.d
      }
    }

    const onUp = (e: PointerEvent) => {
      if (!pointers.delete(e.pointerId)) return
      if (pointers.size === 1) {
        // a pinch became a drag: carry on from the finger that's left
        const [p] = [...pointers.values()]
        start = p
        v = { x: 0, y: 0 }
        lastT = performance.now()
        return
      }
      if (pointers.size) return
      dragging(false)
      if (moved) lastDragEnd = performance.now()
      suppressClick = true
      // only the click that belongs to this press is swallowed
      window.setTimeout(() => (suppressClick = false), 80)
      if (!moved) {
        const quick = performance.now() - downT <= floor.roam.tapMaxMs
        if (e.type === 'pointerup' && !noTap && quick) {
          const id = sheetAt(e.clientX, e.clientY)
          if (id && id === downSheet) O().onTap(id)
        }
        return
      }
      // a fling keeps gliding, then settles
      if (reducedMotion() || performance.now() - lastT > 80) return
      const glide = () => {
        gliding = O().canRoam() && Math.hypot(v.x, v.y) >= 0.2
        if (!gliding) return
        pan(v.x, v.y)
        v = { x: v.x * floor.roam.momentumDecay, y: v.y * floor.roam.momentumDecay }
        momentum.current = requestAnimationFrame(glide)
      }
      momentum.current = requestAnimationFrame(glide)
    }

    // a drag never clicks anything; a tap is handled above
    const onClick = (e: MouseEvent) => {
      if (!suppressClick) return
      suppressClick = false
      e.preventDefault()
      e.stopPropagation()
    }

    // wheel zooms; a trackpad pinch arrives as a wheel with ctrlKey
    const onWheel = (e: WheelEvent) => {
      if (!O().canRoam()) return
      e.preventDefault()
      stopMomentum()
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY
      zoomAt(Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0015)), e.clientX, e.clientY)
    }

    // Safari sends a trackpad pinch as gesture events instead
    let gestureScale = 1
    type GestureEvent = UIEvent & { scale: number; clientX: number; clientY: number }
    const onGestureStart = (e: Event) => {
      if (!O().canRoam()) return
      e.preventDefault()
      gestureScale = 1
    }
    const onGestureChange = (e: Event) => {
      // on touch screens the pointer pinch already handles it
      if (!O().canRoam() || pointers.size > 1) return
      e.preventDefault()
      const g = e as GestureEvent
      zoomAt(g.scale / gestureScale, g.clientX, g.clientY)
      gestureScale = g.scale
    }

    window.addEventListener('pointerdown', onDown, true)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    window.addEventListener('click', onClick, true)
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('gesturestart', onGestureStart)
    window.addEventListener('gesturechange', onGestureChange)
    return () => {
      stopMomentum()
      window.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      window.removeEventListener('click', onClick, true)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('gesturestart', onGestureStart)
      window.removeEventListener('gesturechange', onGestureChange)
    }
  }, [momentum])
}
