export type ProjectAccent = 'pink' | 'tiff' | 'poppy' | 'green' | 'amber'

/** Colors the RMK mark adopts when this card is hovered */
export interface LogoPalette {
  ink: string
  accents: string[]
}

export interface Project {
  id: string
  title: string
  titleEm?: string
  eyebrow: string
  premise: string
  role: string
  status: string
  accent: ProjectAccent
  /** CSS visual treatment for the card media area (fallback / underlay) */
  visual: 'cozy' | 'jewel' | 'bloom' | 'frost'
  logoPalette: LogoPalette
  /** Optional still cover image under the media chrome */
  cover?: string
  /** Optional live demo (iframe) — e.g. Kinedic Bloom autoplay loop */
  demoEmbed?: string
  /**
   * Optional Cloudflare Stream (or similar) iframe src.
   * Use query params for behavior, e.g. autoplay + muted, no loop.
   */
  videoEmbed?: string
}

/**
 * Portfolio index — edit this list to reshuffle, rename, or stub work.
 * Full case studies live as HTML prototypes outside the React app for now.
 */
export const projects: Project[] = [
  {
    id: 'kitty-n-pip',
    title: 'Kitty',
    titleEm: '& Pip',
    eyebrow: 'Original IP · In production',
    premise:
      'A silent, all-ages series about two tiny friends who find the forgotten objects of the human world — one adorable misunderstanding at a time.',
    role: 'Character design · AI video · Brand',
    status: 'In production · 2026',
    accent: 'pink',
    visual: 'cozy',
    cover: '/projects/kitty-n-pip/cover.jpg',
    logoPalette: {
      ink: '#3a2a28',
      accents: ['#ff5c8a', '#fce9be', '#b87a6e', '#6e5578'],
    },
  },
  {
    id: 'skull-and-beau',
    title: 'Skull',
    titleEm: '& Beau',
    eyebrow: 'Original IP · Character system',
    premise:
      'Original character IP, drawn as vectors that render like pixels and stitch like cross-stitch. One source file becomes broadcast animation, screen prints, and soft goods. Also: they’re skeletons, and they’re in love.',
    role: 'Character design · Vector IP · Multi-format',
    status: 'Active · film & soft goods',
    accent: 'poppy',
    visual: 'cozy',
    videoEmbed:
      'https://customer-b3v92lqv0bluwpls.cloudflarestream.com/3c511c1b8adb43f3cc039eef2155933b/iframe?autoplay=true&muted=true&loop=false&controls=false&preload=auto&letterboxColor=transparent',
    logoPalette: {
      ink: '#1a1218',
      accents: ['#ff7a3d', '#fce9be', '#e8d5c4', '#6e5578'],
    },
  },
  {
    id: 'aether-command',
    title: 'Aether',
    titleEm: 'Command',
    eyebrow: 'Self-directed · Research intelligence',
    premise:
      'A research interface for reasoning with AI across 12,000+ years of genetic and migration data — the person controls what the model can see.',
    role: 'Product design · Front-end · AI',
    status: 'In active use · patent filed',
    accent: 'tiff',
    visual: 'jewel',
    logoPalette: {
      ink: '#141d38',
      accents: ['#81d8d0', '#ff5c8a', '#3a2a5a', '#155e63'],
    },
  },
  {
    id: 'kinedic-bloom',
    title: 'Kinedic',
    titleEm: 'Bloom',
    eyebrow: 'Adaptive UI · Live demo',
    premise:
      'A passive+active adaptive interface that blooms in real time — reading dwell, motor noise, and cognitive load, then reshaping the surface.',
    role: 'Interaction design · Systems',
    status: 'Prototype · demo loop',
    accent: 'green',
    visual: 'bloom',
    demoEmbed: '/demos/kinedic-bloom.html',
    logoPalette: {
      ink: '#241e2b',
      accents: ['#f0567a', '#12b981', '#5bc7c0', '#f4a72c'],
    },
  },
  {
    id: 'frostbyte',
    title: 'Frost',
    titleEm: 'Byte',
    eyebrow: 'Narrative IP · Mythic framework',
    premise:
      'A programmer torn into a strange world as Frostbyte — broadcast, memory, and purpose braided through hermetic structure and live transmission.',
    role: 'Worldbuilding · Story systems',
    status: 'In development',
    accent: 'amber',
    visual: 'frost',
    logoPalette: {
      ink: '#0c1526',
      accents: ['#a8d8ff', '#81d8d0', '#2a4a6a', '#f4a72c'],
    },
  },
]

/** Quiet default while no card is hovered */
export const defaultLogoPalette: LogoPalette = {
  ink: '#16233b',
  accents: ['#ff7a3d', '#81d8d0', '#ff5c8a'],
}
