import type { LogoPalette } from '../../data/projects'

export type LetterKey = 'R' | 'M' | 'K'

export type ShapeType = 'square' | 'circle' | 'round' | 'wedge'

export type CornerKey = 'tl' | 'tr' | 'br' | 'bl'

export interface CornerFlags {
  tl: boolean
  tr: boolean
  br: boolean
  bl: boolean
}

export type CellShape =
  | { type: 'square' }
  | { type: 'circle' }
  | { type: 'round'; corners: CornerFlags }
  | { type: 'wedge'; cut: CornerKey }

export type CellAnim = 'pop' | 'none'

export interface LogoCell {
  r: number
  c: number
  shape: CellShape
  /** -1 = base ink; 0..n indexes palette accents */
  accent: number
  v: number
  anim: CellAnim
  delay: number
}

export type LetterConfig = Record<LetterKey, LogoCell[]>

export type Phase = 'MK' | 'RMK' | 'MKR'

/** slow = idle · hover = quiet palette whisper · burst = click distraction */
export type LogoPace = 'slow' | 'hover' | 'burst' | 'fast'

export interface GenerativeRMKLogoProps {
  /** Project/seed name — same seed always yields the same mark */
  seed?: string
  paused?: boolean
  className?: string
  /** Show seed + remake controls under the mark */
  showControls?: boolean
  /** Active color scheme (card hover / click drives this) */
  palette?: LogoPalette
  /**
   * Remake tempo:
   * - slow: idle breath
   * - hover: subtle palette shift (card hover)
   * - burst: rapid remake (card click / dead-end cover)
   */
  pace?: LogoPace
  /** Compact mark for sticky header — smaller cells, no ticker */
  compact?: boolean
  /** Hide the MK / RMK / MKR baseline ticker */
  hideTicker?: boolean
}
