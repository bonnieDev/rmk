import { useCallback, useEffect, useRef, useState } from 'react'
import { defaultLogoPalette, type LogoPalette } from '../../data/projects'
import {
  BURST_REMAKE_MS,
  COLS,
  generate,
  GRIDS,
  hashStr,
  HOVER_REMAKE_MS,
  LETTERS,
  mulberry32,
  mutate,
  PHASES,
  recolorSubtle,
  recolorToPalette,
  ROWS,
  SLOW_REMAKE_MS,
  TICKER,
} from './engine'
import {
  CELL,
  CELL_GAP,
  LETTER_GAP,
  cellGeometry,
  letterHeight,
  letterWidth,
  markWidth,
} from './geometry'
import type {
  GenerativeRMKLogoProps,
  LetterConfig,
  Phase,
} from './types'
import './GenerativeRMKLogo.css'

/**
 * The mark as one SVG.
 *
 * It used to be three CSS grids of <div>s. SVG is required for two reasons:
 * the glow-paint halo is an SVG filter (a CSS `filter: url()` doesn't render
 * in Safari), and cells have to be able to animate to arbitrary coordinates
 * for the scroll morph — grid children can't leave their cells.
 */
/** Bonnie's father's line about the family name. */
const TAGLINE = 'MAKE REMAKE. REVERSE ENGINEER THE WORLD.'

function MarkCells({
  config,
  palette,
}: {
  config: LetterConfig
  palette: LogoPalette
}) {
  const accents = palette.accents
  const nodes: React.ReactNode[] = []

  LETTERS.forEach((letter, li) => {
    const ox = li * (letterWidth(COLS) + LETTER_GAP)
    const g = GRIDS[letter]
    const byPos = new Map(config[letter].map((cell) => [`${cell.r}-${cell.c}`, cell]))

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const on = g[r][c] === '1'
        const x = ox + c * (CELL + CELL_GAP)
        const y = r * (CELL + CELL_GAP)
        const key = `${letter}-${r}-${c}`

        if (!on) continue

        const cell = byPos.get(`${r}-${c}`)
        if (!cell) continue

        const fill =
          cell.accent >= 0 && accents.length
            ? accents[cell.accent % accents.length]
            : palette.ink

        const geo = cellGeometry(cell.shape, x, y)
        if (geo.kind === 'circle') {
          nodes.push(
            <circle key={key} cx={x + CELL / 2} cy={y + CELL / 2} r={CELL / 2} fill={fill} />,
          )
        } else if (geo.kind === 'path') {
          nodes.push(<path key={key} d={geo.d} fill={fill} />)
        } else {
          nodes.push(<rect key={key} x={x} y={y} width={CELL} height={CELL} fill={fill} />)
        }
      }
    }
  })

  return <>{nodes}</>
}

export function GenerativeRMKLogo({
  seed = 'kinedic',
  paused = false,
  className = '',
  showControls = false,
  palette = defaultLogoPalette,
  pace = 'slow',
  compact = false,
  hideTicker = false,
}: GenerativeRMKLogoProps) {
  const [seedText, setSeedText] = useState(seed)
  const [gen, setGen] = useState(0)
  const [phase, setPhase] = useState<Phase>('MK')
  const [auto, setAuto] = useState(!paused)
  const [config, setConfig] = useState<LetterConfig>(() =>
    generate(hashStr(`${seed}·0`), { accentChance: 0.1, accentCount: 3 }),
  )
  const [reducedMotion, setReducedMotion] = useState(false)

  const stepRef = useRef(0)
  const seedRef = useRef(seed)
  const genRef = useRef(0)
  const paletteRef = useRef(palette)
  const paceRef = useRef(pace)

  paletteRef.current = palette
  paceRef.current = pace

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    setAuto(!paused)
  }, [paused])

  const rebuild = useCallback((nextSeed: string, g: number, accentHeavy = false) => {
    seedRef.current = nextSeed
    genRef.current = g
    stepRef.current = 0
    setGen(g)
    setPhase('MK')
    const accents = paletteRef.current.accents.length || 3
    setConfig(
      generate(hashStr(`${nextSeed}·${g}`), {
        accentChance: accentHeavy ? 0.55 : 0.1,
        accentCount: accents,
      }),
    )
  }, [])

  const normalizePace = (p: typeof pace) => (p === 'fast' ? 'burst' : p)

  const advance = useCallback((forceKind?: 'color' | 'shape') => {
    const accents = paletteRef.current.accents.length || 3
    const mode = normalizePace(paceRef.current)
    const burst = mode === 'burst'
    const hover = mode === 'hover'
    const next = (stepRef.current + 1) % 4

    if (next === 0 && !forceKind) {
      rebuild(seedRef.current, genRef.current + 1, burst)
      return
    }

    stepRef.current = forceKind ? stepRef.current : next
    const step = forceKind ? stepRef.current + 1 : next
    const rng = mulberry32(hashStr(`${seedRef.current}·${genRef.current}·${step}·${Date.now() % 997}`))
    const kind = forceKind ?? (next === 3 ? 'color' : 'shape')
    setPhase(kind === 'color' ? 'MKR' : 'RMK')

    if (hover && !forceKind) {
      // hover ticks: only whisper recolors, no shape thrash
      setConfig((c) => recolorSubtle(c, rng, accents))
      return
    }

    setConfig((c) =>
      mutate(c, rng, kind, {
        rate: burst ? 0.72 : 0.28,
        accentChance: burst ? 0.85 : 0.32,
        accentCount: accents,
      }),
    )
  }, [rebuild])

  /** React to palette / pace changes from the page */
  useEffect(() => {
    if (reducedMotion) return
    const accents = palette.accents.length || 3
    const mode = normalizePace(pace)
    const rng = mulberry32(hashStr(`${seedRef.current}·react·${palette.ink}·${mode}·${genRef.current}`))

    if (mode === 'burst') {
      setPhase('RMK')
      setConfig((c) => recolorToPalette(c, rng, accents))
      stepRef.current = 1
    } else if (mode === 'hover') {
      setPhase('RMK')
      setConfig((c) => recolorSubtle(c, rng, accents))
    }
  }, [palette, pace, reducedMotion])

  useEffect(() => {
    if (!auto || reducedMotion) return undefined
    const mode = normalizePace(pace)
    const ms =
      mode === 'burst' ? BURST_REMAKE_MS : mode === 'hover' ? HOVER_REMAKE_MS : SLOW_REMAKE_MS
    const id = window.setInterval(() => advance(), ms)
    return () => window.clearInterval(id)
  }, [auto, reducedMotion, pace, advance])

  const applySeed = () => rebuild(seedText.trim() || 'rmk', 0, normalizePace(pace) === 'burst')
  const range = PHASES[phase].range
  const mode = normalizePace(pace)

  const showTicker = !compact && !hideTicker

  return (
    <div
      className={[
        'rmk-logo',
        mode === 'burst' ? 'rmk-logo--burst' : mode === 'hover' ? 'rmk-logo--hover' : 'rmk-logo--slow',
        compact ? 'rmk-logo--compact' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {showControls ? (
        <div className="rmk-logo__controls">
          <input
            value={seedText}
            onChange={(e) => setSeedText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applySeed()}
            placeholder="seed"
            aria-label="Seed"
            className="rmk-logo__seed"
          />
          <button type="button" className="rmk-logo__btn" onClick={applySeed}>
            Set mark
          </button>
          <button type="button" className="rmk-logo__btn" onClick={() => advance()}>
            Remake
          </button>
          <button
            type="button"
            className="rmk-logo__btn"
            onClick={() => setAuto((a) => !a)}
          >
            {auto ? 'Pause' : 'Run'}
          </button>
        </div>
      ) : null}

      <button
        type="button"
        className="rmk-mark"
        onClick={() => advance()}
        title="Click to remake"
        aria-label="RMK generative logo — click to remake"
      >
        <svg
          className="rmk-mark__svg"
          viewBox={`0 0 ${markWidth(COLS, LETTERS.length)} ${letterHeight(ROWS)}`}
          role="presentation"
          aria-hidden="true"
        >
          <g className="rmk-mark__cells" key={gen}>
            <MarkCells config={config} palette={palette} />
          </g>
        </svg>
      </button>

      {showTicker ? (
        <div className="rmk-ticker">
          {/* MKRMKMK — the active window slides across it to spell
              MK / RMK / MKR, which is where MAKE · REMAKE · MAKER comes from. */}
          <p className="rmk-ticker__word" aria-hidden="true">
            {TICKER.map((ch, i) => {
              const active = i >= range[0] && i <= range[1]
              return (
                <span key={i} className={active ? 'is-active' : ''}>
                  {ch}
                </span>
              )
            })}
          </p>

          {/*
            Every letter is in the DOM from the start and only its opacity
            rises, so the line reads as typing itself in without any layout
            shift — and without a screen reader announcing it character by
            character. The whole phrase is one label.
          */}
          <p className="rmk-ticker__line" aria-label={TAGLINE}>
            {TAGLINE.split('').map((ch, i) => (
              <span
                key={i}
                aria-hidden="true"
                style={{ animationDelay: `${i * 26}ms` }}
                className={ch === ' ' ? 'is-space' : undefined}
              >
                {ch === ' ' ? '\u00a0' : ch}
              </span>
            ))}
          </p>
        </div>
      ) : null}
    </div>
  )
}
