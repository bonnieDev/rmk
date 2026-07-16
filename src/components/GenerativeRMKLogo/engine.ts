import type {
  CellShape,
  CornerFlags,
  CornerKey,
  LetterConfig,
  LetterKey,
  LogoCell,
} from './types'

/** Classic 7×5 silhouettes — the original RMK letterforms */
export const GRIDS: Record<LetterKey, string[]> = {
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  M: ['10001', '11011', '10101', '10001', '10001', '10001', '10001'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
}

export const ROWS = 7
export const COLS = 5
export const LETTERS: LetterKey[] = ['R', 'M', 'K']

export const TICKER = ['M', 'K', 'R', 'M', 'K', 'M', 'K', 'R'] as const

export const PHASES = {
  MK: { range: [0, 1] as const, word: 'MAKE' },
  RMK: { range: [2, 4] as const, word: 'REMAKE' },
  MKR: { range: [5, 7] as const, word: 'MAKER' },
} as const

/** Idle breath — slow enough to not pull focus from the page */
export const SLOW_REMAKE_MS = 5200
/** Card hover — nearly idle; only a quiet recolor tick */
export const HOVER_REMAKE_MS = 4600
/** Card click / “in progress” — flashy remake to steal focus from the dead end */
export const BURST_REMAKE_MS = 150
/** @deprecated use BURST_REMAKE_MS */
export const FAST_REMAKE_MS = BURST_REMAKE_MS

export interface GenerateOptions {
  accentChance?: number
  accentCount?: number
}

/* ---------- deterministic randomness ---------- */

export function hashStr(s: string): number {
  let h = 1779033703 ^ s.length
  for (let i = 0; i < s.length; i += 1) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return h >>> 0
}

export function mulberry32(a: number): () => number {
  return function rng() {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ---------- silhouette-aware grammar ---------- */

function on(g: string[], r: number, c: number): boolean {
  return r >= 0 && r < ROWS && c >= 0 && c < COLS && g[r][c] === '1'
}

function decideShape(g: string[], r: number, c: number, rng: () => number): CellShape {
  const corners: CornerFlags = {
    tl: !on(g, r - 1, c) && !on(g, r, c - 1),
    tr: !on(g, r - 1, c) && !on(g, r, c + 1),
    br: !on(g, r + 1, c) && !on(g, r, c + 1),
    bl: !on(g, r + 1, c) && !on(g, r, c - 1),
  }
  const convex = (Object.keys(corners) as CornerKey[]).filter((k) => corners[k])
  const neighbors =
    (on(g, r - 1, c) ? 1 : 0) +
    (on(g, r + 1, c) ? 1 : 0) +
    (on(g, r, c - 1) ? 1 : 0) +
    (on(g, r, c + 1) ? 1 : 0)

  if (convex.length && rng() < 0.42) return { type: 'round', corners }
  if (convex.length && rng() < 0.2) {
    return { type: 'wedge', cut: convex[Math.floor(rng() * convex.length)] }
  }
  if (neighbors <= 2 && rng() < 0.12) return { type: 'circle' }
  return { type: 'square' }
}

export function generate(seedNum: number, opts: GenerateOptions = {}): LetterConfig {
  const accentChance = opts.accentChance ?? 0.12
  const accentCount = Math.max(1, opts.accentCount ?? 3)
  const rng = mulberry32(seedNum)
  const out = {} as LetterConfig

  for (const L of LETTERS) {
    const g = GRIDS[L]
    const cells: LogoCell[] = []
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        if (g[r][c] !== '1') continue
        cells.push({
          r,
          c,
          shape: decideShape(g, r, c, rng),
          accent: rng() < accentChance ? Math.floor(rng() * accentCount) : -1,
          v: 0,
          anim: 'none',
          delay: 0,
        })
      }
    }
    out[L] = cells
  }

  return out
}

export function mutate(
  config: LetterConfig,
  rng: () => number,
  kind: 'color' | 'shape',
  opts: GenerateOptions & { rate?: number } = {},
): LetterConfig {
  const rate = opts.rate ?? 0.33
  const accentChance = opts.accentChance ?? 0.4
  const accentCount = Math.max(1, opts.accentCount ?? 3)
  const next = {} as LetterConfig

  for (const L of LETTERS) {
    next[L] = config[L].map((cell) => {
      if (rng() < rate) {
        const patch =
          kind === 'color'
            ? { accent: rng() < accentChance ? Math.floor(rng() * accentCount) : -1 }
            : { shape: decideShape(GRIDS[L], cell.r, cell.c, rng) }
        return {
          ...cell,
          ...patch,
          v: cell.v + 1,
          anim: 'none' as const,
          delay: 0,
        }
      }
      return { ...cell, anim: 'none' as const }
    })
  }

  return next
}

/** Flood most cells into the active palette — used on card click burst */
export function recolorToPalette(
  config: LetterConfig,
  rng: () => number,
  accentCount: number,
): LetterConfig {
  const next = {} as LetterConfig
  const n = Math.max(1, accentCount)

  for (const L of LETTERS) {
    next[L] = config[L].map((cell) => ({
      ...cell,
      accent: rng() < 0.72 ? Math.floor(rng() * n) : -1,
      shape: rng() < 0.4 ? decideShape(GRIDS[L], cell.r, cell.c, rng) : cell.shape,
      v: cell.v + 1,
      anim: 'none' as const,
      delay: 0,
    }))
  }

  return next
}

/**
 * Whisper of a palette shift — only a few cells pick up accent color.
 * No shape thrash; meant for hover so the card stays the focus.
 */
export function recolorSubtle(
  config: LetterConfig,
  rng: () => number,
  accentCount: number,
): LetterConfig {
  const next = {} as LetterConfig
  const n = Math.max(1, accentCount)

  for (const L of LETTERS) {
    next[L] = config[L].map((cell) => {
      // ~14% of cells get a soft accent; rest keep ink / existing
      if (rng() < 0.14) {
        return {
          ...cell,
          accent: Math.floor(rng() * n),
          v: cell.v + 1,
          anim: 'none' as const,
          delay: 0,
        }
      }
      // occasionally drop an accent back to ink so it doesn't fill up
      if (cell.accent >= 0 && rng() < 0.08) {
        return { ...cell, accent: -1, v: cell.v + 1, anim: 'none' as const, delay: 0 }
      }
      return cell
    })
  }

  return next
}
