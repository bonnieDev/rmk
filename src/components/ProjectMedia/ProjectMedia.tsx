import { useState } from 'react'
import type { Project } from '../../data/projects'
import { StreamVideo } from './StreamVideo'
import './ProjectMedia.css'

/** The still shown for a project before its media runs: first still, poster, cover or video frame */
export function posterOf(project: Project): string | undefined {
  const streamId = project.videoEmbed?.match(/\/([0-9a-f]{32})\//)?.[1]
  return (
    project.stills?.[0]?.src ??
    project.videoPoster ??
    project.cover ??
    (streamId
      ? `https://customer-b3v92lqv0bluwpls.cloudflarestream.com/${streamId}/thumbnails/thumbnail.jpg?time=1s&height=600`
      : undefined)
  )
}

export const fullTitleOf = (p: Project) => `${p.title}${p.titleEm ? ` ${p.titleEm}` : ''}`

export const hasMedia = (p: Project) => Boolean(p.videoEmbed || p.demoEmbed || p.cover || p.stills?.length)

/**
 * A project's media: its video, live demo, or gallery of stills (some of
 * which can be videos), with thumbnails that swap the big one in place.
 */
export function ProjectMedia({ project }: { project: Project }) {
  const fullTitle = fullTitleOf(project)
  const stills = project.stills ?? []
  const [stillIndex, setStillIndex] = useState(0)
  const still = stills[stillIndex]

  return (
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
          // lets a demo (Kinedic Bloom) ask for the motion sensor;
          // the visitor still has to say yes
          allow="accelerometer; gyroscope"
        />
      ) : still?.video ? (
        // key: switching between gallery videos loads the new one fresh
        <StreamVideo key={still.video} src={still.video} title={`${fullTitle} — ${still.alt}`} sound />
      ) : still ? (
        <img className="entry__cover entry__cover--still" src={still.src} alt={still.alt} decoding="async" />
      ) : project.cover ? (
        <img
          className="entry__cover"
          src={project.cover}
          alt={`${fullTitle} — still from the series`}
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
              aria-label={`Show ${s.video ? 'video' : 'still'} ${i + 1}: ${s.caption}`}
              onClick={() => setStillIndex(i)}
            >
              <img src={s.src} alt="" loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      ) : null}
      <figcaption
        className={`entry__media-cap${stills.length > 1 && !project.videoEmbed && !project.demoEmbed ? ' entry__media-cap--top' : ''}`}
      >
        {project.videoEmbed
          ? `Motion sample${project.videoCredit ? ` · ${project.videoCredit}` : ''}`
          : project.demoEmbed
            ? 'Live demo · running'
            : still
              ? `${still.video ? 'Video' : 'Still'} ${stillIndex + 1}/${stills.length} · ${still.caption}`
              : 'Still'}
      </figcaption>
    </figure>
  )
}
