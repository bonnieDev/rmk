import { useId } from 'react'
import type { Project } from '../../data/projects'
import { useFloor } from '../Floor'
import { ProjectMedia, fullTitleOf, hasMedia, posterOf } from '../ProjectMedia'
import { SheetMast } from '../SheetMast'
import './ProjectSheet.css'

interface ProjectSheetProps {
  project: Project
  /** catalog number, e.g. "04" */
  num: string
  next: Project
  /** in focus: video and demos run; otherwise a still stands in */
  live: boolean
}

/**
 * One project, as its own page on the floor: title, the work, the brief.
 * Video and demos only run on the sheet in focus, so nothing plays (or
 * makes sound) on a sheet you've left.
 */
export function ProjectSheet({ project, num, next, live }: ProjectSheetProps) {
  const { go } = useFloor()
  const titleId = useId()
  const poster = posterOf(project)
  const title = fullTitleOf(project)

  return (
    <div className="psheet-page" id={`work-${project.id}`} data-section={title}>
      <SheetMast
        meta={
          <>
            {num} / {project.category}
          </>
        }
      />

      <section className="psheet" aria-labelledby={titleId}>
        <p className="psheet__kicker">
          <b>{num}</b>
          <span>{project.category}</span>
          <span className="psheet__status">
            <span className={`psheet__pip${project.status.live ? ' is-live' : ''}`} aria-hidden="true" />
            {project.status.label}
          </span>
        </p>
        <h1 className="psheet__title" id={titleId} tabIndex={-1}>
          {project.title}
          {project.titleEm ? (
            <>
              {' '}
              <em>{project.titleEm}</em>
            </>
          ) : null}
        </h1>
        <p className="psheet__tag">{project.tagline}</p>

        {hasMedia(project) ? (
          <div className="psheet__media">
            {live ? (
              <ProjectMedia project={project} />
            ) : poster ? (
              <img className="psheet__poster" src={poster} alt="" loading="lazy" decoding="async" />
            ) : (
              <div className="psheet__poster psheet__poster--type" aria-hidden="true">
                <span>{project.title}</span>
              </div>
            )}
          </div>
        ) : null}

        <dl className="psheet__brief">
          <div>
            <dt>Problem</dt>
            <dd>{project.brief.problem}</dd>
          </div>
          <div>
            <dt>Build</dt>
            <dd>{project.brief.pipeline}</dd>
          </div>
          <div>
            <dt>Milestone</dt>
            <dd>{project.brief.milestone}</dd>
          </div>
        </dl>

        <dl className="psheet__spec">
          <div>
            <dt>Role</dt>
            <dd>{project.role}</dd>
          </div>
          <div>
            <dt>Pipeline</dt>
            <dd>
              <ul className="psheet__chain">
                {project.pipeline.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </dd>
          </div>
          {project.site ? (
            <div>
              <dt>Visit</dt>
              <dd>
                <a className="psheet__site" href={project.site.href} target="_blank" rel="noopener noreferrer">
                  {project.site.label}
                  <span aria-hidden="true"> ↗</span>
                  <span className="visually-hidden"> (opens in a new tab)</span>
                </a>
              </dd>
            </div>
          ) : null}
        </dl>

        <nav className="psheet__nav" aria-label="Next">
          <button type="button" className="pill" onClick={(e) => go('home', e.currentTarget)}>
            <span aria-hidden="true">← </span>Index
          </button>
          <button type="button" className="pill pill--amber" onClick={(e) => go(next.id, e.currentTarget)}>
            Next: {fullTitleOf(next)}
            <span aria-hidden="true"> →</span>
          </button>
        </nav>
      </section>
    </div>
  )
}
