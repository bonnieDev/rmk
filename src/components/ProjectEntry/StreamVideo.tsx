import { useEffect, useRef, useState } from 'react'
import { track } from '../../analytics'

/** The slice of the Cloudflare Stream player API used here */
interface StreamPlayer {
  muted: boolean
  currentTime: number
  play: () => Promise<void> | void
}

declare global {
  interface Window {
    Stream?: (iframe: HTMLIFrameElement) => StreamPlayer
  }
}

const SDK_SRC = 'https://embed.cloudflarestream.com/embed/sdk.latest.js'
let sdk: Promise<void> | null = null

/** Loads the Stream player SDK once, however many videos ask for it */
function loadSdk() {
  sdk ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SDK_SRC
    script.onload = () => resolve()
    script.onerror = () => {
      sdk = null
      reject(new Error('Stream SDK failed to load'))
    }
    document.head.appendChild(script)
  })
  return sdk
}

interface StreamVideoProps {
  src: string
  title: string
  /** Has its own soundtrack: offer a sound toggle over the muted loop */
  sound?: boolean
  /** Still shown before playback; a site path like '/bombaStill.jpg' */
  poster?: string
}

/**
 * A Cloudflare Stream embed with no route to fullscreen: the iframe is not
 * granted it, and the player's own controls stay hidden. When the video has
 * a soundtrack, a single toggle replaces those controls.
 */
export function StreamVideo({ src, title, sound = false, poster }: StreamVideoProps) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const playerRef = useRef<StreamPlayer | null>(null)
  const [ready, setReady] = useState(false)
  const [muted, setMuted] = useState(true)

  useEffect(() => {
    if (!sound) return
    let cancelled = false
    loadSdk()
      .then(() => {
        const frame = frameRef.current
        if (cancelled || !frame || !window.Stream) return
        playerRef.current = window.Stream(frame)
        setReady(true)
      })
      // No SDK, no toggle: the video still plays, silently.
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [sound])

  const toggleSound = () => {
    const player = playerRef.current
    if (!player) return
    if (muted) {
      // Turning the sound on starts the song from the top.
      track('video_sound_on', { video: title })
      player.currentTime = 0
      player.muted = false
      void player.play()
    } else {
      player.muted = true
    }
    setMuted(!muted)
  }

  // The player lives on Cloudflare's origin, so it needs the poster's full URL.
  let frameSrc = src
  if (poster) {
    const url = new URL(src)
    url.searchParams.set('poster', new URL(poster, window.location.origin).href)
    frameSrc = url.href
  }

  return (
    <>
      <iframe
        ref={frameRef}
        className="entry__frame"
        src={frameSrc}
        title={title}
        allow="accelerometer; gyroscope; autoplay; encrypted-media;"
        loading="lazy"
      />
      {sound && ready ? (
        <button
          type="button"
          className="entry__sound"
          aria-pressed={!muted}
          onClick={toggleSound}
        >
          <span aria-hidden="true">{muted ? '♪' : '■'}</span>
          {muted ? 'Sound on' : 'Sound off'}
        </button>
      ) : null}
    </>
  )
}
