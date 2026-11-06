import type { ReactNode } from 'react'
import { useFloor } from '../Floor'
import { GenerativeRMKLogo } from '../GenerativeRMKLogo'
import './SheetMast.css'

interface SheetMastProps {
  /** Left side; defaults to the way home */
  left?: ReactNode
  /** Middle; defaults to "View from above" */
  nav?: ReactNode
  /** Right side: a quiet line of metadata */
  meta: ReactNode
  /** the sheet is in focus, so the mark can animate */
  live?: boolean
}

/** The chunky mark that sits in every masthead */
export function MastMark({ live = true }: { live?: boolean }) {
  return (
    <span className="masthead__mark">
      <GenerativeRMKLogo seed="rmk" compact hideTicker decorative paused={!live} className="rmk-logo--heavy" />
    </span>
  )
}

/** The bar across the top of every sheet: hairline, glass, no pill. */
export function SheetMast({ left, nav, meta, live = true }: SheetMastProps) {
  const { back, backLabel, overview } = useFloor()
  return (
    <header className="masthead">
      <div className="masthead__left">
        {left ?? (
          // the mark stays on and says plainly where it goes
          <button type="button" className="masthead__back" onClick={(e) => back(e.currentTarget)}>
            <MastMark live={live} />
            <span className="masthead__back-label">
              <span aria-hidden="true">← </span>Back <span className="masthead__back-to">to {backLabel}</span>
            </span>
          </button>
        )}
      </div>
      <nav className="masthead__nav" aria-label="Primary">
        {nav ?? (
          <button type="button" onClick={overview}>
            View from above
          </button>
        )}
      </nav>
      <p className="masthead__state">{meta}</p>
    </header>
  )
}
