import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
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
import type {
  CellShape,
  GenerativeRMKLogoProps,
  LetterConfig,
  LetterKey,
  LogoCell,
  Phase,
} from './types'
import './GenerativeRMKLogo.css'

function cellStyle(shape: CellShape, fill: string): CSSProperties {
  const style: CSSProperties = {
    width: '100%',
    height: '100%',
    background: fill,
  }

  if (shape.type === 'circle') {
    style.borderRadius = '50%'
  } else if (shape.type === 'round') {
    const { tl, tr, br, bl } = shape.corners
    style.borderRadius = `${tl ? '50%' : '0'} ${tr ? '50%' : '0'} ${br ? '50%' : '0'} ${bl ? '50%' : '0'}`
  } else if (shape.type === 'wedge') {
    style.clipPath = {
      tl: 'polygon(100% 0, 100% 100%, 0 100%)',
      tr: 'polygon(0 0, 100% 100%, 0 100%)',
      br: 'polygon(0 0, 100% 0, 0 100%)',
      bl: 'polygon(0 0, 100% 0, 100% 100%)',
    }[shape.cut]
  }

  return style
}

function LetterGrid({
  letter,
  cells,
  palette,
}: {
  letter: LetterKey
  cells: LogoCell[]
  palette: LogoPalette
}) {
  const byPos = new Map(cells.map((cell) => [`${cell.r}-${cell.c}`, cell]))
  const g = GRIDS[letter]
  const accents = palette.accents

  return (
    <div className="rmk-letter" aria-hidden="true">
      {Array.from({ length: ROWS * COLS }, (_, i) => {
        const r = Math.floor(i / COLS)
        const c = i % COLS
        if (g[r][c] !== '1') {
          return <div key={`${letter}-${i}`} className="rmk-cell rmk-cell--ghost" />
        }

        const cell = byPos.get(`${r}-${c}`)
        if (!cell) {
          return <div key={`${letter}-${i}`} className="rmk-cell rmk-cell--ghost" />
        }

        const fill =
          cell.accent >= 0 && accents.length
            ? accents[cell.accent % accents.length]
            : palette.ink

        return (
          <div key={`${letter}-${i}`} className="rmk-cell">
            <div className="rmk-cell__fill" style={cellStyle(cell.shape, fill)} />
          </div>
        )
      })}
    </div>
  )
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
        {LETTERS.map((L) => (
          <LetterGrid key={L} letter={L} cells={config[L]} palette={palette} />
        ))}
      </button>

      {showTicker ? (
        <div className="rmk-ticker">
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
          <p className="rmk-ticker__caption">
            {PHASES[phase].word} · seed {seedRef.current} · gen{' '}
            {String(gen).padStart(3, '0')}
          </p>
        </div>
      ) : null}
    </div>
  )
}
