import type { SpriteData } from '../pixel-types'
import { FurnitureActivityType } from '../pixel-types'

// ── Status Icon Sprites (8x8) ─────────────────────────────────
// Each status has an array of animation frames.
// '' = transparent pixel.

const _ = '' // transparent

// ── Helper: expand row strings to SpriteData ───────────────────
// Each char in the row string maps to a color via the palette.
function expand(
  rows: string[],
  palette: Record<string, string>,
): SpriteData {
  return rows.map((row) =>
    [...row].map((ch) => (ch === '.' ? '' : (palette[ch] ?? ''))),
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WORKING — Spinning gear (green cog, 4 rotation frames)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const gearPalette = {
  G: '#22c55e', // green teeth/body
  D: '#16a34a', // darker green (center hole outline)
  H: '#15803d', // dark hole
}

// Frame 0: teeth at N, E, S, W (cardinal positions)
const gearFrame0 = expand([
  '..GG....',
  '.GGGGG..',
  'GGDHGG..',
  'GGHHGGG.',
  '.GGGGGG.',
  '..GGGG..',
  '.GGGGG..',
  '..GG....',
], gearPalette)

// Frame 1: teeth rotated ~22deg (diagonal emphasis)
const gearFrame1 = expand([
  '...GG...',
  '..GGGG..',
  '.GGDHGG.',
  'GGGHHGG.',
  '.GGGGGG.',
  '.GGGGGG.',
  '..GGGG..',
  '...GG...',
], gearPalette)

// Frame 2: teeth at NE, SE, SW, NW (diagonal positions)
const gearFrame2 = expand([
  '....GG..',
  '..GGGGG.',
  '.GGDHGG.',
  '.GGHHGG.',
  'GGGGGG..',
  '.GGGGGG.',
  '..GGGG..',
  '..GG....',
], gearPalette)

// Frame 3: teeth transitioning back
const gearFrame3 = expand([
  '..GGG...',
  '.GGGGG..',
  '.GGDHG..',
  'GGGHHGG.',
  'GGGGGG..',
  '.GGGGG..',
  '..GGGG..',
  '...GG...',
], gearPalette)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// IDLE — Coffee cup with steam (2 steam frames)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const coffeePalette = {
  W: '#FFFFFF', // steam / white
  C: '#9ca3af', // cup body (warm gray)
  D: '#6b7280', // cup dark rim / base
  B: '#78716c', // brown coffee surface
  H: '#d4d4d8', // handle highlight
}

// Frame 0: steam wisp left
const coffeeFrame0 = expand([
  '.W......',
  '..W.....',
  '.W......',
  '..DDDD..',
  '..CBBB..',
  '..CCCC.H',
  '..CCCC.H',
  '..DDDD..',
], coffeePalette)

// Frame 1: steam wisp right
const coffeeFrame1 = expand([
  '..W.....',
  '.W......',
  '..W.....',
  '..DDDD..',
  '..CBBB..',
  '..CCCC.H',
  '..CCCC.H',
  '..DDDD..',
], coffeePalette)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ERROR — Warning triangle (4 aggressive flash frames)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const errorPaletteBright = {
  R: '#ef4444', // bright red outline
  Y: '#eab308', // yellow fill
  B: '#111111', // black exclamation
  W: '#fef08a', // warm interior highlight
}

const errorPaletteFlash = {
  R: '#fecaca', // near-white red (washed)
  Y: '#fef9c3', // near-white yellow
  B: '#7f1d1d', // dark red exclamation (still visible)
  W: '#FFFFFF', // white
}

const errorPaletteDim = {
  R: '#b91c1c', // dim red
  Y: '#a16207', // dim yellow
  B: '#111111', // black exclamation
  W: '#ca8a04', // dim interior
}

const errorTemplate = [
  '...RR...',
  '...RR...',
  '..RBBR..',
  '..RWBR..',
  '.RWWBWR.',
  '.RWWWWR.',
  'RRWBWRRR',
  'RRRRRRRR',
]

// Frame 0: BRIGHT — full red + yellow (attention!)
const errorFrame0 = expand(errorTemplate, errorPaletteBright)

// Frame 1: FLASH — near-white overexposure (strobe effect)
const errorFrame1 = expand(errorTemplate, errorPaletteFlash)

// Frame 2: BRIGHT — back to full red (rapid cycle)
const errorFrame2 = expand(errorTemplate, errorPaletteBright)

// Frame 3: DIM — darker pass before restarting (makes the brights pop more)
const errorFrame3 = expand(errorTemplate, errorPaletteDim)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WAITING — Hourglass (2 tip frames, sand flowing)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const hourglassPalette = {
  Y: '#eab308', // frame (yellow/gold)
  S: '#fde68a', // sand (light yellow)
  G: '#d4d4d8', // glass (light gray, transparent feel)
  D: '#a16207', // dark accent
}

// Frame 0: sand in top half, narrow stream through center
const hourglassFrame0 = expand([
  '.YYYYYY.',
  '.YGSSGY.',
  '..GSSG..',
  '...YY...',
  '...YY...',
  '..GGGG..',
  '.YGSSPY.',
  '.YYYYYY.',
], { ...hourglassPalette, P: '#fde68a' }) // P = sand pile at bottom

// Frame 1: sand shifted to bottom, top emptier
const hourglassFrame1 = expand([
  '.YYYYYY.',
  '.YGGPGY.',
  '..GGGG..',
  '...YY...',
  '...YY...',
  '..GSSG..',
  '.YGSSGY.',
  '.YYYYYY.',
], { ...hourglassPalette, P: '#fde68a' }) // P = single falling grain

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// OFFLINE — Grey X (1 static frame)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const offlinePalette = {
  X: '#4b5563', // dark gray
  D: '#374151', // darker outline
}

const offlineFrame0 = expand([
  'D......D',
  'XD....DX',
  '.XD..DX.',
  '..XDDX..',
  '..XDDX..',
  '.XD..DX.',
  'XD....DX',
  'D......D',
], offlinePalette)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Export
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const STATUS_ICON_SPRITES: Record<string, SpriteData[]> = {
  working: [gearFrame0, gearFrame1, gearFrame2, gearFrame3],
  idle: [coffeeFrame0, coffeeFrame1],
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ACTIVITY ICONS — 8x8 sprites shown above agents during
// furniture interactions (replaces status icon while active)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ── TV icon (WATCHING_TV) — glowing blue screen ──────────────
const tvPalette = {
  F: '#222233', // dark frame
  B: '#4488FF', // blue screen
  L: '#88CCFF', // light blue glow
  S: '#334466', // stand/base
}

const tvFrame0 = expand([
  '.FFFFFF.',
  'FBBBBFF',
  'FLBBLBF',
  'FBBBLBF',
  'FBLBBFF',
  '.FFFFFF.',
  '...SS...',
  '..SSSS..',
], tvPalette)

const tvFrame1 = expand([
  '.FFFFFF.',
  'FBLBBFF',
  'FBBBLBF',
  'FLBBBFF',
  'FBBBLBF',
  '.FFFFFF.',
  '...SS...',
  '..SSSS..',
], tvPalette)

// ── Book icon (READING) — open book with pages ──────────────
const bookPalette = {
  C: '#8B4513', // brown cover
  P: '#FFFDE0', // cream pages
  D: '#654321', // dark brown spine
  L: '#D2B48C', // light brown
}

const bookFrame0 = expand([
  '..DPDD..',
  '.CPPPPD.',
  'CPPPPPPC',
  'CPPDDPPC',
  'CPPDPPPC',
  'CPPPPPPD',
  '.CPPPPC.',
  '..CCCC..',
], bookPalette)

const bookFrame1 = expand([
  '..DPDD..',
  '.CPPPPD.',
  'CPPPPPPC',
  'CPPDDPPC',
  'CPPPPPPC',
  'CPPDPPPD',
  '.CPPPPC.',
  '..CCCC..',
], bookPalette)

// ── Snack icon (VENDING) — coffee cup with steam ────────────
const snackPalette = {
  C: '#CC6633', // cup body
  W: '#FFFFFF', // steam/foam
  H: '#996644', // handle
  D: '#884422', // dark accent
  F: '#EEDDC0', // foam top
}

const snackFrame0 = expand([
  '..W.W...',
  '...W....',
  '..FFFF..',
  '..CCCC..',
  '..CCCCH.',
  '..CCCCH.',
  '..CCCC..',
  '..DDDD..',
], snackPalette)

const snackFrame1 = expand([
  '...W....',
  '..W.W...',
  '..FFFF..',
  '..CCCC..',
  '..CCCCH.',
  '..CCCCH.',
  '..CCCC..',
  '..DDDD..',
], snackPalette)

// ── Controller icon (ARCADE) — gamepad ──────────────────────
const controllerPalette = {
  B: '#333333', // body dark
  G: '#666666', // body gray
  R: '#FF4444', // red button
  Y: '#FFCC33', // yellow button
  D: '#444444', // d-pad
}

const controllerFrame0 = expand([
  '........',
  '.GGGGGG.',
  'GGDGGRYG',
  'GDDDBRYG',
  'GGDGGGGG',
  '.GBGBGG.',
  '..BGBG..',
  '........',
], controllerPalette)

// ── Dumbbell icon (EXERCISING) — barbell ────────────────────
const dumbbellPalette = {
  M: '#555555', // gray metal bar
  D: '#333333', // dark weight plates
  H: '#888888', // highlight
}

const dumbbellFrame0 = expand([
  '........',
  '.DD..DD.',
  'DDDMMHDD',
  'DDMMMHDD',
  'DDDMMHDD',
  '.DD..DD.',
  '........',
  '........',
], dumbbellPalette)

const dumbbellFrame1 = expand([
  '........',
  '........',
  '.DD..DD.',
  'DDDMMHDD',
  'DDMMMHDD',
  '.DD..DD.',
  '........',
  '........',
], dumbbellPalette)

// ── Paddle icon (PLAYING_POOL / PLAYING_PINGPONG) — paddle ──
const paddlePalette = {
  R: '#CC4444', // red paddle face
  L: '#FFCCCC', // light highlight
  H: '#774422', // brown handle
  D: '#993333', // dark accent
}

const paddleFrame0 = expand([
  '..RRRR..',
  '.RRLRDR.',
  '.RLRRDR.',
  '.RRRRRR.',
  '..RDDR..',
  '...HH...',
  '...HH...',
  '....H...',
], paddlePalette)

// ── Export: Activity icon lookup ─────────────────────────────
export const ACTIVITY_ICON_SPRITES: Record<string, SpriteData[]> = {
  [FurnitureActivityType.WATCHING_TV]: [tvFrame0, tvFrame1],
  [FurnitureActivityType.READING]: [bookFrame0, bookFrame1],
  [FurnitureActivityType.VENDING]: [snackFrame0, snackFrame1],
  [FurnitureActivityType.ARCADE]: [controllerFrame0],
  [FurnitureActivityType.EXERCISING]: [dumbbellFrame0, dumbbellFrame1],
  [FurnitureActivityType.PLAYING_POOL]: [paddleFrame0],
  [FurnitureActivityType.PLAYING_PINGPONG]: [paddleFrame0],
}
