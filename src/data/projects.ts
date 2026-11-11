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
  /**
   * Optional Cloudflare Stream iframe src: this gallery item is a video.
   * `src` is then its thumbnail, and `alt` names the video.
   */
  video?: string
}

export interface ProjectStatus {
  label: string
  accent: ProjectAccent
  /** Pulsing pip — reserved for work that is actively running */
  live?: boolean
}

/** Which part of the index a project sits in, in this order */
export type ProjectGroup = 'interfaces' | 'access' | 'creative'

export const projectGroups: { id: ProjectGroup; label: string }[] = [
  { id: 'interfaces', label: 'Complex interfaces' },
  { id: 'access', label: 'Accessibility' },
  { id: 'creative', label: 'Creative work' },
]

export interface Project {
  id: string
  group: ProjectGroup
  title: string
  titleEm?: string
  /** Catalog classification, e.g. ORIGINAL IP — rendered as `01 / ORIGINAL IP` */
  category: string
  /** What it is, in plain words. Shown big, with the name small above it */
  what: string
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
  /** The video has its own soundtrack: it loops muted, with a sound toggle */
  videoSound?: boolean
  /** Credit shown in the video's caption, e.g. the composer */
  videoCredit?: string
  /** Still shown in the player before the video starts, e.g. '/bombaStill.jpg' */
  videoPoster?: string
  /** Live sites and pages, shown as buttons right under the title; the first is the main one */
  links?: { href: string; label: string }[]
}

/* Mark base — warm off-white, never pure white */
const BASE = '#f3f2ef'

/**
 * Mark palette — one accent: amber, plus a deeper copper and a quiet grey.
 * The keys are the old hue names so each project's mix still reads; every
 * value is on the site's single-accent palette.
 */
const MARK = {
  cyan: '#f2a93b',
  blue: '#f7c271',
  copper: '#c9772f',
  pale: '#d6d5d1',
} as const

/**
 * Portfolio index — edit this list to reshuffle, rename, or extend the catalog.
 * Order here drives the printed index numbers (01, 02, 03 …).
 */
export const projects: Project[] = [
  {
    id: 'aether-command',
    group: 'interfaces',
    title: 'Aether',
    titleEm: 'Command',
    category: 'SYSTEM ARCHITECTURE',
    what: 'An AI research tool for genetic history',
    tagline:
      'A research interface for reasoning with AI across 12,000+ years of genetic and migration data — the person controls what the model can see.',
    role: 'Art direction · Product design · Front-end · AI',
    pipeline: ['Next.js', 'deck.gl globe', 'Supabase', 'Agentic crew'],
    status: { label: 'In use · patent pending', accent: 'cyan', live: true },
    year: '2026',
    brief: {
      problem:
        'Archaeogenetic data is too large to read and too sparse to trust blindly. Handing an entire corpus to a model produces confident nonsense; the researcher needs to decide what enters the context window, and to see that decision on screen.',
      pipeline:
        'Ancient DNA samples render on a deck.gl globe filtered by a time scrubber, so the visible set is the queried set. A crew of voiced agents narrates guided investigations over that scope, with each claim tied back to the samples on screen.',
      milestone:
        'In active research use. Guided investigation shipped end to end; provisional patent filed on the interaction model.',
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
    links: [{ href: 'https://www.ghostcrown.co/', label: 'Visit ghostcrown.co' }],
    logoPalette: { ink: BASE, accents: [MARK.cyan, MARK.blue, MARK.pale] },
  },
  {
    id: 'lil-swaps',
    group: 'interfaces',
    title: 'lil',
    titleEm: 'swaps',
    category: 'BEHAVIOR SYSTEM',
    what: 'A card game about real climate fixes',
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
    id: 'otherly',
    group: 'interfaces',
    title: 'Otherly',
    titleEm: '& SNBN',
    category: 'COMMERCE SYSTEM',
    what: 'One store for all my brands',
    tagline:
      'One Shopify store for every brand I make, with a shopping cartoon broadcasting from Purgatory inside it. The hosts refuse to do sales pitches, so a Marketing Ghoul possesses them to read the product facts.',
    role: 'Art direction · Brand · Illustration · Merch design · Interaction design · Theme architecture · Built with Claude Code',
    pipeline: ['Shopify OS 2.0 theme', 'Plain CSS role tokens', 'React + Three.js broadcast', 'GA4 journeys · WCAG 2.2 AA'],
    status: { label: 'Live on otherly.shop', accent: 'magenta', live: true },
    year: '2026',
    brief: {
      problem:
        'Four brands, one store budget. Each needed its own look and voice without four Shopify stores, and the selling had to stay honest inside a show whose whole joke is selling: no invented prices, no fake urgency, and always clear when it’s marketing.',
      pipeline:
        'A custom Online Store 2.0 theme in plain CSS. A product’s brand comes from a tag; shared components read role tokens; each brand look is a tokens file and a layout. Illusion leggings are one product per printed skin-tone shade, so the theme groups them by design and builds the color picker from the shades that exist. SNBN runs on the same products: when real product facts come up, the studio cuts to night-vision footage and the Marketing Ghoul possesses Skull or Beau to read them in a different voice. A QVC-parody item box shows only real prices beside a joke Purgatory “price” that is never money; recorded call-ins and Ouijanet messages attach to products. Accessible to WCAG 2.2 AA, with consent-gated GA4 journey tagging. I drew the characters and merch in Illustrator and built it with Claude Code as my coding partner.',
      milestone:
        'Live with the Halloween drop, the SNBN studio and Skull’s stage. Next: slots on the show for other indie makers.',
    },
    stills: [
      {
        src: '/projects/skull-and-beau/possessed.jpg',
        caption: 'Skull, possessed',
        alt: 'SNBN in grey night-vision footage marked CAM 2 · NIGHT: Skull, possessed by the Marketing Ghoul, beside a Heart Webs crewneck on the studio screen, captioned “Behold. The Heart Webs Crewneck Sweatshirt. I invented this. Spiritually.”',
      },
      {
        src: '/projects/skull-and-beau/ghoul-arrives.jpg',
        caption: 'The Marketing Ghoul arrives',
        alt: 'The SNBN studio in color: a green MARKETING GHOUL card with a cursed pixel sunshine face flashes over Skull as her bow starts to spin, with Beau in his purple beret at the desk.',
      },
      {
        src: '/projects/skull-and-beau/night-shop.jpg',
        caption: 'The store stays in color',
        alt: 'A wide shot of the SNBN studio in night-vision grey while the real store panel beside it stays in full color, showing a camo crop tee with its price and options.',
      },
    ],
    links: [
      { href: 'https://otherly.shop/', label: 'Visit otherly.shop' },
      { href: 'https://otherly.shop/pages/snbn', label: 'Watch SNBN' },
    ],
    logoPalette: { ink: BASE, accents: [MARK.cyan, MARK.copper, MARK.pale] },
  },
  {
    id: 'kinedic-bloom',
    group: 'access',
    title: 'Kinedic',
    titleEm: 'Bloom',
    category: 'INTERACTION SYSTEM',
    what: 'An interface that adapts to you',
    tagline:
      'An interface that adapts to the person using it, reading friction as it happens instead of asking people to declare their limitations up front.',
    role: 'Interaction design · Systems',
    pipeline: ['Behavioral signals', 'Friction model', 'Adaptive layout', 'Tab-ready check', 'Friction report', 'Open source · GPLv3'],
    status: { label: 'v0.7 · open source', accent: 'magenta', live: true },
    year: '2026',
    brief: {
      problem:
        'Interfaces decide what you can do before they know anything about you. The page loads assuming you can see it, read it, aim a pointer and fill in a form, and the accessibility settings that might help sit behind those same abilities. Asking people to declare their limitations once, up front, also misses that need changes by the hour: fatigue, tremor, distraction.',
      pipeline:
        'An adaptive layer notices when someone is struggling with the page and responds in real time: it enlarges controls, widens spacing and simplifies complex questions. No declaration, no mode switch. If friction keeps climbing, the design hands off to a voice mode, so the person can finish the task by talking instead of fighting the screen.',
      milestone:
        'v0.7 is open source and runs on desktop, phone and tablet in the live demo: larger targets, a “Shaky hands?” offer that makes everything bigger, text that gets bigger on its own when someone seems to be hunting for a way to enlarge it, keyboard mode with spoken-ready descriptions, a tab-ready check that fixes what it safely can, autofill and readable phone numbers, a friction report of what people wanted and what they hit instead, an easy form, a request for a call or a doctor’s help that goes with the form (only if the person chooses), and a break you can pause and come back to. Voice and database hooks are marked for developers to plug in.',
    },
    demoEmbed: '/demos/kinedic-bloom.html',
    logoPalette: { ink: BASE, accents: [MARK.blue, MARK.cyan, MARK.copper] },
  },
  {
    id: 'bounce-cal',
    group: 'access',
    title: 'Bounce',
    titleEm: 'Cal',
    category: 'PRIVACY BY DESIGN',
    what: 'A planner for people who hate calendars',
    tagline:
      'Feed it all the things you need to do, and it breaks them into little bits you can do whenever you feel like it through the day.',
    role: 'Product design · Front-end',
    pipeline: ['Next.js static export', 'Plan stored on the device', 'Opt-in Google Calendar & Drive', 'Opt-in Claude, own key'],
    status: { label: 'Private · in daily use', accent: 'cyan', live: true },
    year: '2026',
    brief: {
      problem:
        'Calendars assume you’ll follow a schedule. Plenty of people can at work, and it falls apart for the rest of life. Built ADHD-first: start from the hardest case and build for the people the default forgets.',
      pipeline:
        'Everything goes into one text box and comes back as small bits, with no time estimates and no guilt words. The plan lives on the device: no server, no analytics. Anything that leaves the device is opt-in and labeled.',
      milestone: 'Private. In daily use while the kinks get worked out.',
    },
    stills: [
      {
        src: '/projects/bounce-cal/bounce-cal-dig-in.jpg',
        caption: 'Dig in · sample plan',
        alt: 'Bounce Cal in Dig in mode, filled with a sample plan: a red track for getting the garden ready, with blue bubbles for small side tasks like feeding a bread starter, two quieter tracks for baking bread and clearing out the garage, and a card below that says Do this: Order seeds, with Done and Later buttons. The top bar reads saved on this device.',
      },
      {
        src: '/projects/bounce-cal/bounce-cal-bounce.jpg',
        caption: 'Bounce around · sample plan',
        alt: 'Bounce Cal in Bounce around mode with the same sample plan: blue bubbles float around the tracks, each a small task such as Clean the bread tins or Fill one donation box, under the line Tap a bubble. Stay as long as it flows.',
      },
    ],
    logoPalette: { ink: BASE, accents: [MARK.copper, MARK.cyan, MARK.pale] },
  },
  {
    id: 'kinedic-tripwire',
    group: 'access',
    title: 'Kinedic',
    titleEm: 'Tripwire',
    category: 'SECURITY RESEARCH',
    what: 'A bot check that never locks anyone out on its own',
    tagline:
      'A research prototype for catching replayed cursor recordings, designed so the people most likely to be wrongly flagged never are.',
    role: 'Concept · Design · Build · Testing',
    pipeline: ['Next.js', 'TypeScript', 'Plain CSS'],
    status: { label: 'Private prototype', accent: 'magenta' },
    year: '2026',
    brief: {
      problem:
        'Bot checks that read mouse movement can be beaten by replaying a real person’s recorded movement. And people with tremor, low vision or slow reactions might not pass a movement check at all.',
      pipeline:
        'So Tripwire is never the only gate. An unsure answer always hands off to another check, and keyboard and touch users are never judged. Raw cursor paths never leave the browser. It builds on established, patented work in behavioral biometrics. What’s mine is the build, the testing, and the safeguards.',
      milestone: 'Private prototype. Case study and demo on request.',
    },
    links: [{ href: 'https://www.linkedin.com/in/rmksystems', label: 'Ask for the case study and demo on LinkedIn' }],
    logoPalette: { ink: BASE, accents: [MARK.pale, MARK.copper, MARK.cyan] },
  },
  {
    id: 'digital-decoder',
    group: 'access',
    title: 'The Digital',
    titleEm: 'Decoder',
    category: 'EXPLAINER DESIGN',
    what: 'A tech explainer you can play with',
    tagline:
      'Tech literacy in plain English, set as a newspaper you can play with. Issue No. 1 makes quantum computing’s threat to encryption land without a technical background.',
    role: 'Writing · Editorial design · Front-end',
    pipeline: ['Plain-language script', 'Editorial layout', 'Interactive cipher', 'Classical vs. quantum race'],
    status: { label: 'Issue No. 1', accent: 'yellow' },
    year: '2026',
    brief: {
      problem:
        'Quantum computing’s threat to encryption is usually explained in jargon, which loses exactly the people who most need to understand it. The piece had to make the idea land for a reader with no technical background, without scaring them.',
      pipeline:
        'It starts from something familiar, a Cracker Jack decoder ring, and builds from there. Two interactions carry the argument: drag the ring to encode and decode a message with a real Caesar cipher, then drag a slider to watch the gap between a classical and a quantum computer grow with key length. One self-contained page, set as a vintage broadsheet.',
      milestone:
        'Issue No. 1, “The Digital Decoder Ring,” is complete. More tech-literacy issues to follow.',
    },
    demoEmbed: '/demos/digital-decoder-ring.html',
    logoPalette: { ink: BASE, accents: [MARK.copper, MARK.pale, MARK.blue] },
  },
  {
    id: 'skull-and-beau',
    group: 'creative',
    title: 'Skull',
    titleEm: '& Beau',
    category: 'ORIGINAL IP',
    what: 'Cartoon characters for grown-ups',
    tagline:
      'Hello Kitty for grown-ups. Two skeletons in love, a sentient travel cup and a Rorschach self-help guru, now running their own shopping network from Purgatory. Skull also thinks she’s a pop star.',
    role: 'Worldbuilding · Characters · Music · Creative direction · Built with Claude Code',
    pipeline: ['Pixel-vector characters', 'WebGL studio (R3F)', 'Beat-synced stage', 'Multi-brand Shopify'],
    status: { label: 'Live on otherly.shop', accent: 'magenta', live: true },
    year: '2026',
    brief: {
      problem:
        'Two years of characters, lore, a book and songs lived in documents. The world needed somewhere people could walk into and buy from, without the characters drifting off-model or the jokes leaking into the commerce.',
      pipeline:
        'The original Illustrator art is the rig, and the character rules are enforced in code: only the eyes and tooth holes animate, bones never gesture, Stanielle never speaks. SNBN is a WebGL shopping network where four characters run a scripted broadcast through a validated action queue, pitching real products; prices and stock only ever come from the store. SNBN Presents: Skull stages two of her songs, “McBling” and the Halloween “How We Boo It”: the visitor picks one, cues are timed from an analysis of each track, and her mouth follows the vocals alone, split from the horns with a stem separator. It all lives inside Otherly, a multi-brand Shopify theme I directed and built with Claude Code from my briefs.',
      milestone:
        'Live: the store, the SNBN studio and Skull’s stage with two songs. Next: “Bow Shaker”, more call-ins, and pixel puppets cut from the Illustrator layers.',
    },
    demoEmbed: '/demos/skull-live.html',
    links: [
      { href: 'https://otherly.shop/pages/snbn', label: 'Watch SNBN on otherly.shop' },
      { href: 'https://otherly.shop/pages/dead-cute-wiki', label: 'Read the lore: the Dead Cute wiki' },
    ],
    logoPalette: { ink: BASE, accents: [MARK.copper, MARK.blue, MARK.cyan] },
  },
  {
    id: 'kitty-n-pip',
    group: 'creative',
    title: 'Kitty',
    titleEm: '& Pip',
    category: 'ORIGINAL IP',
    what: 'A silent, all-ages video series',
    tagline:
      'A silent, all-ages series about two tiny friends who find the forgotten objects of the human world — one adorable misunderstanding at a time.',
    role: 'Art direction · Character design · Generative video · Brand',
    pipeline: ['Character sheets + turnarounds', 'Series bible', 'Shot-by-shot storyboard', 'Generative video', 'Edit + grade'],
    status: { label: 'In production', accent: 'coral' },
    year: '2026',
    brief: {
      problem:
        'Episodic character animation normally needs a crew per minute of screen time. The series had to hold a consistent cast across many shorts without one — silent comedy leaves nowhere for continuity errors to hide.',
      pipeline:
        'Every episode runs the same loop. Kitty and Pip find something nobody uses anymore, the kind of thing kids still spot in thrift stores or on TV and wonder about. They mess with it, they think they’re in trouble, and Grandma Cabbit comes in, fixes it, and everything is OK. Locked character sheets and turnarounds drive the generative video passes, which are cut and graded to a house look. The bible fixes silhouette, palette and prop language up front so every downstream shot inherits the same rules.',
      milestone:
        'Episode 01, “The Resonant Bell,” is about a rotary telephone. It’s storyboarded in eight shots, each with its framing, action and sound, and early motion tests are under way. Cast and visual language locked.',
    },
    stills: [
      {
        src: '/projects/kitty-n-pip/storyboard.jpg',
        caption: 'Storyboard · Ep. 01, The Resonant Bell',
        alt: 'The production storyboard for Kitty & Pip Episode 01, The Resonant Bell: eight amber-lit frames in a 1970s living room with shag carpet and a black rotary telephone, each titled, from Shot 01, The Approach, to Shot 08, The Resonant Bell.',
      },
      {
        src: '/projects/kitty-n-pip/turnarounds.jpg',
        caption: 'Turnarounds',
        alt: 'Character turnarounds on a dark sheet. Top: Kitty, a fluffy tabby kitten in a striped rainbow tutu and neck scarf, from the front, three-quarter, side and back. Bottom: Pip, a white lop-eared bunny in a raglan tee with a bunny print and rolled grey jeans, from the same four angles.',
      },
      {
        src: '/projects/kitty-n-pip/viewmaster.jpg',
        caption: 'Another find · the View-Master',
        alt: 'Kitty and Pip sit on amber shag carpet in the sunlit 1970s living room, staring wide-eyed at a red View-Master toy viewer on the floor between them, with the rotary phone, a crocheted afghan couch and baskets of yarn around them.',
      },
      {
        src: '/projects/kitty-n-pip/portrait.jpg',
        caption: 'Key art',
        alt: 'Kitty and Pip sit side by side on blue velvet, looking up, with large soft-focus portraits of their faces glowing in the dark blue background.',
      },
      {
        src: 'https://customer-b3v92lqv0bluwpls.cloudflarestream.com/440039f37b9e59937dde130236738710/thumbnails/thumbnail.jpg?time=1s&height=200',
        video: 'https://customer-b3v92lqv0bluwpls.cloudflarestream.com/440039f37b9e59937dde130236738710/iframe?autoplay=true&muted=true&loop=true&controls=false&preload=auto&letterboxColor=transparent&poster=https%3A%2F%2Fcustomer-b3v92lqv0bluwpls.cloudflarestream.com%2F440039f37b9e59937dde130236738710%2Fthumbnails%2Fthumbnail.jpg%3Ftime%3D1s%26height%3D600',
        caption: 'Motion test · The Approach',
        alt: 'motion test of Shot 01: Kitty and Pip crawl across amber shag carpet toward a black rotary telephone in a sunlit 1970s living room',
      },
      {
        src: '/projects/kitty-n-pip/moodboard.jpg',
        caption: 'Initial moodboard',
        alt: 'The initial Kitty & Pip moodboard: a collage of early kitten and bunny looks in dresses, tutus and hoodies, some beside rotary telephones, with Kitty & Pip in script across the middle.',
      },
      {
        src: '/projects/kitty-n-pip/paw-logo.jpg',
        caption: 'Logo · Kitty’s paw on the glass',
        alt: 'The Kitty n Pip logo: Kitty has breathed on a window and pressed her paw into the fog to show Pip is her best friend. The black paw print has P, I, P on three toe pads, with streaks wiped across the glass, over the script wordmark Kitty n Pip and a small heart.',
      },
    ],
    logoPalette: { ink: BASE, accents: [MARK.copper, MARK.cyan, MARK.pale] },
  },
  {
    id: 'cher-bomba',
    group: 'creative',
    title: 'Cher',
    titleEm: 'Bomba',
    category: 'MOTION',
    what: 'An animated short with an original song',
    tagline:
      'A cherry, a bomb, and one very big lift. A short for Bunny Anarchy: funny, cute, and a little unruly, set to an original song by Moia.',
    role: 'Motion design · Edit',
    pipeline: ['Generated footage', 'After Effects', 'Original score · Moia'],
    status: { label: 'Released', accent: 'coral' },
    year: '2026',
    brief: {
      problem:
        'Bunny Anarchy runs on attitude, and attitude does not survive being explained. The piece had to land the brand’s voice in motion, with no copy to lean on.',
      pipeline:
        'Generated clips cut, composited and timed in After Effects, set to an original song composed by Moia.',
      milestone:
        'Released on LinkedIn.',
    },
    videoEmbed:
      'https://customer-b3v92lqv0bluwpls.cloudflarestream.com/f3991de4540fffbfd31b4914480526b7/iframe?autoplay=true&muted=true&loop=true&controls=false&preload=auto&letterboxColor=transparent',
    videoSound: true,
    videoPoster: '/bombaStill.jpg',
    videoCredit: 'Music · Moia',
    logoPalette: { ink: BASE, accents: [MARK.copper, MARK.cyan, MARK.pale] },
  },
  {
    id: 'bunny-anarchy',
    group: 'creative',
    title: 'Bunny',
    titleEm: 'Anarchy',
    category: 'ORIGINAL IP',
    what: 'A fashion and art brand',
    tagline:
      'Fashion, art and controlled chaos built around one idea: empowerment does not have a dress code.',
    role: 'Brand · Character design · Front-end',
    pipeline: ['Shopify storefront', 'Character IP', 'React Three Fiber arcade', 'SVG + DOM motion'],
    status: { label: 'Shop live on otherly.shop', accent: 'coral', live: true },
    year: '2026',
    brief: {
      problem:
        'A merch storefront is usually a grid of products. The brand needed the site itself to carry the attitude, with characters that react to the visitor, without burying the shop or slowing the page.',
      pipeline:
        'A single static page with Shopify buy buttons. The Bunny Anarcade, a catch-the-drop game in React Three Fiber, loads only when someone presses play and hands the page back to the shop on exit. Reggie, the origami unicorn, runs on his own state machine and only hears named game events, so his art can be replaced without touching gameplay. The fur on the headline is an SVG filter over live text.',
      milestone:
        'bunnyanarchy.co is live with the Anarcade and Reggie, and the shop is also part of Otherly, my multi-brand store. Final character drawings are in progress.',
    },
    demoEmbed: '/demos/bunny-anarcade.html',
    stills: [
      {
        src: '/projects/bunny-anarchy/game.jpg',
        caption: 'Bunny Anarcade',
        alt: 'The Bunny Anarcade game: a pink voxel rabbit on a platform as a cap falls toward it, with Reggie in his pen in the corner laughing in a HA HA HA speech bubble.',
      },
      {
        src: '/projects/bunny-anarchy/hero.jpg',
        caption: 'Hero · Reggie’s headspin',
        alt: 'The Bunny Anarchy homepage hero: the word BUNNY in soft white fur above ANARCHY in hot pink, hand-lettered stickers scattered around it, and Reggie the origami unicorn upside down on his horn on the WOT sticker.',
      },
    ],
    links: [
      { href: 'https://bunnyanarchy.co/', label: 'Play the Anarcade on bunnyanarchy.co' },
      { href: 'https://otherly.shop/collections/bunny-anarchy', label: 'Shop Bunny Anarchy on otherly.shop' },
    ],
    logoPalette: { ink: BASE, accents: [MARK.copper, MARK.cyan, MARK.pale] },
  },
  {
    id: 'kinedic-drop',
    group: 'creative',
    title: 'Kinedic',
    titleEm: 'Drop',
    category: 'BRAND MOTION',
    what: 'A logo animation, built in code',
    tagline:
      'A mark that arrives instead of appearing: one drop falls, the page ripples, and the logo rises out of the impact. Vectors and code, no video.',
    role: 'Brand · Motion · Front-end',
    pipeline: ['Vector mark', 'CSS keyframes', 'SVG displacement ripple', 'Next.js'],
    status: { label: 'Live', accent: 'cyan', live: true },
    year: '2026',
    brief: {
      problem:
        'A logo that fades in says nothing about the brand. Kinedic is about potential energy becoming kinetic, so the mark had to arrive that way: held, released, and felt across the whole page.',
      pipeline:
        'One four-second timeline in CSS. The drop shifts from copper to blue as it falls, a flash and two rings fire on impact, and the mark, wordmark and tagline rise in sequence. The ripple is an SVG displacement filter over the live page, grown frame by frame from a map drawn once to a canvas, then removed once the wave has passed. Visitors who prefer reduced motion get the finished mark.',
      milestone:
        'Complete. Plays when opened; the replay control runs it again.',
    },
    demoEmbed: '/demos/kinedic-drop/index.html',
    logoPalette: { ink: BASE, accents: [MARK.copper, MARK.blue, MARK.cyan] },
  },
  {
    id: 'listening-room',
    group: 'creative',
    title: 'Listening',
    titleEm: 'Room',
    category: 'SCORE SYSTEM',
    what: 'A map with its own score',
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
    id: 'frostbyte',
    group: 'creative',
    title: 'Frost',
    titleEm: 'Byte',
    category: 'EDUCATION · NARRATIVE',
    what: 'An educational character and story world',
    tagline:
      'A programmer torn out of time and reborn as Frostbyte, a being of cold logic haunted by feelings she can’t name. With the Tablet of Light she reads history like a database, and every day she and her viewers, the Sparks, solve a mystery together.',
    role: 'Worldbuilding · Learning design · Research method',
    pipeline: ['Tablet of Light (daily mysteries)', 'Teaching loop: Freeze → Reveal → Connect', 'FrostByte Codex', 'AI video'],
    status: { label: 'In development', accent: 'yellow' },
    year: '2026',
    brief: {
      problem:
        'Most tech education either bores people or scares them. Explaining the wires, satellites and systems that run everyday life tends to leave people more anxious about technology, not more capable with it.',
      pipeline:
        'Frostbyte teaches in four beats: Freeze the moment so the noise drops away, Reveal the hidden layers (fiber under the street, satellites overhead), Connect them to the viewer’s own life, and close with Gratitude, never fear. The Tablet of Light app turns it into a daily mystery the Sparks solve with her. Underneath is the FrostByte Codex: in 2025 I became the first to use AI to systematically cross-check the Hermetic Principles, principle by principle, against neuroscience, quantum physics, fractal geometry, thermodynamics, chaos theory, biology and the major world faiths, diffing each tradition like two versions of code.',
      milestone:
        'Character, world, teaching loop and the Codex are established; the Tablet of Light app and the first teaching scenes are in development.',
    },
    links: [
      { href: 'https://www.linkedin.com/feed/update/urn:li:ugcPost:7365617344020189186/', label: 'The FrostByte Codex, timestamped on LinkedIn (2025)' },
    ],
    videoEmbed:
      'https://customer-b3v92lqv0bluwpls.cloudflarestream.com/28c267ddd2cafd0073aa94aca59c2592/iframe?autoplay=true&muted=true&loop=true&controls=false&preload=auto&letterboxColor=transparent&poster=https%3A%2F%2Fcustomer-b3v92lqv0bluwpls.cloudflarestream.com%2F28c267ddd2cafd0073aa94aca59c2592%2Fthumbnails%2Fthumbnail.jpg%3Ftime%3D1s%26height%3D600',
    logoPalette: { ink: BASE, accents: [MARK.pale, MARK.cyan, MARK.blue] },
  }
]

/** Quiet default while nothing is hovered — carbon with a single warm tick */
export const defaultLogoPalette: LogoPalette = {
  ink: BASE,
  accents: [MARK.cyan, MARK.blue, MARK.copper],
}
