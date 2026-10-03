/**
 * One place to record what visitors do, sent to Google Analytics (see the tag
 * in index.html). Counts appear in Reports → Engagement → Events.
 *
 * The tag may be blocked or not yet loaded, so every call is optional.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

export function track(event: string, params: Record<string, string | number> = {}) {
  window.gtag?.('event', event, params)
}
