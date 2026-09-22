import './CueMark.css'

/**
 * The changeover cue — RMK's remake marker.
 *
 * A projectionist's changeover cue was a small circle scratched into the
 * upper-right of a frame, a few seconds before the reel ran out: the system
 * telling the operator that this frame is the seam. That is the reference, and
 * the only part of it worth keeping. None of the grain, none of the burn.
 *
 * Three elements, each carrying one of the meanings:
 *
 *   ring   a 300° arc, not a circle. The gap opens toward the upper-right
 *          corner, where the cue has always lived.
 *   seam   a second arc crossing that gap at a LARGER radius, so the ring
 *          overshoots itself rather than closing. This is the splice — two
 *          ends of film joined slightly out of register.
 *   tick   one short radial cut in the gap, and the only cyan on the mark.
 *          Registration, and the thing that says a system made this mark.
 *
 * The imperfection is structural, not textural: it is asymmetric rather than
 * wobbly. Jitter is how the chalk layer relates to a hand, but jitter at 14px
 * just reads as a rendering fault, so here the hand shows up as a ring that
 * does not quite meet.
 *
 * Decorative by definition — whatever the mark means, the text beside it
 * already says. So it is hidden from assistive tech, always.
 */
export interface CueMarkProps {
  /** Extra classes — placement and size live in the consumer's stylesheet. */
  className?: string
}

export default function CueMark({ className }: CueMarkProps) {
  return (
    <svg
      className={['cue', className].filter(Boolean).join(' ')}
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
      shapeRendering="geometricPrecision"
    >
      {/* ring — 300°, gap toward the upper right */}
      <path
        className="cue__ring"
        d="M 8.97 2.49 A 5.6 5.6 0 1 1 13.26 6.08"
        vectorEffect="non-scaling-stroke"
      />
      {/* seam — crosses the gap wide, so the ends overlap out of register */}
      <path
        className="cue__seam"
        d="M 10.26 1.8 A 6.6 6.6 0 0 0 13.72 4.7"
        vectorEffect="non-scaling-stroke"
      />
      {/* tick — one registration cut, the only accent on the mark */}
      <path
        className="cue__tick"
        d="M 10.31 5.24 L 11.21 4.17"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
