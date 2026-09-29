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

/** One still in a project's gallery */
export interface ProjectStill {
  src: string
  /** Describes what the image shows — read aloud by screen readers */
  alt: string
  /** Short label for the caption bar */
  caption: string
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
  /** Optional set of stills — first is shown, thumbnails swap it in place */
  stills?: ProjectStill[]
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
    stills: [
      {
        src: '/projects/aether-command/ghost-still-2.jpg',
        caption: 'Globe · 14,753 nodes',
        alt: 'The Aether Command globe: 14,753 ancient DNA samples glow as colored nodes over the night side of the Earth, trade-route arcs orbit it, and the command sidebar and time scrubber frame the view.',
      },
      {
        src: '/projects/aether-command/ghost-still-3.jpg',
        caption: 'Flashlight · two lit areas',
        alt: 'Flashlight mode: the globe is dimmed except two lit circles that reveal clusters of ancient DNA samples around the Black Sea and the Levant, with a signal-threshold note and the flash search panel open.',
      },
      {
        src: '/projects/aether-command/ghost-still-1.jpg',
        caption: 'Entry screen',
        alt: 'The Ghost Crown entry screen: the Ghost Crown wordmark, a quote in English and Lithuanian over a blurred golden crown, and the Aether Command sign-in panel.',
      },
    ],
    logoPalette: { ink: BASE, accents: [MARK.cyan, MARK.blue, MARK.pale] },
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
    id: 'lil-swaps',
    title: 'lil',
    titleEm: 'swaps',
    category: 'BEHAVIOR SYSTEM',
    tagline:
      'A collectible-card game built on current environmental research — every card is a change someone actually made, ranked by how much it measurably cut.',
    role: 'Product design · Front-end · WebGL',
    pipeline: ['React + Vite', 'WebGL card shaders', 'Research sweep', 'Voiced announcer'],
    status: { label: 'Playable build', accent: 'coral', live: true },
    year: '2026',
    brief: {
      problem:
        'Environmental advice fails in both directions: too shallow to act on, or too dependent on evidence that moves faster than anyone can follow. And acting produces no feedback — you change a habit and nothing visibly happens, so nothing sticks.',
      pipeline:
        'A research sweep distills current findings into ten ranked offenders, each carrying sourced reasoning and realistic alternatives priced in absolute footprint points. Committing one is a game action: the choice becomes a collectible whose rarity is earned by the measured reduction, dealt in WebGL with the card flip, the cut and the announcer all landing on a single frame.',
      milestone:
        'Learn → Swap → Collect playable end to end. Share, Ripple and Return designed and specified, not yet built.',
    },
    logoPalette: { ink: BASE, accents: [MARK.copper, MARK.pale, MARK.cyan] },
  },
{
    id: 'listening-room',
    title: 'Listening',
    titleEm: 'Room',
    category: 'SCORE SYSTEM',
    tagline:
      'An original score for a map, where nobody picks the track \u2014 the year you are looking at and the place you are looking at pick it for you.',
    role: 'Composition \u00b7 Systems \u00b7 Front-end',
    pipeline: ['Score manifest', 'Time \u00d7 place resolver', 'Two-deck crossfade', 'Live audition room'],
    status: { label: 'Playable', accent: 'magenta', live: true },
    year: '2026',
    brief: {
      problem:
        'A soundtrack keyed to time alone cannot answer a map. At 800 CE the Rhine, Baghdad and the Orkhon are all true at once, and a timeline has no way to say which one is on screen \u2014 so the score either picks one civilisation and is wrong about the others, or plays nothing.',
      pipeline:
        'Every track declares a year window and, where it belongs to a people rather than a period, a home ground. Time decides what is possible; place decides which of the possible, and a track playing outside the ground it names is penalised rather than merely unrewarded. One track claims no moment at all and plays when nothing specific does. The player runs two decks so the handover is a crossfade rather than a cut.',
      milestone:
        'Eight tracks resolving by time and place, running inside the source application; the audition room publishes the manifest so the selection logic is legible without it.',
    },
    demoEmbed: '/demos/listening-room.html',
    logoPalette: { ink: BASE, accents: [MARK.cyan, MARK.blue, MARK.copper] },
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
]

/** Quiet default while nothing is hovered — carbon with a single warm tick */
export const defaultLogoPalette: LogoPalette = {
  ink: BASE,
  accents: [MARK.cyan, MARK.blue, MARK.copper],
}
