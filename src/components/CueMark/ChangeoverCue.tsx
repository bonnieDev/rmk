import { useEffect, useRef, useState } from 'react'
import CueMark from './CueMark'

/**
 * The cue in its original job: upper-right of the frame, for a moment, when a
 * reel is about to change.
 *
 * Here a "reel" is a section. Crossing from INDEX into ABOUT is the changeover,
 * so the mark appears in the corner of the viewport, holds, and goes. It is the
 * only placement that is literally the film reference, and it works because it
 * is the only one that is *temporary* — a cue that stayed on screen would just
 * be a badge.
 */
const HOLD_MS = 1500

export default function ChangeoverCue() {
  const [shown, setShown] = useState(false)
  const current = useRef<string | null>(null)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll('section[id]'))
    if (!sections.length) return undefined

    const io = new IntersectionObserver(
      (entries) => {
        const arriving = entries.find((e) => e.isIntersecting)
        if (!arriving) return
        const id = arriving.target.id
        if (id === current.current) return

        // The first section to resolve is arrival, not a changeover.
        const isFirstResolve = current.current === null
        current.current = id
        if (isFirstResolve) return

        setShown(true)
        if (timer.current != null) window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => setShown(false), HOLD_MS)
      },
      /*
       * A reading line across the middle of the viewport, not an area ratio.
       * intersectionRatio is measured against the TARGET, so a section taller
       * than the screen can never reach a 0.3 threshold — the catalog is
       * thousands of pixels tall and its ratio peaks around 0.2, so a
       * ratio-based observer simply never fired. Collapsing the root to a thin
       * band means exactly one section straddles it at any moment.
       */
      { rootMargin: '-50% 0px -49% 0px', threshold: 0 },
    )
    sections.forEach((s) => io.observe(s))

    return () => {
      io.disconnect()
      if (timer.current != null) window.clearTimeout(timer.current)
    }
  }, [])

  return (
    <div className={['cue-changeover', shown && 'is-cued'].filter(Boolean).join(' ')}>
      <CueMark />
    </div>
  )
}
