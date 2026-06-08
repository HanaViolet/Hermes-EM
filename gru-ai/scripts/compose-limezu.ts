/**
 * Extract LimeZu premade character sprites into per-agent PNGs.
 *
 * Source: LimeZu Character Generator premade characters (896×656 sheets)
 * Each sheet has 16×32 frames arranged in animation rows.
 *
 * Row layout (from Spritesheet_animations_GUIDE.png):
 *   Row 0: Idle (4 frames, 1 per direction)
 *   Row 1: Idle animation (6 frames × 4 dirs animated loop)
 *   Row 2: Walk (6 frames × 4 directions = 24 cols)
 *   Row 3: Sleep (with bed items)
 *   Row 4: Sit variant 1 (6 frames × 4 directions)
 *   Row 5: Sit variant 2
 *   Row 6: Phone (4-9 loop)
 *   ... more rows for combat/actions ...
 *
 * Direction order per row: Down(0), Right(1), Up(2), Left(3)
 * Each direction group: 6 consecutive columns in walk/sit rows.
 * Idle row: 1 frame per direction (cols 0-3).
 *
 * Output: char_0..12.png at 112×96 (7 frames × 16px, 3 rows × 32px)
 *   Row 0 = down, Row 1 = up, Row 2 = right
 *   Frame order: walk1, walk2, walk3, type1, type2, read1, read2
 *
 * Usage:
 *   npx tsx scripts/compose-limezu.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { PNG } from 'pngjs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ── Paths ──

const PREMADE_DIR = path.join(
  process.env.HOME || '',
  'Downloads/moderninteriors-win/2_Characters/Character_Generator/0_Premade_Characters/16x16',
)
const OUT_DIR = path.join(__dirname, '..', 'public', 'assets', 'characters')

// ── Frame dimensions ──

const SRC_W = 16
const SRC_H = 32
const FRAME_COUNT = 7
const OUT_W = FRAME_COUNT * SRC_W // 112
const OUT_H = 3 * SRC_H // 96

// ── Character selection ──
// Pick 13 premade characters (1-indexed) for visual diversity:
// different skin tones, hair styles/colors, outfits

interface CharacterPick {
  premadeIndex: number // 1-20 (filename Premade_Character_XX.png)
  name: string
}

const CHARACTER_PICKS: CharacterPick[] = [
  { premadeIndex: 1, name: 'CEO' },
  { premadeIndex: 5, name: 'Sarah' },
  { premadeIndex: 10, name: 'Morgan' },
  { premadeIndex: 15, name: 'Marcus' },
  { premadeIndex: 20, name: 'Priya' },
  { premadeIndex: 3, name: 'Riley' },
  { premadeIndex: 7, name: 'Jordan' },
  { premadeIndex: 12, name: 'Casey' },
  { premadeIndex: 17, name: 'Taylor' },
  { premadeIndex: 9, name: 'Sam' },
  { premadeIndex: 14, name: 'Quinn' },
  { premadeIndex: 4, name: 'Devon' },
  { premadeIndex: 19, name: 'Spare' },
]

// ── Source layout ──

// Direction order in LimeZu sheets: Down=0, Right=1, Up=2, Left=3
// Each direction's walk/sit frames start at col = dirIndex * 6
const DIR_DOWN = 0
const DIR_RIGHT = 1
const DIR_UP = 2
// const DIR_LEFT = 3  // not used in output

// Output row → source direction mapping
// Row 0 = down, Row 1 = up, Row 2 = right
const OUTPUT_ROW_DIRS = [DIR_DOWN, DIR_UP, DIR_RIGHT]

// Source rows in premade character sheets
const WALK_ROW = 2 // 6 frames per direction × 4 directions
const SIT_ROW = 4 // Sit variant 1: character sitting

/**
 * Walk cycle in LimeZu (6 frames per direction):
 *   0: idle standing
 *   1: step A (one foot forward)
 *   2: stride A (foot extended)
 *   3: idle standing (same as 0)
 *   4: step B (other foot forward)
 *   5: stride B (foot extended)
 *
 * Our 7-frame output format mapping:
 *   walk1(0) → walk frame 1 (step A)
 *   walk2(1) → walk frame 0 (idle/neutral)
 *   walk3(2) → walk frame 4 (step B)
 *   type1(3) → sit frame 0 (seated idle)
 *   type2(4) → sit frame 1 (seated animation)
 *   read1(5) → walk frame 0 (standing idle)
 *   read2(6) → walk frame 0 (standing idle)
 */
interface FrameSource {
  row: number
  frame: number
}

const FRAME_MAP: FrameSource[] = [
  { row: WALK_ROW, frame: 1 }, // walk1: step A
  { row: WALK_ROW, frame: 0 }, // walk2: idle standing
  { row: WALK_ROW, frame: 4 }, // walk3: step B
  { row: SIT_ROW, frame: 0 }, // type1: sitting idle
  { row: SIT_ROW, frame: 1 }, // type2: sitting shift
  { row: WALK_ROW, frame: 0 }, // read1: standing idle
  { row: WALK_ROW, frame: 0 }, // read2: standing idle
]

// ── Helpers ──

function loadPng(filePath: string): PNG {
  if (!fs.existsSync(filePath)) {
    console.error(`Missing: ${filePath}`)
    process.exit(1)
  }
  return PNG.sync.read(fs.readFileSync(filePath))
}

/** Extract a single 16×32 frame from a source PNG sheet. */
function extractFrame(sheet: PNG, col: number, row: number): Buffer {
  const buf = Buffer.alloc(SRC_W * SRC_H * 4)
  const sx = col * SRC_W
  const sy = row * SRC_H
  for (let y = 0; y < SRC_H; y++) {
    for (let x = 0; x < SRC_W; x++) {
      const srcIdx = ((sy + y) * sheet.width + (sx + x)) * 4
      const dstIdx = (y * SRC_W + x) * 4
      buf[dstIdx] = sheet.data[srcIdx]
      buf[dstIdx + 1] = sheet.data[srcIdx + 1]
      buf[dstIdx + 2] = sheet.data[srcIdx + 2]
      buf[dstIdx + 3] = sheet.data[srcIdx + 3]
    }
  }
  return buf
}

/** Check if a frame buffer has any non-transparent pixels */
function hasContent(frame: Buffer): boolean {
  for (let i = 3; i < frame.length; i += 4) {
    if (frame[i] > 0) return true
  }
  return false
}

/** Blit a 16×32 frame into the output PNG at the given position. */
function blitFrame(out: PNG, frame: Buffer, frameIdx: number, rowIdx: number): void {
  const dstX = frameIdx * SRC_W
  const dstY = rowIdx * SRC_H
  for (let y = 0; y < SRC_H; y++) {
    for (let x = 0; x < SRC_W; x++) {
      const srcIdx = (y * SRC_W + x) * 4
      const dstIdx = ((dstY + y) * OUT_W + (dstX + x)) * 4
      out.data[dstIdx] = frame[srcIdx]
      out.data[dstIdx + 1] = frame[srcIdx + 1]
      out.data[dstIdx + 2] = frame[srcIdx + 2]
      out.data[dstIdx + 3] = frame[srcIdx + 3]
    }
  }
}

// ── Main ──

fs.mkdirSync(OUT_DIR, { recursive: true })

console.log('Extracting LimeZu premade character sprites...')
console.log(`Source: ${PREMADE_DIR}`)
console.log(`Output: ${OUT_DIR}`)
console.log(`Characters: ${CHARACTER_PICKS.length}\n`)

let warnings = 0

for (let i = 0; i < CHARACTER_PICKS.length; i++) {
  const pick = CHARACTER_PICKS[i]
  const filename = `Premade_Character_${String(pick.premadeIndex).padStart(2, '0')}.png`
  const sheet = loadPng(path.join(PREMADE_DIR, filename))

  const png = new PNG({ width: OUT_W, height: OUT_H, filterType: -1 })

  for (let rowIdx = 0; rowIdx < OUTPUT_ROW_DIRS.length; rowIdx++) {
    const dir = OUTPUT_ROW_DIRS[rowIdx]

    for (let frameIdx = 0; frameIdx < FRAME_COUNT; frameIdx++) {
      const mapping = FRAME_MAP[frameIdx]
      // Walk/sit rows: 6 frames per direction, offset by dir * 6
      const srcCol = dir * 6 + mapping.frame
      const frame = extractFrame(sheet, srcCol, mapping.row)

      // Fallback: if sit row is empty, use walk idle instead
      if (!hasContent(frame) && mapping.row === SIT_ROW) {
        const fallback = extractFrame(sheet, dir * 6 + 0, WALK_ROW)
        blitFrame(png, fallback, frameIdx, rowIdx)
        if (i === 0 && rowIdx === 0 && frameIdx === 3) {
          console.warn(`  ⚠ Sit row ${SIT_ROW} empty for Premade_${String(pick.premadeIndex).padStart(2, '0')}, using walk idle fallback`)
          warnings++
        }
      } else {
        blitFrame(png, frame, frameIdx, rowIdx)
      }
    }
  }

  const buffer = PNG.sync.write(png)
  const outPath = path.join(OUT_DIR, `char_${i}.png`)
  fs.writeFileSync(outPath, buffer)
  console.log(
    `  char_${i}.png  ${pick.name.padEnd(7)}  Premade_${String(pick.premadeIndex).padStart(2, '0')}  ${OUT_W}x${OUT_H}  (${buffer.length} bytes)`,
  )
}

console.log(`\nDone. ${CHARACTER_PICKS.length} character PNGs written to ${OUT_DIR}`)
if (warnings > 0) {
  console.log(`${warnings} warning(s) — check sit row availability.`)
}
