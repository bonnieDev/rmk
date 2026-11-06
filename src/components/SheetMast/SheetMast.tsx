import type { ReactNode } from 'react'
import { useFloor } from '../Floor'
import './SheetMast.css'

interface SheetMastProps {
  /** Left side; defaults to the way home */
  left?: ReactNode
  /** Middle; defaults to "View from above" */
  nav?: ReactNode
  /** Right side: a quiet line of metadata */
  meta: ReactNode
}

/** The bar across the top of every sheet: hairline, glass, no pill. */
export function SheetMast({ left, nav, meta }: SheetMastProps) {
  const { go, overview } = useFloor()
  return (
    <header className="masthead">
      <div className="masthead__left">
        {left ?? (
          <button type="button" className="masthead__word" onClick={(e) => go('home', e.currentTarget)}>
            <span aria-hidden="true">← </span>rmk.systems
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
