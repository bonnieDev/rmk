import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GenerativeRMKLogo } from './components/GenerativeRMKLogo'
import { Floor, useFloor, type FloorSheet } from './components/Floor'
import { ProjectSheet } from './components/ProjectSheet'
import { SheetMast } from './components/SheetMast'
import { fullTitleOf, posterOf } from './components/ProjectMedia'
// Retired with the floor redesign (docs/FLOOR-CAMERA.md): the chalk
// annotations, the changeover cue, the etched attractor and the shape field.
// Their components stay in src/components if a place for them comes back.
import { defaultLogoPalette, projects, type Project } from './data/projects'
import { sectionReached, track, trackClicks, trackJourney } from './analytics'
import { listenForDemoSound } from './sound'
import './App.css'

const EMAIL = 'bonnie@rmk.systems'

/** Hero manifest — the spec sheet beside the mark */
const MANIFEST = [
  { key: 'Name', value: 'Bonnie Caroline Remeika' },
  { key: 'Practice', value: 'RMK Systems — independent' },
  { key: 'Location', value: 'Ravenna, Ohio · US' },
] as const

const DISCIPLINE = [
  'Art Direction',
  'Generative Video Pipelines',
  'Enterprise UX Architecture',
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
    body: 'Creative director of my own studio: brand, print and web for clients, and the craft bar for a team of four designers whose work I reviewed on every job.',
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
    body: 'Eight years stewarding global brand and design systems for international pharmaceutical brands, across markets, where live has to match approved exactly.',
  },
  {
    id: 'ai-native',
    label: 'AI-native',
    span: 'Current',
    body: 'One person in the director’s chair: art direction, generative video, AI agents, code, and worlds that used to need a crew.',
  },
] as const

const num = (i: number) => String(i + 1).padStart(2, '0')

/** Up to three small pictures for an index row */
function thumbsOf(p: Project): string[] {
  const stills = (p.stills ?? []).map((s) => s.src).slice(0, 3)
  if (stills.length) return stills
  const poster = posterOf(p)
  return poster ? [poster] : []
}

export default function App() {
  // The visitor's path, for Analytics → User explorer
  useEffect(() => trackJourney(), [])
  // Every click, named by where it was and what it was
  useEffect(() => trackClicks(), [])
  // One sound at a time across the videos and demos
  useEffect(() => listenForDemoSound(), [])

  const sheets = useMemo<FloorSheet[]>(
    () => [
      { id: 'home', num: '00', label: 'Index', render: () => <HomeSheet /> },
      ...projects.map((p, i) => ({
        id: p.id,
        num: num(i),
        label: fullTitleOf(p),
        render: (live: boolean) => (
          <ProjectSheet project={p} num={num(i)} next={projects[(i + 1) % projects.length]} live={live} />
        ),
      })),
      { id: 'about', num: '—', label: 'About', render: () => <AboutSheet /> },
    ],
    [],
  )

  const onLand = useCallback((id: string) => {
    sectionReached(id === 'home' ? 'hero' : id)
    const i = projects.findIndex((p) => p.id === id)
    if (i >= 0) track('project_open', { project: fullTitleOf(projects[i]), position: i + 1 })
  }, [])

  const onOverview = useCallback((from: string) => track('view_from_above', { from }), [])

  return (
    <>
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault()
          document.querySelector<HTMLElement>('.sheet.is-focus h1')?.focus({ preventScroll: true })
        }}
      >
        Skip to content
      </a>
      <main id="main">
        <Floor sheets={sheets} onLand={onLand} onOverview={onOverview} />
      </main>
    </>
  )
}

/* =========================================================
   HOME — looks like an ordinary site. Nothing gives the floor away.
   ========================================================= */

function HomeSheet() {
  const { go } = useFloor()
  const [hovered, setHovered] = useState<Project | null>(null)
  const [logoPinned, setLogoPinned] = useState(false)
  const leadRef = useRef<HTMLDivElement>(null)
  const palette = hovered?.logoPalette ?? defaultLogoPalette
  const pace = hovered ? 'hover' : 'slow'
  const liveCount = projects.filter((p) => p.status.live).length

  // the small mark joins the masthead once the big one scrolls away
  useEffect(() => {
    const el = leadRef.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => setLogoPinned(!entry.isIntersecting), {
      root: el.closest('.sheet__scroll'),
      threshold: 0,
      rootMargin: '-56px 0px 0px 0px',
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const scrollTo = (id: string) => {
    track('nav_click', { section: id })
    const el = document.getElementById(id)
    const scroller = el?.closest<HTMLElement>('.sheet__scroll')
    if (!el || !scroller) return
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    scroller.scrollTo({ top: id === 'top' ? 0 : el.offsetTop - 56, behavior: smooth ? 'smooth' : 'auto' })
  }

  return (
    <div id="top">
      <SheetMast
        left={
          <>
            <button
              type="button"
              className={`masthead__mark${logoPinned ? ' is-visible' : ''}`}
              onClick={() => scrollTo('top')}
              tabIndex={logoPinned ? 0 : -1}
              aria-hidden={!logoPinned}
              aria-label="Back to top"
            >
              <GenerativeRMKLogo seed="rmk" palette={palette} pace={pace} compact hideTicker className="rmk-logo--heavy" />
            </button>
            <span className="masthead__word">rmk.systems</span>
          </>
        }
        nav={
          <>
            <button type="button" onClick={() => scrollTo('index')}>
              Index
            </button>
            <button
              type="button"
              onClick={(e) => {
                track('nav_click', { section: 'about' })
                go('about', e.currentTarget)
              }}
            >
              About
            </button>
          </>
        }
        meta={
          <>
            <span className="masthead__pip" aria-hidden="true" />
            {liveCount} live · Ravenna OH
          </>
        }
      />

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero__lead" ref={leadRef}>
          <GenerativeRMKLogo seed="rmk" palette={palette} pace={pace} className="rmk-logo--heavy" />
          <h1 className="pov" id="hero-title" tabIndex={-1}>
            One person in the <em>director’s chair.</em>
          </h1>
          <p className="pov-sub">
            I work on both sides of the line between design and engineering, and I don’t hand off in the
            middle.
          </p>
        </div>

        <div className="hero__manifest">
          <p className="label">System manifest</p>
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
                        {num(i)}
                      </span>
                      {line}
                    </li>
                  ))}
                </ol>
              </dd>
            </div>
            <div className="manifest__row">
              <dt>Record</dt>
              <dd>25 years · 8 provisional patents</dd>
            </div>
            <div className="manifest__row">
              <dt>Contact</dt>
              <dd>
                <a
                  className="manifest__link"
                  href={`mailto:${EMAIL}`}
                  onClick={() => track('email_click', { from: 'manifest' })}
                >
                  {EMAIL}
                </a>
                {' · '}open to new roles
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section id="index" className="index" aria-labelledby="index-title">
        <div className="index__head">
          <h2 className="label" id="index-title">
            Index / Selected work
          </h2>
          <p className="label">{num(projects.length - 1)} entries · choose any project</p>
        </div>
        <ol className="index__rows">
          {projects.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                className="row"
                onClick={(e) => go(p.id, e.currentTarget)}
                onMouseEnter={() => setHovered(p)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(p)}
                onBlur={() => setHovered(null)}
              >
                <span className="row__n">{num(i)}</span>{' '}
                <span className="row__t">
                  {p.title}
                  {p.titleEm ? (
                    <>
                      {' '}
                      <em>{p.titleEm}</em>
                    </>
                  ) : null}
                </span>{' '}
                <span className="row__c">{p.category}</span>
                <span className="row__thumbs" aria-hidden="true">
                  {thumbsOf(p).map((src) => (
                    <img key={src} src={src} alt="" loading="lazy" decoding="async" />
                  ))}
                  <span className="row__arrow">→</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </section>

      <SiteFoot />
    </div>
  )
}

/* =========================================================
   ABOUT + RECORD
   ========================================================= */

function AboutSheet() {
  const { go, overview } = useFloor()
  return (
    <>
      <SheetMast meta="About · Record" />

      <section id="about" className="about" aria-labelledby="about-title">
        <p className="psheet__kicker">
          <b>About</b>
        </p>
        <h1 className="psheet__title" id="about-title" tabIndex={-1}>
          Bonnie Caroline <em>Remeika</em>
        </h1>

        <div className="prose-grid">
          <div className="prose-grid__side">
            <figure className="portrait">
              <img
                src="/bonnie-remeika.jpg"
                alt="Portrait of Bonnie Caroline Remeika: shoulder-length wavy light-brown hair with bangs, a soft smile, and a black top, in a bright office."
                width={640}
                height={1009}
                loading="lazy"
                decoding="async"
              />
            </figure>
            <dl className="prose-grid__spec">
              <div>
                <dt>Role</dt>
                <dd>Visual designer · Art director · Creative technologist</dd>
              </div>
              <div>
                <dt>Base</dt>
                <dd>Ravenna, Ohio</dd>
              </div>
              <div>
                <dt>Depth</dt>
                <dd>Art direction · Brand · Motion · Audio · Generative AI · Front-end</dd>
              </div>
            </dl>
          </div>

          <div className="prose">
            <p>
              I’m a product designer and systems builder with roots in print, darkrooms, and the early web — the
              first two I was taught, the last one nobody was teaching yet. I’ve spent a career remaking myself
              at each edge of the field — boutique work, the first mobile web, and years inside regulated product
              environments.
            </p>
            <p>
              That work is zero-tolerance by design. Live isn’t “close enough” — it has to match what was
              approved, pixel for pixel. I nitpick at that scale on purpose: in compliance contexts, a wrong state
              isn’t a polish note, it’s risk. I take the rules seriously because they exist for a reason, and the
              craft has to be precise enough to honor them.
            </p>
            <p>
              Early client work taught me to learn a new trade for every job — car audio, pharma compliance,
              sustainability certification — because you can’t convey a message you don’t understand, to an
              audience you don’t understand.
            </p>
            <p>
              I work on both sides of the line between design and engineering, and I don’t hand off in the middle.
              Aether Command’s visual language and its deck.gl globe came from the same person. So did Listening
              Room’s score and the code that picks the track, and Kinedic Drop’s mark and the displacement filter
              that ripples the page. I prototype fast, pick up new tools when the work needs them, and keep the
              experience honest while I’m deep in the technical problem.
            </p>
            <p>
              What’s in front of me now is AI-native work: one person in the director’s chair, shipping code,
              motion, worlds, and products that used to need a crew. There’s still no degree for that. I recognize
              the room.
            </p>
            <p className="prose__close">I’m in.</p>
          </div>
        </div>
      </section>

      <section id="resume" className="record-section" aria-labelledby="record-title">
        <p className="label">Record</p>
        <h2 className="section__title" id="record-title">
          The long path, in eras.
        </h2>
        <ol className="record">
          {RECORD.map((era, i) => (
            <li className="record__row" key={era.id}>
              <p className="record__n">
                {num(i)}
                <span aria-hidden="true"> / </span>
                <span className="record__label">{era.label}</span>
              </p>
              <p className="record__span">{era.span}</p>
              <p className="record__body">{era.body}</p>
            </li>
          ))}
        </ol>

        <div className="record__foot">
          <p className="record__note">Full résumé — names, dates, and scope.</p>
          <div className="record__links">
            <a
              className="pill pill--amber"
              href="/bonnie-remeika-resume.pdf"
              target="_blank"
              rel="noopener"
              onClick={() => track('resume_open')}
            >
              Résumé (PDF)
              <span className="visually-hidden"> (opens in a new tab)</span>
            </a>
            <a className="pill" href={`mailto:${EMAIL}`} onClick={() => track('email_click', { from: 'record' })}>
              Email
            </a>
            <a className="pill" href="https://cirkitree.xyz/" rel="me noreferrer" target="_blank">
              Cirkitree index<span className="visually-hidden"> (opens in a new tab)</span>
            </a>
            <a className="pill" href="https://www.linkedin.com/in/rmksystems" rel="me noreferrer" target="_blank">
              LinkedIn<span className="visually-hidden"> (opens in a new tab)</span>
            </a>
          </div>
        </div>

        <nav className="psheet__nav" aria-label="Next">
          <button type="button" className="pill" onClick={(e) => go('home', e.currentTarget)}>
            <span aria-hidden="true">← </span>Index
          </button>
          <button type="button" className="pill pill--amber" onClick={overview}>
            View from above
          </button>
        </nav>
      </section>

      <SiteFoot />
    </>
  )
}

function SiteFoot() {
  return (
    <footer className="site-foot">
      <p>
        rmk.systems ·{' '}
        <a href="https://cirkitree.xyz/" rel="me noreferrer" target="_blank">
          cirkitree.xyz
        </a>
      </p>
      <p>
        <a href={`mailto:${EMAIL}`} onClick={() => track('email_click', { from: 'footer' })}>
          {EMAIL}
        </a>
        {' · '}Ravenna, Ohio
      </p>
      <p>
        <time dateTime="2026">© 2026</time> Bonnie Caroline Remeika
      </p>
    </footer>
  )
}
