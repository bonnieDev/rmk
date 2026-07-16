import type { FocusEvent, KeyboardEvent } from 'react'
import type { Project } from '../../data/projects'
import './ProjectCard.css'

interface ProjectCardProps {
  project: Project
  index: number
  active?: boolean
  onHoverStart?: (project: Project) => void
  onHoverEnd?: () => void
  onOpen?: (project: Project) => void
}

export function ProjectCard({
  project,
  index,
  active = false,
  onHoverStart,
  onHoverEnd,
  onOpen,
}: ProjectCardProps) {
  const n = String(index + 1).padStart(2, '0')
  const mediaClass = [
    'project-card__media',
    `project-card__media--${project.visual}`,
    project.cover ? 'project-card__media--has-cover' : '',
    project.demoEmbed ? 'project-card__media--has-demo' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const open = () => onOpen?.(project)

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      open()
    }
  }

  return (
    <article
      className={`project-card project-card--${project.accent}${active ? ' is-active' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={`${project.title}${project.titleEm ? ` ${project.titleEm}` : ''} — open (in progress)`}
      onClick={open}
      onKeyDown={onKeyDown}
      onMouseEnter={() => onHoverStart?.(project)}
      onMouseLeave={() => onHoverEnd?.()}
      onFocusCapture={() => onHoverStart?.(project)}
      onBlurCapture={(e: FocusEvent<HTMLElement>) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          onHoverEnd?.()
        }
      }}
    >
      <div className={mediaClass} aria-hidden="true">
        {project.cover ? (
          <img
            className="project-card__cover"
            src={project.cover}
            alt=""
            loading="lazy"
            decoding="async"
          />
        ) : null}

        {project.demoEmbed ? (
          <iframe
            className="project-card__demo"
            src={project.demoEmbed}
            title=""
            loading="lazy"
            tabIndex={-1}
            aria-hidden="true"
          />
        ) : null}

        <span className="project-card__index">{n}</span>
        <div className="project-card__media-glow" />
      </div>

      <div className="project-card__body">
        <p className="project-card__eyebrow">{project.eyebrow}</p>
        <h2 className="project-card__title">
          {project.title}
          {project.titleEm ? (
            <>
              {' '}
              <em>{project.titleEm}</em>
            </>
          ) : null}
        </h2>
        <p className="project-card__premise">{project.premise}</p>
        <dl className="project-card__meta">
          <div>
            <dt>Role</dt>
            <dd>{project.role}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{project.status}</dd>
          </div>
        </dl>
      </div>
    </article>
  )
}
