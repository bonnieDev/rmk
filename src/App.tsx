import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnnotationLayer } from './components/AnnotationLayer'
import { GenerativeRMKLogo } from './components/GenerativeRMKLogo'
import { ChangeoverCue, CueMark } from './components/CueMark'
import { ProjectEntry } from './components/ProjectEntry'
// Shape field background — switched off for now; restore this and <ShapeField /> below to bring it back.
// import { ShapeField } from './components/ShapeField'
import { defaultLogoPalette, projects, type Project } from './data/projects'
import './App.css'

const NAV = [
  { id: 'index', label: 'Index' },
  { id: 'about', label: 'About' },
  { id: 'resume', label: 'Record' },
] as const

/** Hero manifest — the spec sheet that locks to the mark's vertical rules */
const MANIFEST = [
  { key: 'Name', value: 'Bonnie Caroline Remeika' },
  { key: 'Practice', value: 'RMK Systems — independent' },
  { key: 'Location', value: 'Ravenna, Ohio · US' },
] as const

const DISCIPLINE = [
  'Enterprise UX Architecture',
  'Generative Design Pipelines',
  'Original Worlds',
] as const

/**
 * Career eras, drawn from the practice itself.
 * Employers and dates live in the full résumé, linked below the list.
 */
const RECORD = [
  {
    id: 'origin',
    label: 'Origin',
    span: 'Pre-curriculum',
    body: 'Print, darkrooms, and the web before any of those had a proper course of study.',
  },
  {
    id: 'boutique',
    label: 'Boutique',
    span: 'Studio work',
    body: 'Brand systems and identity built end to end for clients, at small-shop velocity.',
  },
  {
    id: 'mobile',
    label: 'Mobile',
    span: 'First mobile web',
    body: 'Front-end delivery when the constraints were severe and the conventions did not exist yet.',
  },
  {
    id: 'regulated',
    label: 'Regulated',
    span: 'Enterprise product',
    body: 'Years inside compliance-bound product environments, where live has to match approved exactly.',
  },
  {
    id: 'ai-native',
    label: 'AI-native',
    span: 'Current',
    body: 'One person in the director’s chair — code, motion, worlds, and products that used to need a crew.',
  },
] as const

export default function App() {
  const [hovered, setHovered] = useState<Project | null>(null)
  // Aether opens on load so the first thing a visitor sees includes real stills.
  const [openIds, setOpenIds] = useState<string[]>(['aether-command'])
  const [logoPinned, setLogoPinned] = useState(false)
  const heroLogoRef = useRef<HTMLDivElement>(null)

  const palette = hovered?.logoPalette ?? defaultLogoPalette
  const pace = hovered ? 'hover' : 'slow'
  const allOpen = openIds.length === projects.length

  const toggleEntry = useCallback((id: string) => {
    setOpenIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
  }, [])

  const toggleAll = () => setOpenIds(allOpen ? [] : projects.map((p) => p.id))

  const liveCount = useMemo(
    () => projects.filter((p) => p.status.live).length,
    [],
  )

  useEffect(() => {
    const el = heroLogoRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => setLogoPinned(!entry.isIntersecting),
      { root: null, threshold: 0, rootMargin: '-12px 0px 0px 0px' },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  const goTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className={`site${logoPinned ? ' site--pinned' : ''}`}>
      {/* <ShapeField /> */}
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      {/* Observes only — never receives pointer events */}
      <AnnotationLayer />
      {/* The cue in its original job: corner of the frame, on a reel change. */}
      <ChangeoverCue />

      {/* =====================================================
          MASTHEAD — hairline bar, no pill, no shadow
          ===================================================== */}
      <header className="masthead">
        <div className="masthead__inner">
          <div className="masthead__left">
            <button
              type="button"
              className={`masthead__mark${logoPinned ? ' is-visible' : ''}`}
              onClick={scrollToTop}
              tabIndex={logoPinned ? 0 : -1}
              aria-hidden={!logoPinned}
              aria-label="Back to top"
            >
              <GenerativeRMKLogo seed="rmk" palette={palette} pace={pace} compact hideTicker />
            </button>
            <span className="masthead__word">rmk.systems</span>
          </div>

          <nav className="masthead__nav" aria-label="Primary">
            <ul>
              {NAV.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => goTo(item.id)}>
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <p className="masthead__state">
            <span className="masthead__pip" aria-hidden="true" />
            <span>
              {liveCount} live · Ravenna OH
            </span>
          </p>
        </div>
      </header>

      <main id="main" className="site__frame">
        {/* =====================================================
            HERO — the mark commands the space; the manifest
            locks to its vertical rules
            ===================================================== */}
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero__mark" ref={heroLogoRef}>
            <GenerativeRMKLogo seed="rmk" palette={palette} pace={pace} />
            <h1 className="hero__wordmark" id="hero-title">
              rmk<span aria-hidden="true">.</span>systems
            </h1>
          </div>

          <div className="hero__manifest">
            <p className="label label--edge">System manifest</p>

            <dl className="manifest">
              {MANIFEST.map((row) => (
                <div className="manifest__row" key={row.key}>
                  <dt>{row.key}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}

              <div className="manifest__row manifest__row--stack">
                <dt>Discipline</dt>
                <dd>
                  <ol className="discipline">
                    {DISCIPLINE.map((line, i) => (
                      <li key={line}>
                        <span className="discipline__n" aria-hidden="true">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        {line}
                      </li>
                    ))}
                  </ol>
                </dd>
              </div>

              <div className="manifest__row">
                <dt>Record</dt>
                <dd>25 years · 8 patents filed</dd>
              </div>

              <div className="manifest__row">
                <dt>Index</dt>
                <dd>
                  {String(projects.length).padStart(2, '0')} entries ·{' '}
                  <time dateTime="2026-09">2026.09</time>
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* =====================================================
            INDEX — catalog of work
            ===================================================== */}
        <section id="index" className="section" aria-labelledby="index-title">
          {/* Compact head: the label IS the heading here — the catalog rows
              below carry the weight, so no display line above them. */}
          <div className="section__head section__head--compact">
            <h2 className="label" id="index-title">
              Index / Selected work
              <CueMark className="cue--label" />
            </h2>
            <div className="section__tools">
              <p className="section__count">
                {String(projects.length).padStart(2, '0')} entries
              </p>
              <button
                type="button"
                className="ghost-btn"
                aria-expanded={allOpen}
                onClick={toggleAll}
              >
                {/* The cue is the state here: it tightens a quarter turn when
                    the catalog is open, reporting what the label reports. */}
                <CueMark className="cue--tool" />
                <span aria-hidden="true">{allOpen ? '−' : '+'}</span>
                {allOpen ? 'Collapse all' : 'Expand all'}
              </button>
            </div>
          </div>

          <div className="catalog">
            {projects.map((project, i) => (
              <ProjectEntry
                key={project.id}
                project={project}
                index={i}
                open={openIds.includes(project.id)}
                active={hovered?.id === project.id}
                onToggle={toggleEntry}
                onHoverStart={setHovered}
                onHoverEnd={() => setHovered(null)}
              />
            ))}
          </div>
        </section>

        {/* =====================================================
            ABOUT
            ===================================================== */}
        <section id="about" className="section" aria-labelledby="about-title">
          <div className="section__head">
            <p className="label">About</p>
            <h2 className="section__title" id="about-title">
              Bonnie Caroline Remeika
            </h2>
          </div>

          <div className="prose-grid">
            <dl className="prose-grid__spec">
              <div>
                <dt>Role</dt>
                <dd>Creative technologist · UX/UI</dd>
              </div>
              <div>
                <dt>Base</dt>
                <dd>Ravenna, Ohio</dd>
              </div>
              <div>
                <dt>Depth</dt>
                <dd>Brand · Front-end · Motion · Audio · Full-stack</dd>
              </div>
            </dl>

            <div className="prose">
              <p>
                I’m a product designer and systems builder with roots in print,
                darkrooms, and the early web — the first two I was taught, the
                last one nobody was teaching yet.
                I’ve spent a career remaking myself at each edge of the field —
                boutique work, the first mobile web, and years inside regulated
                product environments.
              </p>
              <p>
                That work is zero-tolerance by design. Live isn’t “close enough” —
                it has to match what was approved, pixel for pixel. I nitpick at
                that scale on purpose: in compliance contexts, a wrong state isn’t
                a polish note, it’s risk. I take the rules seriously because they
                exist for a reason, and the craft has to be precise enough to honor
                them.
              </p>
              <p>
                What’s in front of me now is AI-native work: one person in the
                director’s chair, shipping code, motion, worlds, and products that
                used to need a crew. There’s still no degree for that. I recognize
                the room.
              </p>
              <p className="prose__close">I’m in.</p>
            </div>
          </div>
        </section>

        {/* =====================================================
            RECORD — era index, not a dead "coming soon"
            ===================================================== */}
        <section id="resume" className="section" aria-labelledby="record-title">
          <div className="section__head">
            <p className="label">Record</p>
            <h2 className="section__title" id="record-title">
              The long path, in eras.
            </h2>
            <div className="section__tools">
              <p className="section__count">
                {String(RECORD.length).padStart(2, '0')} eras
              </p>
            </div>
          </div>

          <ol className="record">
            {RECORD.map((era, i) => (
              <li className="record__row" key={era.id}>
                <p className="record__n">
                  {String(i + 1).padStart(2, '0')}
                  <span aria-hidden="true"> / </span>
                  <span className="record__label">{era.label}</span>
                </p>
                <p className="record__span">{era.span}</p>
                <p className="record__body">{era.body}</p>
              </li>
            ))}
          </ol>

          <div className="record__foot">
            <p className="record__note">
              Full résumé — names, dates, and scope.
            </p>
            <div className="record__links">
              <a
                className="ghost-btn"
                href="/bonnie-remeika-resume.pdf"
                target="_blank"
                rel="noopener"
              >
                <span aria-hidden="true">→</span>
                Résumé (PDF)
              </a>
              <a
                className="ghost-btn"
                href="https://cirkitree.xyz/"
                rel="me noreferrer"
                target="_blank"
              >
                <span aria-hidden="true">→</span>
                Cirkitree index
              </a>
              <a
                className="ghost-btn"
                href="https://www.linkedin.com/in/rmksystems"
                rel="me noreferrer"
                target="_blank"
              >
                <span aria-hidden="true">→</span>
                LinkedIn
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-foot">
        <p>rmk.systems · <a href="https://cirkitree.xyz/" rel="me noreferrer" target="_blank">cirkitree.xyz</a></p>
        <p>Ravenna, Ohio</p>
        <p>
          <time dateTime="2026">© 2026</time> Bonnie Caroline Remeika
        </p>
      </footer>
    </div>
  )
}
