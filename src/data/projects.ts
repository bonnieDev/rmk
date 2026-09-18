/** The four accent hues of the mark. Status + live state only — never decoration. */
export type ProjectAccent = 'yellow' | 'coral' | 'cyan' | 'magenta'

/** Colors the RMK mark adopts when this entry is hovered or opened */
export interface LogoPalette {
  ink: string
  accents: string[]
}

/** Structured micro-case-brief. Replaces the old dead-end modal. */
export interface ProjectBrief {
  /** The technical problem the work exists to solve */
  problem: string
  /** How it is actually built — the pipeline, in prose */
  pipeline: string
  /** Where it stands right now */
  milestone: string
}

export interface ProjectStatus {
  label: string
  accent: ProjectAccent
  /** Pulsing pip — reserved for work that is actively running */
  live?: boolean
}

export interface Project {
  id: string
  title: string
  titleEm?: string
  /** Catalog classification, e.g. ORIGINAL IP — rendered as `01 / ORIGINAL IP` */
  category: string
  tagline: string
  role: string
  /** Pipeline / tools, rendered as a delimited technical chain */
  pipeline: string[]
  status: ProjectStatus
  /** Machine-readable year for <time datetime> */
  year: string
  brief: ProjectBrief
  logoPalette: LogoPalette
  /** Optional still cover image, shown in the expanded drawer */
  cover?: string
  /** Optional live demo (iframe) — e.g. Kinedic Bloom autoplay loop */
  demoEmbed?: string
  /**
   * Optional Cloudflare Stream (or similar) iframe src.
   * Use query params for behavior, e.g. autoplay + muted, no loop.
   */
  videoEmbed?: string
}

/* Mark base — carbon is invisible on the abyss field, so the mark reads light */
const BASE = '#eaf2ff'

/**
 * Mark palette — the four hues, lit for the dark field. The halo filter
 * blurs each cell's own colour, so these read as emitted light rather than
 * fill, and stay quiet despite being saturated.
 */
const MARK = {
  /* Pulled from the field itself: the cyan accent, plus lifted versions of the
     blue and copper orbs behind the glass. The mark reads as lit BY the page
     rather than dropped on top of it. */
  cyan: '#00d4ff',
  blue: '#6aa8ff',
  copper: '#e0a06a',
  pale: '#b9d4f2',
} as const

/**
 * Portfolio index — edit this list to reshuffle, rename, or extend the catalog.
 * Order here drives the printed index numbers (01, 02, 03 …).
 */
export const projects: Project[] = [
  {
    id: 'kitty-n-pip',
    title: 'Kitty',
    titleEm: '& Pip',
    category: 'ORIGINAL IP',
    tagline:
      'A silent, all-ages series about two tiny friends who find the forgotten objects of the human world — one adorable misunderstanding at a time.',
    role: 'Character design · AI video · Brand',
    pipeline: ['Character sheets', 'Generative video', 'Edit + grade', 'Series bible'],
    status: { label: 'In production', accent: 'coral', live: true },
    year: '2026',
    brief: {
      problem:
        'Episodic character animation normally needs a crew per minute of screen time. The series had to hold a consistent cast across many shorts without one — silent comedy leaves nowhere for continuity errors to hide.',
      pipeline:
        'Locked character sheets drive generative video passes, which are cut and graded to a house look. The bible fixes silhouette, palette and prop language up front so every downstream shot inherits the same rules.',
      milestone:
        'Cast and visual language locked; shorts in production against the bible.',
    },
    cover: '/projects/kitty-n-pip/cover.jpg',
    logoPalette: { ink: BASE, accents: [MARK.copper, MARK.cyan, MARK.pale] },
  },
  {
    id: 'skull-and-beau',
    title: 'Skull',
    titleEm: '& Beau',
    category: 'CHARACTER SYSTEM',
    tagline:
      'Original character IP, drawn as vectors that render like pixels and stitch like cross-stitch. One source file becomes broadcast animation, screen prints, and soft goods. Also: they’re skeletons, and they’re in love.',
    role: 'Character design · Vector IP · Multi-format',
    pipeline: ['Vector source', 'Grid-locked render', 'Broadcast + print', 'Soft goods'],
    status: { label: 'Active', accent: 'yellow' },
    year: '2026',
    brief: {
      problem:
        'Characters that ship to broadcast, screen print and embroidery usually get redrawn for each destination, and drift apart in the process. One artwork had to survive every output without a redraw.',
      pipeline:
        'The source is vector built on a fixed cell grid, so it rasterizes cleanly as pixel art, separates directly for screen print, and maps one-to-one onto stitch counts. Animation runs off the same file rather than a copy.',
      milestone:
        'Source system proven across film and soft goods from a single master.',
    },
    videoEmbed:
      'https://customer-b3v92lqv0bluwpls.cloudflarestream.com/3c511c1b8adb43f3cc039eef2155933b/iframe?autoplay=true&muted=true&loop=false&controls=false&preload=auto&letterboxColor=transparent',
    logoPalette: { ink: BASE, accents: [MARK.copper, MARK.blue, MARK.cyan] },
  },
  {
    id: 'aether-command',
    title: 'Aether',
    titleEm: 'Command',
    category: 'SYSTEM ARCHITECTURE',
    tagline:
      'A research interface for reasoning with AI across 12,000+ years of genetic and migration data — the person controls what the model can see.',
    role: 'Product design · Front-end · AI',
    pipeline: ['Next.js', 'deck.gl globe', 'Supabase', 'Agentic crew'],
    status: { label: 'In use · patent filed', accent: 'cyan', live: true },
    year: '2026',
    brief: {
      problem:
        'Archaeogenetic data is too large to read and too sparse to trust blindly. Handing an entire corpus to a model produces confident nonsense; the researcher needs to decide what enters the context window, and to see that decision on screen.',
      pipeline:
        'Ancient DNA samples render on a deck.gl globe filtered by a time scrubber, so the visible set is the queried set. A crew of voiced agents narrates guided investigations over that scope, with each claim tied back to the samples on screen.',
      milestone:
        'In active research use. Guided investigation shipped end to end; patent filed on the interaction model.',
    },
    logoPalette: { ink: BASE, accents: [MARK.cyan, MARK.blue, MARK.pale] },
  },
  {
    id: 'kinedic-bloom',
    title: 'Kinedic',
    titleEm: 'Bloom',
    category: 'INTERACTION SYSTEM',
    tagline:
      'A passive+active adaptive interface that blooms in real time — reading dwell, motor noise, and cognitive load, then reshaping the surface.',
    role: 'Interaction design · Systems',
    pipeline: ['Input telemetry', 'Load model', 'Adaptive layout', 'Live demo loop'],
    status: { label: 'Prototype', accent: 'magenta', live: true },
    year: '2026',
    brief: {
      problem:
        'Accessibility settings ask people to declare needs in advance, once, in a settings panel — which is exactly when they know least about them. Need changes by the hour: fatigue, tremor, distraction, context.',
      pipeline:
        'The surface reads dwell time, pointer jitter and correction rate as continuous signals rather than a stored profile, then reshapes target size, density and pacing in place. No declaration, no mode switch.',
      milestone:
        'Working prototype with a live demo loop; patent proposal drafted.',
    },
    demoEmbed: '/demos/kinedic-bloom.html',
    logoPalette: { ink: BASE, accents: [MARK.blue, MARK.cyan, MARK.copper] },
  },
  {
    id: 'frostbyte',
    title: 'Frost',
    titleEm: 'Byte',
    category: 'NARRATIVE SYSTEM',
    tagline:
      'A programmer torn into a strange world as Frostbyte — broadcast, memory, and purpose braided through hermetic structure and live transmission.',
    role: 'Worldbuilding · Story systems',
    pipeline: ['Structural framework', 'Voice + transmission', 'Serialized release'],
    status: { label: 'In development', accent: 'yellow' },
    year: '2026',
    brief: {
      problem:
        'A world told in fragments across broadcast, text and transmission falls apart without a structure underneath it. Continuity cannot be held in the author’s head once the release is serialized.',
      pipeline:
        'A fixed structural framework governs the canon — kernels of the world set in advance, with a documented method for reconciling each new fragment against what is already established before it ships.',
      milestone:
        'Framework and voice established; chapters drafting against the structure.',
    },
    logoPalette: { ink: BASE, accents: [MARK.pale, MARK.cyan, MARK.blue] },
  },
]

/** Quiet default while nothing is hovered — carbon with a single warm tick */
export const defaultLogoPalette: LogoPalette = {
  ink: BASE,
  accents: [MARK.cyan, MARK.blue, MARK.copper],
}
