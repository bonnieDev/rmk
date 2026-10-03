import { useId, useState, type FocusEvent } from 'react'
import type { Project } from '../../data/projects'
import { CueMark } from '../CueMark'
import { StreamVideo } from './StreamVideo'
import { track } from '../../analytics'
import './ProjectEntry.css'

interface ProjectEntryProps {
  project: Project
  index: number
  open: boolean
  active?: boolean
  onToggle: (id: string) => void
  onHoverStart?: (project: Project) => void
  onHoverEnd?: () => void
}

/**
 * One indexed row in the catalog.
 * The bar is always readable; the brief expands inline — no modal, no dead end.
 */
export function ProjectEntry({
  project,
  index,
  open,
  active = false,
  onToggle,
  onHoverStart,
  onHoverEnd,
}: ProjectEntryProps) {
  const n = String(index + 1).padStart(2, '0')
  const drawerId = useId()
  const titleId = useId()
  const fullTitle = `${project.title}${project.titleEm ? ` ${project.titleEm}` : ''}`
  const stills = project.stills ?? []
  const [stillIndex, setStillIndex] = useState(0)
  const still = stills[stillIndex]
  const hasMedia = Boolean(project.videoEmbed || project.demoEmbed || project.cover || stills.length)

  return (
    <article
      id={`work-${project.id}`}
      className={[
        'entry',
        `entry--${project.status.accent}`,
        active ? 'is-active' : '',
        open ? 'is-open' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-labelledby={titleId}
      onMouseEnter={() => onHoverStart?.(project)}
      onMouseLeave={() => onHoverEnd?.()}
      onFocusCapture={() => onHoverStart?.(project)}
      onBlurCapture={(e: FocusEvent<HTMLElement>) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          onHoverEnd?.()
        }
      }}
    >
      <div className="entry__bar">
        {/* --- Index column: catalog number, class, year --- */}
        <div className="entry__id">
          <p className="entry__num">
            {n}
            <span aria-hidden="true"> / </span>
            <span className="entry__cat">{project.category}</span>
          </p>
          <time className="entry__year" dateTime={project.year}>
            {project.year}
          </time>
        </div>

        {/* --- Subject column: title + tagline + control --- */}
        <div className="entry__subject">
          <h3 className="entry__title" id={titleId}>
            {project.title}
            {project.titleEm ? (
              <>
                {' '}
                <em>{project.titleEm}</em>
              </>
            ) : null}
            {/* Marks the frame under the pointer. Only ever one at a time,
                because only one entry is hovered. */}
            <CueMark className="cue--entry" />
          </h3>
          <p className="entry__tagline">{project.tagline}</p>

          <button
            type="button"
            className="entry__toggle"
            aria-expanded={open}
            aria-controls={drawerId}
            onClick={() => {
              if (!open) {
                track('project_open', { project: fullTitle, position: index + 1 })
              }
              onToggle(project.id)
            }}
          >
            <span className="entry__toggle-glyph" aria-hidden="true">
              {open ? '−' : '+'}
            </span>
            <span className="entry__toggle-label">
              {open ? 'Close brief' : 'Technical brief'}
            </span>
          </button>
        </div>

        {/* --- Specification column --- */}
        <dl className="entry__meta">
          <div className="entry__meta-row">
            <dt>Role</dt>
            <dd>{project.role}</dd>
          </div>
          <div className="entry__meta-row">
            <dt>Pipeline</dt>
            <dd>
              <ul className="entry__chain">
                {project.pipeline.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </dd>
          </div>
          <div className="entry__meta-row">
            <dt>Status</dt>
            <dd>
              <span className="entry__status">
                <span
                  className={`entry__pip${project.status.live ? ' is-live' : ''}`}
                  aria-hidden="true"
                />
                {project.status.label}
              </span>
            </dd>
          </div>
        </dl>
      </div>

      {/* --- Inline drawer: the micro-case-brief. Always addressable, empty when closed. --- */}
      <div className="entry__drawer" id={drawerId} role="region" aria-labelledby={titleId}>
        {open ? (
          <div className="entry__drawer-inner">
            {hasMedia ? (
              <figure className="entry__media">
                {project.videoEmbed ? (
                  <StreamVideo
                    src={project.videoEmbed}
                    title={`${fullTitle} — motion sample`}
                    sound={project.videoSound}
                    poster={project.videoPoster}
                  />
                ) : project.demoEmbed ? (
                  <iframe
                    className="entry__frame"
                    src={project.demoEmbed}
                    title={`${fullTitle} — live demo`}
                    loading="lazy"
                  />
                ) : still ? (
                  <img
                    className="entry__cover entry__cover--still"
                    src={still.src}
                    alt={still.alt}
                    decoding="async"
                  />
                ) : project.cover ? (
                  <img
                    className="entry__cover"
                    src={project.cover}
                    alt={`${fullTitle} — still from the series`}
                    loading="lazy"
                    decoding="async"
                  />
                ) : null}
                {!project.videoEmbed && !project.demoEmbed && stills.length > 1 ? (
                  <div className="entry__stills" role="group" aria-label={`${fullTitle} stills`}>
                    {stills.map((s, i) => (
                      <button
                        key={s.src}
                        type="button"
                        className="entry__still-thumb"
                        aria-pressed={i === stillIndex}
                        aria-label={`Show still ${i + 1}: ${s.caption}`}
                        onClick={() => setStillIndex(i)}
                      >
                        <img src={s.src} alt="" loading="lazy" decoding="async" />
                      </button>
                    ))}
                  </div>
                ) : null}
                <figcaption className={`entry__media-cap${stills.length > 1 && !project.videoEmbed && !project.demoEmbed ? ' entry__media-cap--top' : ''}`}>
                  {project.videoEmbed
                    ? `Motion sample${project.videoCredit ? ` · ${project.videoCredit}` : ''}`
                    : project.demoEmbed
                      ? 'Live demo · running'
                      : still
                        ? `Still ${stillIndex + 1}/${stills.length} · ${still.caption}`
                        : 'Still'}
                </figcaption>
              </figure>
            ) : null}

            <dl className={`entry__brief${hasMedia ? '' : ' entry__brief--wide'}`}>
              <div className="entry__brief-row">
                <dt>Problem</dt>
                <dd>{project.brief.problem}</dd>
              </div>
              <div className="entry__brief-row">
                <dt>Build</dt>
                <dd>{project.brief.pipeline}</dd>
              </div>
              <div className="entry__brief-row">
                <dt>Milestone</dt>
                <dd>{project.brief.milestone}</dd>
              </div>
              {project.site ? (
                <div className="entry__brief-row">
                  <dt>Visit</dt>
                  <dd>
                    <a className="entry__site" href={project.site.href} target="_blank" rel="noopener noreferrer">
                      {project.site.label}
                      <span aria-hidden="true"> ↗</span>
                      <span className="visually-hidden"> (opens in a new tab)</span>
                    </a>
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        ) : null}
      </div>
    </article>
  )
}
