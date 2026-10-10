/**
 * One place to record what visitors do, sent to Google Analytics (see the tag
 * in index.html). Counts appear in Reports → Engagement → Events; one
 * visitor's whole path, in order, is in Explore → User explorer.
 *
 * The tag may be blocked or not yet loaded, so every call is optional.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

type Params = Record<string, string | number>

export function track(event: string, params: Params = {}) {
  window.gtag?.('event', event, params)
}

/**
 * The path through the page: one `section_view` the first time each section
 * comes into view (hero, each project, About, Record), numbered in the order
 * the visitor reached them, then one `page_exit` when they leave, naming the
 * last section they saw. Returns a cleanup function.
 */
export function trackJourney(): () => void {
  const started = performance.now()
  const seen = new Set<string>()
  let last = 'hero'
  let exited = false

  const nameOf = (el: Element) => {
    if (el.classList.contains('hero')) return 'hero'
    if (el.id.startsWith('work-')) return el.id.slice('work-'.length)
    return el.id === 'resume' ? 'record' : el.id
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const section = nameOf(entry.target)
        last = section
        if (seen.has(section)) continue
        seen.add(section)
        track('section_view', { section, order: seen.size })
      }
    },
    // counts once a section's top third is on screen, not on a glancing scroll
    { threshold: 0, rootMargin: '0px 0px -35% 0px' },
  )
  document.querySelectorAll('.hero, #index, .entry, #about, #resume').forEach((el) => observer.observe(el))

  const exit = () => {
    if (exited) return
    exited = true
    // 'beacon' lets the hit leave even as the tab closes
    window.gtag?.('event', 'page_exit', {
      last_section: last,
      sections_seen: seen.size,
      seconds_on_page: Math.round((performance.now() - started) / 1000),
      transport_type: 'beacon',
    })
  }
  // Hidden is the last moment a phone reliably reports anything, so that
  // counts as leaving; coming back re-arms it, so the final exit is the one
  // that lands last in the visitor's timeline.
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') exit()
    else exited = false
  }
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pagehide', exit)

  return () => {
    observer.disconnect()
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('pagehide', exit)
  }
}

/**
 * Every click on something you can interact with, named by where it was and
 * what it was: one `ui_click` with `part` ("Kinedic Drop: Technical brief"),
 * `section` and `control`. Clicks on images count too, by their alt text.
 * Never anything a visitor typed. Returns a cleanup function.
 */
export function trackClicks(): () => void {
  const clean = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim()
  // the label a person sees: leaves out decorative bits (aria-hidden) like the
  // "+" on "Technical brief", and screen-reader-only text
  const textOf = (el: Element) => {
    const copy = el.cloneNode(true) as Element
    copy.querySelectorAll('[aria-hidden="true"], .visually-hidden').forEach((n) => n.remove())
    return copy.textContent
  }

  const sectionOf = (el: Element): string => {
    const entry = el.closest('article.entry')
    if (entry) {
      const title = entry.querySelector('.entry__title')
      return (title && clean(textOf(title))) || entry.id.replace(/^work-/, '')
    }
    if (el.closest('.masthead')) return 'Masthead'
    if (el.closest('.hero')) return 'Hero'
    if (el.closest('#index')) return 'Index'
    if (el.closest('#about')) return 'About'
    if (el.closest('#resume')) return 'Record'
    if (el.closest('.site-foot')) return 'Footer'
    return 'Page'
  }

  const onClick = (e: MouseEvent) => {
    const target = e.target as Element | null
    if (!target?.closest) return
    // the button or link wins over a picture inside it
    const control = target.closest('a, button, [role=button], summary, label') || target.closest('img')
    if (!control) return
    const label = clean(
      control.getAttribute('aria-label') ||
        (control instanceof HTMLImageElement ? control.alt && 'Image: ' + control.alt.slice(0, 40) : '') ||
        textOf(control) ||
        control.getAttribute('title'),
    ).slice(0, 50) || control.tagName.toLowerCase()
    const section = sectionOf(control).slice(0, 40)
    track('ui_click', { part: `${section}: ${label}`, section, control: label })
  }

  document.addEventListener('click', onClick, true)
  return () => document.removeEventListener('click', onClick, true)
}
