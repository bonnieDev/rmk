import { useEffect, useId, useRef, useState } from 'react'
import { GenerativeRMKLogo } from './components/GenerativeRMKLogo'
import { ProjectCard } from './components/ProjectCard'
import { defaultLogoPalette, projects, type Project } from './data/projects'
import './App.css'

const NAV = [
  { id: 'about', label: 'About' },
  { id: 'resume', label: 'Resume' },
] as const

export default function App() {
  const [hovered, setHovered] = useState<Project | null>(null)
  /** Project that triggered the “in progress” notice — drives burst palette */
  const [clicked, setClicked] = useState<Project | null>(null)
  const [logoPinned, setLogoPinned] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const heroLogoRef = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const noticeTitleId = useId()

  // Hover = quiet palette whisper; click (while notice open) = loud remake burst
  const palette =
    (notice ? clicked : null)?.logoPalette ??
    hovered?.logoPalette ??
    clicked?.logoPalette ??
    defaultLogoPalette
  const pace = notice ? 'burst' : hovered ? 'hover' : 'slow'

  useEffect(() => {
    const el = heroLogoRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => setLogoPinned(!entry.isIntersecting),
      {
        root: null,
        threshold: 0,
        rootMargin: '-12px 0px 0px 0px',
      },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!menuOpen && !notice) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        setNotice(null)
        setClicked(null)
      }
    }

    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    if (menuOpen || notice) document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [menuOpen, notice])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setMenuOpen(false)
  }

  const goTo = (id: string) => {
    setMenuOpen(false)
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const dismissNotice = () => {
    setNotice(null)
    setClicked(null)
  }

  const openInProgress = (project?: Project) => {
    const name = project
      ? `${project.title}${project.titleEm ? ` ${project.titleEm}` : ''}`
      : 'This page'
    setClicked(project ?? null)
    setNotice(
      `${name} is still being put together. Portfolio in progress — check back soon.`,
    )
  }

  return (
    <div className={`site${logoPinned ? ' site--logo-pinned' : ''}${menuOpen ? ' site--menu-open' : ''}`}>
      {/* Always-on top chrome: pinned mark + hamburger */}
      <header className={`site-top${logoPinned ? ' is-pinned' : ''}`}>
        <div className="site-top__inner">
          <div className="site-top__left">
            <button
              type="button"
              className={`site-top__mark${logoPinned ? ' is-visible' : ''}`}
              onClick={scrollToTop}
              tabIndex={logoPinned ? 0 : -1}
              aria-hidden={!logoPinned}
              aria-label="Back to top — RMK mark"
            >
              <GenerativeRMKLogo
                seed="rmk"
                palette={palette}
                pace={pace}
                compact
                hideTicker
              />
            </button>
            <span className={`site-top__word${logoPinned ? ' is-visible' : ''}`}>
              rmk.systems
            </span>
          </div>

          <nav className="site-top__nav" aria-label="Primary">
            <ul className="site-top__links">
              {NAV.map((item) => (
                <li key={item.id}>
                  <button type="button" className="site-top__link" onClick={() => goTo(item.id)}>
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>

            <button
              type="button"
              className={`site-burger${menuOpen ? ' is-open' : ''}`}
              aria-expanded={menuOpen}
              aria-controls={menuId}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <span className="site-burger__lines" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </button>
          </nav>
        </div>
      </header>

      {/* Mobile drawer */}
      <div
        className={`site-drawer-scrim${menuOpen ? ' is-open' : ''}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />
      <nav
        id={menuId}
        className={`site-drawer${menuOpen ? ' is-open' : ''}`}
        aria-label="Mobile"
        aria-hidden={!menuOpen}
      >
        <p className="site-drawer__eyebrow">rmk.systems</p>
        <ul className="site-drawer__list">
          {NAV.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="site-drawer__link"
                onClick={() => goTo(item.id)}
                tabIndex={menuOpen ? 0 : -1}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <header className="site-hero">
        <div className="site-hero__logo" ref={heroLogoRef}>
          <GenerativeRMKLogo seed="rmk" palette={palette} pace={pace} />
        </div>

        <div className="site-hero__copy">
          <p className="site-hero__eyebrow">Bonnie Caroline Remeika</p>
          <h1 className="site-hero__title">
            rmk<em>.systems</em>
          </h1>
          <p className="site-hero__lede">
            Product design, generative systems, and original worlds —
            built to be remade in public.
          </p>
        </div>
      </header>

      <main className="site-main">
        <div className="site-section-head">
          <p className="site-label">Selected work</p>
          <h2 className="site-section-title">Things that keep remaking themselves.</h2>
        </div>

        <div className="project-grid">
          {projects.map((project, i) => (
            <ProjectCard
              key={project.id}
              project={project}
              index={i}
              active={hovered?.id === project.id}
              onHoverStart={setHovered}
              onHoverEnd={() => setHovered(null)}
              onOpen={openInProgress}
            />
          ))}
        </div>

        <section id="about" className="site-panel site-panel--about">
          <p className="site-label">About</p>
          <h2 className="site-panel__title">Bonnie Caroline Remeika</h2>
          <div className="site-panel__prose">
            <p>
              I’m a product designer and systems builder with roots in print,
              darkrooms, and the web before any of those had a proper curriculum.
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
            <p className="site-panel__close">I’m in.</p>
          </div>
        </section>

        <section id="resume" className="site-panel">
          <p className="site-label">Resume</p>
          <h2 className="site-panel__title">The long path — soon.</h2>
          <p className="site-panel__body">
            A chaptered story of the work is next: eras, craft, and the formal
            résumé with names and dates. For now, the short read lives above.
          </p>
        </section>
      </main>

      <footer className="site-foot">
        <span>rmk.systems</span>
        <span>Portfolio in progress · 2026</span>
      </footer>

      {notice ? (
        <div
          className="site-notice"
          role="dialog"
          aria-modal="true"
          aria-labelledby={noticeTitleId}
        >
          <button
            type="button"
            className="site-notice__scrim"
            aria-label="Dismiss"
            onClick={dismissNotice}
          />
          <div className="site-notice__card">
            <p className="site-notice__eyebrow">Heads up</p>
            <h2 id={noticeTitleId} className="site-notice__title">
              Portfolio in progress
            </h2>
            <p className="site-notice__body">{notice}</p>
            <button type="button" className="site-notice__btn" onClick={dismissNotice}>
              Got it
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
