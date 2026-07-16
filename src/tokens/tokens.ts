/**
 * Typed mirror of tokens.css for use inside React logic
 * (e.g. picking module colors in the remake engine).
 * Keep in sync with tokens.css.
 */
export const tokens = {
  color: {
    ground: '#fff7ee',
    paper: '#ffffff',
    ink: '#16233b',
    inkMuted: '#7b7a86',
    tiff: '#81d8d0',
    green: '#17b26a',
    poppy: '#ff7a3d',
    pink: '#ff5c8a',
    amber: '#f4a72c',
  },
  font: {
    display: '"Fraunces", Georgia, serif',
    body: '"Figtree", system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
  },
  motion: {
    scanIntervalMs: 240,
    pulseIntervalMs: 1800,
  },
} as const