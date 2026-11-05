/**
 * One sound at a time. When anything on the page starts playing sound, the
 * rest stops: the Cher Bomba video, the Listening Room, Skull's stage.
 *
 * Players on this page register a stop function. Demos are same-origin
 * frames: they post `rmk-sound-on` when they start sound, and stop themselves
 * when they get `rmk-sound-stop` (see the "One sound at a time" script at the
 * top of each demo with sound).
 */

type Stop = () => void

const players = new Set<Stop>()

/** Stop this player whenever something else starts sound. Returns cleanup. */
export function onOtherSound(stop: Stop): () => void {
  players.add(stop)
  return () => {
    players.delete(stop)
  }
}

/** Something started sound: stop every other player on the page and in demos. */
export function soundStarted(from?: Stop | MessageEventSource | null) {
  players.forEach((stop) => {
    if (stop !== from) stop()
  })
  document.querySelectorAll<HTMLIFrameElement>('iframe[src^="/demos/"]').forEach((frame) => {
    const win = frame.contentWindow
    if (win && win !== from) win.postMessage({ type: 'rmk-sound-stop' }, window.location.origin)
  })
}

/** Hear demos announce their sound. Returns cleanup. */
export function listenForDemoSound(): () => void {
  const onMessage = (e: MessageEvent) => {
    if (e.origin !== window.location.origin || e.data?.type !== 'rmk-sound-on') return
    soundStarted(e.source)
  }
  window.addEventListener('message', onMessage)
  return () => window.removeEventListener('message', onMessage)
}
