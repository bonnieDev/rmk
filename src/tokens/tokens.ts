/**
 * Typed mirror of tokens.css for use inside React logic
 * (e.g. picking module colors in the remake engine).
 * Keep in sync with tokens.css.
 */
export const tokens = {
  color: {
    ground: '#f4f2ec',
    paper: '#faf9f5',
    groundDeep: '#eae7df',
    ink: '#141414',
    ink2: '#1f1f1f',
    inkMuted: '#6a6a63',
    inkFaint: '#9b9b93',
    line: '#e2e2df',
    lineStrong: '#c9c8c2',
    yellow: '#f4a72c',
    yellowDeep: '#9a6300',
    coral: '#ff7a3d',
    coralDeep: '#c2410c',
    cyan: '#81d8d0',
    cyanDeep: '#0f766e',
    magenta: '#ff5c8a',
    magentaDeep: '#b32455',
    /* Muted set — the generative mark only */
    yellowMute: '#c7a56b',
    coralMute: '#cf8863',
    cyanMute: '#8ec2be',
    magentaMute: '#d27f95',
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
