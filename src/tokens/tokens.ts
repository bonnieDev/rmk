/**
 * Typed mirror of tokens.css for use inside React logic
 * (e.g. picking module colors in the remake engine).
 * Keep in sync with tokens.css.
 */
export const tokens = {
  color: {
    ground: '#070b16',
    groundRaised: '#0f1a2e',
    paper: 'rgba(255,255,255,0.05)',
    ink: '#eaf2ff',
    ink2: '#cfe0f5',
    inkMuted: '#a3b6d0',
    inkFaint: '#7d93b0',
    line: 'rgba(255,255,255,0.10)',
    lineStrong: 'rgba(255,255,255,0.20)',
    yellow: '#ffc94d',
    yellowDeep: '#ffd97a',
    coral: '#ff7a45',
    coralDeep: '#ff9e75',
    cyan: '#00d4ff',
    cyanDeep: '#6fe3ff',
    magenta: '#ff5c8a',
    magentaDeep: '#ff8fb0',
    orbCopper: '#b87333',
    orbBlue: '#2563eb',
  },
  font: {
    display: '"Space Grotesk", "Helvetica Neue", Helvetica, Arial, sans-serif',
    body: '"Space Grotesk", "Helvetica Neue", Helvetica, Arial, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
  },
  motion: {
    scanIntervalMs: 240,
    pulseIntervalMs: 1800,
  },
} as const

/** The four accent hues of the mark. Status + live state only. */
export const ACCENTS = ['yellow', 'coral', 'cyan', 'magenta'] as const
export type Accent = (typeof ACCENTS)[number]
