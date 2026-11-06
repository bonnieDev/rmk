import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { floor } from '../../content/floor'
import {
  aerialCam,
  clearGuides,
  computeLayout,
  drawGuides,
  easeInOut,
  easeOut,
  flight,
  focusCam,
  midCam,
  toTransform,
  toWorld,
  type Cam,
  type Layout,
} from './camera'
import { useRoam } from './useRoam'
import './Floor.css'

export interface FloorSheet {
  id: string
  /** catalog number printed on the floor, e.g. "04" */
  num: string
  /** name printed on the floor and read out on landing */
  label: string
  /** live: this sheet is the one in focus, so it can run video and demos */
  render: (live: boolean) => ReactNode
}

interface FloorApi {
  /** Fly to a sheet. Pass the clicked element so the guide starts there. */
  go: (id: string, origin?: Element | null) => void
  /** Pull all the way up */
  overview: () => void
}

const FloorContext = createContext<FloorApi>({ go: () => {}, overview: () => {} })
export const useFloor = () => useContext(FloorContext)

interface FloorProps {
  sheets: FloorSheet[]
  /** A sheet was reached: on load, by a flight, or by back/forward */
  onLand?: (id: string) => void
  /** The visitor pulled all the way up */
  onOverview?: (from: string) => void
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Old and new addresses: #aether-command, #work-aether-command, #about, #resume, #index */
function fromHash(hash: string, ids: string[]): { id: string; anchor?: string } {
  const h = decodeURIComponent(hash.replace(/^#/, ''))
  if (!h) return { id: 'home' }
  if (h === 'index') return { id: 'home', anchor: 'index' }
  if (h === 'resume' || h === 'record') return { id: 'about', anchor: 'resume' }
  const id = h.replace(/^work-/, '')
  return ids.includes(id) ? { id } : { id: 'home' }
}

const hashFor = (id: string) => (id === 'home' ? location.pathname + location.search : `#${id}`)

/**
 * The floor and the camera (docs/FLOOR-CAMERA.md). The site looks flat until
 * the first click; then the camera pulls up, lines up the pick, and dives.
 */
export function Floor({ sheets, onLand, onOverview }: FloorProps) {
  const ids = useMemo(() => sheets.map((s) => s.id), [sheets])
  const [layout, setLayout] = useState<Layout>(() => computeLayout(window.innerWidth, window.innerHeight, ids))
  const [start] = useState(() => fromHash(location.hash, ids))
  const [focusId, setFocusId] = useState<string | null>(start.id)
  const [up, setUp] = useState(false)
  const [flying, setFlying] = useState(false)
  const [announce, setAnnounce] = useState('')
  const [lastId, setLastId] = useState(start.id)

  const floorRef = useRef<HTMLDivElement>(null)
  const worldRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const guidesRef = useRef<SVGSVGElement>(null)
  const layoutRef = useRef(layout)
  const camRef = useRef<Cam>(focusCam(layout.sheets[start.id]))
  const focusRef = useRef<string | null>(start.id)
  const upRef = useRef(false)
  const busyRef = useRef(false)
  /** the roaming glide's frame (useRoam) */
  const momentumRef = useRef(0)
  const stopMomentum = () => cancelAnimationFrame(momentumRef.current)
  /** set while the line-up beat holds: calling it cancels the dive */
  const grabRef = useRef<(() => void) | null>(null)
  /** after a flight, move keyboard focus to the new sheet's heading */
  const landedRef = useRef(false)
  const onLandRef = useRef(onLand)
  const onOverviewRef = useRef(onOverview)
  onLandRef.current = onLand
  onOverviewRef.current = onOverview

  const labelOf = useCallback((id: string) => sheets.find((s) => s.id === id), [sheets])
  const sheetEl = (id: string) => worldRef.current?.querySelector<HTMLElement>(`[data-sheet="${id}"]`)

  const setCam = (c: Cam) => {
    camRef.current = c
    if (worldRef.current) worldRef.current.style.transform = toTransform(c, layoutRef.current)
  }

  const scale = () => (layoutRef.current.narrow ? floor.narrow.timeScale : 1)

  /**
   * The line-up hold. A press anywhere during it cancels the dive: the guides
   * fade, the camera stays put, and the press is already a drag (useRoam).
   * Resolves true if it was grabbed.
   */
  const holdOrGrab = (ms: number) =>
    new Promise<boolean>((resolve) => {
      floorRef.current?.classList.add('is-lineup')
      const done = (grabbed: boolean) => {
        window.clearTimeout(timer)
        grabRef.current = null
        floorRef.current?.classList.remove('is-lineup')
        resolve(grabbed)
      }
      const timer = window.setTimeout(() => done(false), ms)
      grabRef.current = () => {
        // stay up here, synchronously, so the drag can start on this press
        clearGuides(guidesRef.current!)
        upRef.current = true
        busyRef.current = false
        setFlying(false)
        setAnnounce('View from above. Every project is laid out on the floor; choose one to open it.')
        done(true)
      }
    })

  /** Reduced motion: no flight, a short cross-fade straight to the end */
  const fadeTo = async (c: Cam) => {
    const world = worldRef.current!
    await world.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: 'forwards' }).finished
    setCam(c)
    await world.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120 }).finished
    world.getAnimations().forEach((a) => a.cancel())
  }

  const land = useCallback(
    (id: string, history: 'push' | 'none') => {
      const L = layoutRef.current
      setCam(focusCam(L.sheets[id]))
      const scroller = sheetEl(id)?.querySelector<HTMLElement>('.sheet__scroll')
      if (scroller) scroller.scrollTop = 0
      focusRef.current = id
      upRef.current = false
      busyRef.current = false
      landedRef.current = true
      setFocusId(id)
      setLastId(id)
      setUp(false)
      setFlying(false)
      setAnnounce(labelOf(id)?.label ?? '')
      if (history === 'push' && location.hash !== hashFor(id)) {
        try {
          window.history.pushState(null, '', hashFor(id))
        } catch {
          /* file:// and sandboxed frames */
        }
      }
      onLandRef.current?.(id)
    },
    [labelOf],
  )

  const go = useCallback(
    async (toId: string, origin?: Element | null, history: 'push' | 'none' = 'push', quick = false) => {
      if (busyRef.current) return
      const L = layoutRef.current
      const T = L.sheets[toId]
      if (!T) return
      const fromId = focusRef.current
      if (toId === fromId && !upRef.current) return
      busyRef.current = true
      stopMomentum()

      // where the click came from, in world coordinates
      const origin0 = fromId ? L.sheets[fromId] : undefined
      let from = origin0 ? { x: origin0.cx, y: origin0.cy } : { x: camRef.current.cx, y: camRef.current.cy }
      if (origin && origin0 && !upRef.current) from = toWorld(L, origin0, origin.getBoundingClientRect())

      setFlying(true)
      setFocusId(null)
      focusRef.current = null

      if (reducedMotion()) {
        await fadeTo(focusCam(T))
      } else if (upRef.current) {
        // already above: line it up, then dive
        drawGuides(guidesRef.current!, L, from, T, camRef.current.s, `${labelOf(toId)?.num} ${labelOf(toId)?.label}`)
        if (await holdOrGrab(500 * scale())) return
        setUp(false)
        clearGuides(guidesRef.current!)
        await flight(worldRef.current!, L, camRef.current, focusCam(T), floor.timing.dive * scale(), easeInOut)
      } else {
        const mid = midCam(L, from, origin0 ?? T, T)
        setUp(true)
        if (quick) {
          // back / forward: a short hop, no guides
          await flight(worldRef.current!, L, camRef.current, mid, floor.timing.back * 0.45 * scale(), easeOut)
          setCam(mid)
          setUp(false)
          await flight(worldRef.current!, L, mid, focusCam(T), floor.timing.back * 0.55 * scale(), easeInOut)
        } else {
          // 1. pull up: the page was lying on a floor all along
          await flight(worldRef.current!, L, camRef.current, mid, floor.timing.pullUp * scale(), easeOut)
          setCam(mid)
          // 2. the lines line it up
          drawGuides(guidesRef.current!, L, from, T, mid.s, `${labelOf(toId)?.num} ${labelOf(toId)?.label}`)
          if (await holdOrGrab(floor.timing.lineUp * scale())) return
          // 3. dive onto it, turning to match the sheet so it lands flat
          setUp(false)
          clearGuides(guidesRef.current!)
          await flight(worldRef.current!, L, mid, focusCam(T), floor.timing.dive * scale(), easeInOut)
        }
      }
      land(toId, history)
    },
    [land, labelOf],
  )

  const overview = useCallback(async () => {
    if (busyRef.current || upRef.current) return
    busyRef.current = true
    stopMomentum()
    const L = layoutRef.current
    const fromId = focusRef.current ?? 'home'
    const target = aerialCam(L, L.sheets[fromId], reducedMotion())
    setFlying(true)
    setUp(true)
    setFocusId(null)
    focusRef.current = null
    upRef.current = true
    if (reducedMotion()) await fadeTo(target)
    else await flight(worldRef.current!, L, camRef.current, target, floor.timing.aerial * scale(), easeOut)
    setCam(target)
    busyRef.current = false
    setFlying(false)
    setAnnounce('View from above. Every project is laid out on the floor; choose one to open it.')
    onOverviewRef.current?.(fromId)
    // keep the keyboard where it was: on the sheet you came from
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>(`.floor__hit[data-for="${fromId}"]`)?.focus({ preventScroll: true }),
    )
  }, [])

  // first paint: land on the address's sheet with no flight
  useLayoutEffect(() => {
    setCam(focusCam(layoutRef.current.sheets[start.id]))
    if (start.anchor) {
      const el = document.getElementById(start.anchor)
      const scroller = el?.closest<HTMLElement>('.sheet__scroll')
      if (el && scroller) scroller.scrollTop = el.offsetTop - 64
    }
    onLandRef.current?.(start.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // after a flight, the heading of the new sheet takes keyboard focus
  useEffect(() => {
    if (!landedRef.current || !focusId) return
    landedRef.current = false
    sheetEl(focusId)?.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true })
  }, [focusId])

  // resize: new layout, camera snaps to where it was looking
  useEffect(() => {
    const onResize = () => {
      const L = computeLayout(window.innerWidth, window.innerHeight, ids)
      layoutRef.current = L
      setLayout(L)
      if (busyRef.current) return
      setCam(upRef.current ? aerialCam(L, L.sheets[lastId], reducedMotion()) : focusCam(L.sheets[focusRef.current ?? 'home']))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [ids, lastId])

  // back / forward fly between addresses
  useEffect(() => {
    const onPop = () => {
      const { id } = fromHash(location.hash, ids)
      go(id, null, 'none', true)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [go, ids])

  // Esc: home ↔ view from above
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || busyRef.current) return
      if (upRef.current) go(lastId === 'home' ? 'home' : lastId, null)
      else overview()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, overview, lastId])

  // drag, fling, zoom and tap, once the floor is revealed
  useRoam({
    floorRef,
    momentum: momentumRef,
    camRef,
    layoutRef,
    setCam,
    canRoam: () => upRef.current && !busyRef.current,
    grabLineUp: () => {
      if (!grabRef.current) return false
      grabRef.current()
      return true
    },
    onTap: (id) => void go(id),
  })

  const api = useMemo<FloorApi>(() => ({ go: (id, origin) => void go(id, origin), overview: () => void overview() }), [go, overview])
  const L = layout
  const resting = up && !flying
  const last = labelOf(lastId)

  return (
    <FloorContext.Provider value={api}>
      <div
        ref={floorRef}
        className={['floor', up ? 'is-up' : '', flying ? 'is-flying' : ''].filter(Boolean).join(' ')}
        style={{ '--floor-perspective': `${floor.camera.perspective}px` } as CSSProperties}
      >
        <div
          className="floor__stage"
          ref={stageRef}
          // the stage never scrolls; focus moves can try to, so undo it
          onScroll={(e) => {
            e.currentTarget.scrollTop = 0
            e.currentTarget.scrollLeft = 0
          }}
        >
          <div
            className="floor__world"
            ref={worldRef}
            style={
              {
                width: L.worldW,
                height: L.worldH,
                '--floor-cell': `${L.W / 8}px`,
                // reads about 10px on screen from all the way up
                '--floor-tag': `${Math.round(10 / aerialCam(L, undefined, true).s)}px`,
              } as CSSProperties
            }
          >
            <div className="floor__grid" aria-hidden="true" />
            {sheets.map((s) => {
              const p = L.sheets[s.id]
              if (!p) return null
              const focused = s.id === focusId
              const place = { left: p.x, top: p.y, width: L.W, height: L.H, transform: `rotate(${p.r}deg)` }
              return (
                <Fragment key={s.id}>
                  <article
                    className={`sheet${focused ? ' is-focus' : ''}`}
                    data-sheet={s.id}
                    inert={!focused}
                    aria-hidden={focused ? undefined : true}
                    style={place}
                  >
                    <div className="sheet__scroll">{s.render(focused)}</div>
                  </article>
                  <p
                    className="floor__tag"
                    aria-hidden="true"
                    style={{ left: p.x, top: p.y + L.H * 1.05, transform: `rotate(${p.r}deg)` }}
                  >
                    <b>{s.id === 'home' ? '00' : s.num}</b>
                    {s.id === 'home' ? 'Index · you were here' : s.label}
                  </p>
                  {resting ? (
                    <button
                      type="button"
                      className="floor__hit"
                      data-for={s.id}
                      aria-label={`Open ${s.id === 'home' ? 'the index' : s.label}`}
                      style={place}
                      onClick={() => void go(s.id)}
                    />
                  ) : null}
                </Fragment>
              )
            })}
            <svg
              className="floor__guides"
              ref={guidesRef}
              width={L.worldW}
              height={L.worldH}
              viewBox={`0 0 ${L.worldW} ${L.worldH}`}
              aria-hidden="true"
            />
          </div>
        </div>

        <p className="floor__hint" aria-hidden="true">
          You were looking down the whole time · <em>drag to look around</em> · click a sheet to land
        </p>
        <div className="floor__hud" role="group" aria-label="View from above" inert={!resting}>
          <button type="button" className="pill" onClick={() => void go('home')}>
            <span className="floor__dot" aria-hidden="true" /> Index
          </button>
          {last && lastId !== 'home' ? (
            <button type="button" className="pill pill--amber" onClick={() => void go(lastId)}>
              Back to {last.label}
            </button>
          ) : null}
        </div>
        <p className="visually-hidden" aria-live="polite">
          {announce}
        </p>
      </div>
    </FloorContext.Provider>
  )
}
