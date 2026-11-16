/**
 * Home's first-view pictures. Bonnie edits this file; the Showcase component
 * only reads it. The first entry is the big one; the rest sit in a row under it.
 * `focus` is the CSS object-position that keeps the subject in the crop.
 * Order follows the index groups: complex interfaces, accessibility, creative.
 */
export interface ShowcaseTile {
  /** project id from src/data/projects.ts */
  id: string
  src: string
  focus?: string
}

export const showcase: ShowcaseTile[] = [
  { id: 'aether-command', src: '/projects/aether-command/ghost-still-2.jpg', focus: '50% 50%' },
  { id: 'otherly', src: '/projects/skull-and-beau/ghoul-arrives.jpg', focus: '38% 50%' },
  { id: 'bounce-cal', src: '/projects/bounce-cal/bounce-cal-dig-in.jpg', focus: '30% 40%' },
  { id: 'kitty-n-pip', src: '/projects/kitty-n-pip/portrait.jpg', focus: '50% 30%' },
]
