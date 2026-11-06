/**
 * Camera math for the floor. The world is one element with transform-origin
 * 0 0; the camera is a transform on it. See docs/FLOOR-CAMERA.md §5.
 */
import { floor } from '../../content/floor'

/** world-space center, scale, z-rotation°, x-tilt° */
export interface Cam {
  cx: number
  cy: number
  s: number
  rz: number
  tilt: number
}

export interface Placed {
  id: string
  x: number
  y: number
  cx: number
  cy: number
  r: number
}

export interface Layout {
  W: number
  H: number
  narrow: boolean
  worldW: number
  worldH: number
  sheets: Record<string, Placed>
  center: { cx: number; cy: number }
  /** visible span of all sheets, for the aerial fit */
  spanW: number
  spanH: number
}

/**
 * Where every sheet lies for this viewport. Wide screens use the grid in
 * floor.ts; narrow ones stack the sheets in `order` in one column.
 */
export function computeLayout(W: number, H: number, order: string[]): Layout {
  const narrow = W < floor.narrow.maxWidth
  const GX = W * floor.grid.gapX
  const GY = H * floor.grid.gapY
  const spots = narrow
    ? order.map((id, i) => ({
        id,
        col: 0,
        row: i,
        rotation: id === 'home' ? 0 : (i % 2 ? 1 : -1) * floor.narrow.rotation,
      }))
    : floor.sheets.filter((s) => order.includes(s.id))
  const cols = narrow ? 1 : floor.grid.cols
  const rows = narrow ? order.length : floor.grid.rows
  // a margin wide enough that the floor never shows an edge
  const M = Math.max(W, H) * 2.2
  const spanW = cols * W + (cols - 1) * GX
  const spanH = rows * H + (rows - 1) * GY
  const sheets: Record<string, Placed> = {}
  for (const s of spots) {
    const x = M + s.col * (W + GX)
    const y = M + s.row * (H + GY)
    sheets[s.id] = { id: s.id, x, y, cx: x + W / 2, cy: y + H / 2, r: s.rotation }
  }
  return {
    W,
    H,
    narrow,
    worldW: spanW + 2 * M,
    worldH: spanH + 2 * M,
    sheets,
    center: { cx: M + spanW / 2, cy: M + spanH / 2 },
    spanW,
    spanH,
  }
}

export const toTransform = (c: Cam, L: Layout) =>
  `translate(${L.W / 2}px,${L.H / 2}px) rotateX(${c.tilt}deg) scale(${c.s}) rotate(${-c.rz}deg) translate(${-c.cx}px,${-c.cy}px)`

export const focusCam = (p: Placed): Cam => ({ cx: p.cx, cy: p.cy, s: 1, rz: p.r, tilt: 0 })

/** All the way up: every sheet in view. Narrow screens see the neighbors. */
export function aerialCam(L: Layout, around: Placed | undefined, flat: boolean): Cam {
  const tilt = flat ? 0 : L.narrow ? floor.narrow.tilt : floor.camera.aerialTilt
  if (L.narrow) {
    const p = around ?? L.sheets.home
    const s = Math.min(1 / 1.5, L.H / (3 * L.H + 2 * L.H * floor.grid.gapY)) * 0.9
    return { cx: p.cx, cy: p.cy, s, rz: 0, tilt }
  }
  const s = Math.min(L.W / L.spanW, L.H / L.spanH) * 0.86
  return { cx: L.center.cx, cy: L.center.cy, s, rz: 0, tilt }
}

/** The pull-up: both the clicked row and the target in frame */
export function midCam(L: Layout, from: { x: number; y: number }, origin: Placed, target: Placed): Cam {
  const span = Math.max(
    Math.abs(target.cx - origin.cx) + L.W * 1.5,
    (Math.abs(target.cy - origin.cy) + L.H * 1.5) * (L.W / L.H),
  )
  return {
    cx: (target.cx + from.x) / 2,
    cy: (target.cy + from.y) / 2,
    s: Math.min(0.42, (L.W / span) * 0.9),
    rz: 0,
    tilt: L.narrow ? floor.narrow.tilt : floor.camera.pullTilt,
  }
}

/** A point on a focused sheet (from getBoundingClientRect) in world space */
export function toWorld(L: Layout, sheet: Placed, rect: DOMRect) {
  const lx = rect.left + rect.width / 2 - L.W / 2
  const ly = rect.top + rect.height / 2 - L.H / 2
  const a = (sheet.r * Math.PI) / 180
  return {
    x: sheet.cx + lx * Math.cos(a) - ly * Math.sin(a),
    y: sheet.cy + lx * Math.sin(a) + ly * Math.cos(a),
  }
}

export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/**
 * Fly the camera from A to B. Sampled into keyframes, not CSS-tweened:
 * scale moves in log space, which is what makes the zoom feel physical.
 */
export function flight(
  world: HTMLElement,
  L: Layout,
  A: Cam,
  B: Cam,
  ms: number,
  easing: (t: number) => number = easeInOut,
): Promise<void> {
  const N = 48
  const frames: Keyframe[] = []
  for (let i = 0; i <= N; i++) {
    const t = easing(i / N)
    const s = Math.exp(lerp(Math.log(A.s), Math.log(B.s), t))
    frames.push({
      transform: toTransform(
        { cx: lerp(A.cx, B.cx, t), cy: lerp(A.cy, B.cy, t), s, rz: lerp(A.rz, B.rz, t), tilt: lerp(A.tilt, B.tilt, t) },
        L,
      ),
    })
  }
  const anim = world.animate(frames, { duration: ms, easing: 'linear', fill: 'forwards' })
  return anim.finished
    .catch(() => undefined)
    .then(() => {
      world.style.transform = toTransform(B, L)
      anim.cancel()
    })
}

const SVG = 'http://www.w3.org/2000/svg'

/**
 * The line-up: an elbow from where you clicked to the target's center, the
 * target's edges extended like a drafting table, and a distance readout.
 */
export function drawGuides(
  svg: SVGSVGElement,
  L: Layout,
  from: { x: number; y: number },
  T: Placed,
  s: number,
  label: string,
) {
  svg.replaceChildren()
  const sw = 1.6 / s
  svg.style.setProperty('--dash', `${10 / s} ${8 / s}`)
  const mk = (name: string, attrs: Record<string, string | number>) => {
    const el = document.createElementNS(SVG, name)
    for (const k in attrs) el.setAttribute(k, String(attrs[k]))
    svg.appendChild(el)
    return el
  }
  const { W, H } = L
  const edges = [
    [T.x - W * 0.4, T.y, T.x + W * 1.4, T.y],
    [T.x - W * 0.4, T.y + H, T.x + W * 1.4, T.y + H],
    [T.x, T.y - H * 0.4, T.x, T.y + H * 1.4],
    [T.x + W, T.y - H * 0.4, T.x + W, T.y + H * 1.4],
  ].map(([x1, y1, x2, y2]) => mk('line', { x1, y1, x2, y2, class: 'ext', 'stroke-width': sw }))
  const midX = from.x + (T.cx - from.x) * 0.5
  const path = mk('path', {
    d: `M${from.x} ${from.y} H${midX} V${T.cy} H${T.cx}`,
    'stroke-width': sw * 1.6,
    pathLength: 1,
    'stroke-dasharray': '1 1',
    'stroke-dashoffset': 1,
  })
  mk('circle', { cx: from.x, cy: from.y, r: 5 / s })
  const end = mk('circle', { cx: T.cx, cy: T.cy, r: 9 / s, opacity: 0 })
  const dist = (Math.hypot(T.cx - from.x, T.cy - from.y) / W) * 1.2
  const text = mk('text', { x: midX + 12 / s, y: (from.y + T.cy) / 2, 'font-size': 12 / s, opacity: 0 })
  text.textContent = `→ ${dist.toFixed(2)} m · ${label}`.toUpperCase()
  edges.forEach((e, i) => e.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, delay: i * 60, fill: 'forwards' }))
  path.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], {
    duration: 650,
    easing: 'cubic-bezier(.6,0,.3,1)',
    fill: 'forwards',
  })
  text.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 400, fill: 'forwards' })
  end.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 600, fill: 'forwards' })
}

export function clearGuides(svg: SVGSVGElement) {
  for (const el of Array.from(svg.children)) {
    el.animate([{ opacity: getComputedStyle(el).opacity }, { opacity: 0 }], { duration: 400, fill: 'forwards' })
  }
  window.setTimeout(() => svg.replaceChildren(), 420)
}

export const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms))
