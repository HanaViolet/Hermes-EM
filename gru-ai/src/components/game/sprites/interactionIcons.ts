import type { SpriteData } from '../pixel-types'
import type { InteractionType } from '../types'

// ── Interaction Icon Sprites (8x8) ──────────────────────────────
// Each interaction type has an array of animation frames.
// '' = transparent pixel.

// ── Helper: expand row strings to SpriteData ───────────────────
function expand(
  rows: string[],
  palette: Record<string, string>,
): SpriteData {
  return rows.map((row) =>
    [...row].map((ch) => (ch === '.' ? '' : (palette[ch] ?? ''))),
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PLANNING — Clipboard with text lines (blue family, 2 frames)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const clipboardPalette = {
  B: '#3b82f6', // blue board outline
  D: '#2563eb', // darker blue clip
  W: '#dbeafe', // white paper
  L: '#93c5fd', // light blue text lines
  C: '#1d4ed8', // clip metal
}

// Frame 0: clipboard with text lines
const clipboardFrame0 = expand([
  '..CDDC..',
  '.BBBBBB.',
  '.BWWWWB.',
  '.BWLLWB.',
  '.BWWWWB.',
  '.BWLLWB.',
  '.BWWWWB.',
  '.BBBBBB.',
], clipboardPalette)

// Frame 1: clipboard with pencil writing at bottom
const clipboardFrame1 = expand([
  '..CDDC..',
  '.BBBBBB.',
  '.BWWWWB.',
  '.BWLLWB.',
  '.BWWWWB.',
  '.BWLLWB.',
  '.BWWLDB.',
  '.BBBBBB.',
], clipboardPalette)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BRAINSTORMING — Lightbulb with rays (amber family, 3 frames)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const bulbPalette = {
  A: '#f59e0b', // amber outline
  G: '#fbbf24', // glow body
  W: '#fef3c7', // inner white glow
  B: '#d97706', // base/screw
  R: '#fcd34d', // ray
}

// Frame 0: bulb with inner glow, no rays
const bulbFrame0 = expand([
  '..AAAA..',
  '.AGGGGA.',
  '.AGWWGA.',
  '.AGWWGA.',
  '.AGGGGA.',
  '..AGGA..',
  '..ABBA..',
  '...BB...',
], bulbPalette)

// Frame 1: bulb with diagonal rays extending
const bulbFrame1 = expand([
  'R.AAAA.R',
  '.AGGGGA.',
  '.AGWWGA.',
  '.AGWWGA.',
  '.AGGGGA.',
  'R.AGGA.R',
  '..ABBA..',
  '...BB...',
], bulbPalette)

// Frame 2: bulb brighter, rays contract
const bulbFrame2 = expand([
  '..AAAA..',
  '.AWWWWA.',
  '.AWWWWA.',
  '.AWWWWA.',
  '.AGGGGA.',
  '..AGGA..',
  '..ABBA..',
  '...BB...',
], bulbPalette)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUILDING — Hammer (gray family, 3 frames)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const hammerPalette = {
  H: '#64748b', // head steel blue
  D: '#475569', // dark steel
  W: '#94a3b8', // highlight
  S: '#92400e', // shaft wood
  T: '#b45309', // shaft light
  K: '#fbbf24', // spark
}

// Frame 0: hammer at rest (45deg angle)
const hammerFrame0 = expand([
  '........',
  '.DHHW...',
  '.DHHHW..',
  '...SS...',
  '...SS...',
  '..SS....',
  '..SS....',
  '.SS.....',
], hammerPalette)

// Frame 1: hammer raised
const hammerFrame1 = expand([
  '..DHHW..',
  '..DHHHW.',
  '...SS...',
  '...SS...',
  '...SS...',
  '..SS....',
  '..SS....',
  '........',
], hammerPalette)

// Frame 2: hammer striking with impact spark
const hammerFrame2 = expand([
  '........',
  '........',
  '.DHHW...',
  '.DHHHW..',
  '...SS...',
  '...SS.K.',
  '..SS.K..',
  '.SS..K..',
], hammerPalette)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REVIEWING — Magnifying glass (purple family, 2 frames)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const magPalette = {
  P: '#8b5cf6', // purple rim
  G: '#c4b5fd', // glass fill
  W: '#ede9fe', // glass glare
  D: '#6d28d9', // dark handle
  H: '#7c3aed', // handle body
}

// Frame 0: glass positioned left
const magFrame0 = expand([
  '..PPP...',
  '.PGGGP..',
  '.PGWGP..',
  '.PGGGP..',
  '..PPPH..',
  '....PHD.',
  '.....HD.',
  '........',
], magPalette)

// Frame 1: glass positioned right (scanning)
const magFrame1 = expand([
  '...PPP..',
  '..PGGGP.',
  '..PGWGP.',
  '..PGGGP.',
  '..HPP...',
  '.DHD....',
  '.DH.....',
  '........',
], magPalette)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AUDITING — Shield with scan line (orange family, 2 frames)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const shieldPalette = {
  O: '#e11d48', // rose outline
  F: '#fda4af', // rose fill
  D: '#be123c', // dark rose accent
  S: '#fff1f2', // scan line bright
  C: '#fb7185', // inner detail
}

// Frame 0: shield with scan line at top
const shieldFrame0 = expand([
  '.OOOOOO.',
  '.OSSSSO.',
  '.OFFFFO.',
  '.OFCCFO.',
  '.OFFFFO.',
  '..OFFO..',
  '...OO...',
  '........',
], shieldPalette)

// Frame 1: shield with scan line at bottom
const shieldFrame1 = expand([
  '.OOOOOO.',
  '.OFFFFO.',
  '.OFFFFO.',
  '.OFCCFO.',
  '.OSSSSO.',
  '..OFFO..',
  '...OO...',
  '........',
], shieldPalette)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Exports
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const INTERACTION_SPRITES: Record<InteractionType, SpriteData[]> = {
  planning: [clipboardFrame0, clipboardFrame1],
  brainstorming: [bulbFrame0, bulbFrame1, bulbFrame2],
  building: [hammerFrame0, hammerFrame1, hammerFrame2],
  reviewing: [magFrame0, magFrame1],
  auditing: [shieldFrame0, shieldFrame1],
}

export const INTERACTION_DOT_COLORS: Record<InteractionType, string> = {
  planning: '#3b82f6',
  brainstorming: '#f59e0b',
  building: '#64748b',
  reviewing: '#8b5cf6',
  auditing: '#e11d48',
}
