import { showcase } from '../../content/showcase'
import { projects, type Project } from '../../data/projects'
import { fullTitleOf } from '../ProjectMedia'
import './Showcase.css'

interface ShowcaseProps {
  /** Starts the same flight an index row does, from the tile that was clicked */
  onPick: (id: string, from: HTMLElement) => void
  onHover?: (p: Project | null) => void
}

/**
 * Big pictures of the work in Home's first view. Each tile is a real button
 * named by its visible caption; the picture itself is decorative here (the
 * project's sheet carries the full description).
 */
export function Showcase({ onPick, onHover }: ShowcaseProps) {
  const tiles = showcase
    .map((t) => ({ ...t, project: projects.find((p) => p.id === t.id) }))
    .filter((t): t is typeof t & { project: Project } => Boolean(t.project))

  return (
    <nav className="showcase" aria-label="Featured work">
      <ul className="showcase__grid">
        {tiles.map((t, i) => (
          <li key={t.id} className={i === 0 ? 'showcase__item showcase__item--lead' : 'showcase__item'}>
            <button
              type="button"
              className="showcase__tile"
              onClick={(e) => onPick(t.id, e.currentTarget)}
              onMouseEnter={() => onHover?.(t.project)}
              onMouseLeave={() => onHover?.(null)}
              onFocus={() => onHover?.(t.project)}
              onBlur={() => onHover?.(null)}
            >
              <img
                src={t.src}
                alt=""
                aria-hidden="true"
                style={t.focus ? { objectPosition: t.focus } : undefined}
                loading="eager"
                decoding="async"
                fetchPriority={i === 0 ? 'high' : 'auto'}
              />
              <span className="showcase__caption">
                <span className="showcase__name">{fullTitleOf(t.project)}</span>
                {i === 0 ? <span className="showcase__what">{t.project.what}</span> : null}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
