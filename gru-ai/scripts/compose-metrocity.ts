/**
 * Compose MetroCity character sprites into per-agent PNGs (debug/preview tool).
 *
 * Reads appearance configs from agent-registry.json and composites
 * MetroCity source layers into preview PNGs. The actual game uses
 * runtime compositing in asset-loader.ts — this script is optional.
 *
 * Source assets (in public/assets/metrocity/):
 *   Character Model.png — 768x192 = 24 cols x 6 rows @ 32x32
 *   Hairs.png — 768x256 = 24 cols x 8 rows @ 32x32, 8 hair styles
 *   Outfit1-6.png — 768x32 each = 24 cols x 1 row @ 32x32, 6 outfits
 *
 * Output: char_0..N.png at 224x96 (7 frames x 32px wide, 3 rows x 32px tall)
 *
 * Usage:
 *   npx tsx scripts/compose-metrocity.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { PNG } from 'pngjs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ── Paths ──

const REGISTRY_PATH = path.join(__dirname, '..', '.claude', 'agent-registry.json')
const ASSET_DIR = path.join(__dirname, '..', 'public', 'assets', 'metrocity')
const OUT_DIR = path.join(__dirname, '..', 'public', 'assets', 'characters')

// ── Output dimensions ──
// Native 32x32 per frame — renderer handles scaling via CHARACTER_SPRITE_SCALE.
// 7 frames x 32px = 224px wide, 3 direction rows x 32px = 96px tall.
const FRAME_COUNT = 7
const FRAME_W = 32
const FRAME_H = 32
const OUT_W = FRAME_COUNT * FRAME_W  // 224
const OUT_H = 3 * FRAME_H            // 96

// ── Source tile dimensions ──
const SRC_TILE = 32  // each MetroCity tile is 32x32

// ── Load agent combos from registry ──

interface AgentCombo {
  name: string
  bodyRow: number
  hairRow: number
  outfitIndex: number
}

// ── Gender-aware appearance generation (mirrors src/components/game/generateAppearance.ts) ──

type InferredGender = 'male' | 'female'

const NAME_GENDER: Record<string, InferredGender> = {
  sarah: 'female', marcus: 'male', morgan: 'male', priya: 'female',
  riley: 'female', jordan: 'male', casey: 'male', taylor: 'female',
  sam: 'male', quinn: 'female', devon: 'male',
  alex: 'male', emma: 'female', james: 'male', sophia: 'female',
  liam: 'male', olivia: 'female', noah: 'male', ava: 'female',
  ethan: 'male', mia: 'female', lucas: 'male', isabella: 'female',
  mason: 'male', charlotte: 'female', logan: 'male', amelia: 'female',
  daniel: 'male', luna: 'female', henry: 'male', ella: 'female',
  max: 'male', lily: 'female', jack: 'male', aria: 'female',
  leo: 'male', zoe: 'female', ryan: 'male', nora: 'female',
  kai: 'male', maya: 'female', jin: 'male', yuki: 'female',
  raj: 'male', ananya: 'female', omar: 'male', fatima: 'female',
  carlos: 'male', camila: 'female', david: 'male', elena: 'female',
  michael: 'male', jessica: 'female', chris: 'male', emily: 'female',
}

function inferGender(firstName: string): InferredGender {
  const key = firstName.toLowerCase().trim()
  if (NAME_GENDER[key]) return NAME_GENDER[key]
  if (key.endsWith('a') || key.endsWith('ia') || key.endsWith('ie') || key.endsWith('ah')) return 'female'
  return 'male'
}

const HAIR_ROWS_MALE = [0, 4, 5, 6, 7]
const HAIR_ROWS_FEMALE = [1, 2, 3, 4]
const OUTFIT_INDICES_MALE = [5, 6]
const OUTFIT_INDICES_FEMALE = [2, 5, 6]

function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  return Math.abs(hash)
}

function generateAppearance(agentName: string): { bodyRow: number; hairRow: number; outfitIndex: number } {
  const firstName = agentName.split(' ')[0] || agentName
  const gender = inferGender(firstName)
  const hash = simpleHash(agentName.toLowerCase())
  const hairPool = gender === 'female' ? HAIR_ROWS_FEMALE : HAIR_ROWS_MALE
  const outfitPool = gender === 'female' ? OUTFIT_INDICES_FEMALE : OUTFIT_INDICES_MALE
  return {
    bodyRow: hash % 6,
    hairRow: hairPool[hash % hairPool.length],
    outfitIndex: outfitPool[(hash >> 4) % outfitPool.length],
  }
}

// ── Load agent combos (use registry appearance if present, else auto-generate) ──

function loadAgentCombos(): AgentCombo[] {
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'))
  const combos: AgentCombo[] = []
  for (const agent of registry.agents) {
    if (!agent.game) continue
    const appearance = agent.game.appearance ?? generateAppearance(agent.name)
    combos.push({ name: agent.name.split(' ')[0], ...appearance })
  }
  return combos
}

const AGENT_COMBOS = loadAgentCombos()

// ── MetroCity layout ──
// Verified by pixel analysis of Character Model.png:
//   24 columns = 4 direction groups x 6 frames per direction
//   Column mapping: Down(0-5), Right(6-11), Up(12-17), Left(18-23)
//
// Each 6-frame direction cycle:
//   Frame 0: idle standing
//   Frame 1: step A (left foot forward)
//   Frame 2: stride A (left foot extended)
//   Frame 3: idle standing (identical to frame 0)
//   Frame 4: step B (right foot forward)
//   Frame 5: stride B (right foot extended)

/** Column offset for the first frame of each MetroCity direction group. */
const DIR_COL_OFFSET = {
  down:  0,   // cols 0-5  (front-facing)
  right: 6,   // cols 6-11 (right-facing)
  up:    12,  // cols 12-17 (back-facing)
  left:  18,  // cols 18-23 (left-facing)
} as const

/**
 * Mapping from our 7-frame output format to MetroCity source frame indices.
 * Output: walk1(0), walk2(1), walk3(2), type1(3), type2(4), read1(5), read2(6)
 *
 * Walk uses frames 1, 0, 4 — step-A, idle, step-B — so the ping-pong cycle
 * (0,1,2,1) becomes step-A → idle → step-B → idle, a natural walk.
 * Type and read reuse idle variants (no dedicated poses in MetroCity).
 */
const FRAME_MAP: number[] = [
  1,  // walk1: step A
  0,  // walk2: idle (neutral)
  4,  // walk3: step B
  0,  // type1: idle
  0,  // type2: idle (same — task 3 may add arm overlay)
  0,  // read1: idle
  0,  // read2: idle (same — task 3 may add arm overlay)
]

/**
 * Output row order: which MetroCity direction maps to each output row.
 * Row 0 = down, Row 1 = up, Row 2 = right (matches asset-loader.ts expectations).
 */
const OUTPUT_ROW_DIRS: Array<keyof typeof DIR_COL_OFFSET> = ['down', 'up', 'right']

// ── Helpers ──

function loadPng(filename: string): PNG {
  const filePath = path.join(ASSET_DIR, filename)
  if (!fs.existsSync(filePath)) {
    console.error(`Missing asset: ${filePath}`)
    process.exit(1)
  }
  return PNG.sync.read(fs.readFileSync(filePath))
}

/**
 * Extract a single 32x32 tile from a source PNG sheet.
 * Returns a flat RGBA buffer (32*32*4 bytes).
 */
function extractTile(sheet: PNG, col: number, row: number): Buffer {
  const buf = Buffer.alloc(SRC_TILE * SRC_TILE * 4)
  const sx = col * SRC_TILE
  const sy = row * SRC_TILE
  for (let y = 0; y < SRC_TILE; y++) {
    for (let x = 0; x < SRC_TILE; x++) {
      const srcIdx = ((sy + y) * sheet.width + (sx + x)) * 4
      const dstIdx = (y * SRC_TILE + x) * 4
      buf[dstIdx]     = sheet.data[srcIdx]
      buf[dstIdx + 1] = sheet.data[srcIdx + 1]
      buf[dstIdx + 2] = sheet.data[srcIdx + 2]
      buf[dstIdx + 3] = sheet.data[srcIdx + 3]
    }
  }
  return buf
}

/** Blit a 32x32 tile into the output PNG at native resolution (no upscale). */
function blitFrame(out: PNG, tile: Buffer, frameIdx: number, rowIdx: number): void {
  const dstX = frameIdx * FRAME_W
  const dstY = rowIdx * FRAME_H
  for (let y = 0; y < SRC_TILE; y++) {
    for (let x = 0; x < SRC_TILE; x++) {
      const srcIdx = (y * SRC_TILE + x) * 4
      const dstIdx = ((dstY + y) * OUT_W + (dstX + x)) * 4
      out.data[dstIdx]     = tile[srcIdx]
      out.data[dstIdx + 1] = tile[srcIdx + 1]
      out.data[dstIdx + 2] = tile[srcIdx + 2]
      out.data[dstIdx + 3] = tile[srcIdx + 3]
    }
  }
}

/**
 * Alpha-composite overlay tile onto base tile in place.
 * Both tiles are 32x32 RGBA buffers (32*32*4 = 4096 bytes).
 * Standard alpha blending: result = overlay * overlayAlpha + base * (1 - overlayAlpha)
 */
function alphaBlit(base: Buffer, overlay: Buffer): void {
  const pixelCount = SRC_TILE * SRC_TILE
  for (let i = 0; i < pixelCount; i++) {
    const idx = i * 4
    const oA = overlay[idx + 3] / 255  // overlay alpha normalized to 0-1
    if (oA === 0) continue              // fully transparent overlay — skip

    const bA = base[idx + 3] / 255      // base alpha normalized to 0-1

    if (oA >= 1) {
      // Fully opaque overlay — just copy
      base[idx]     = overlay[idx]
      base[idx + 1] = overlay[idx + 1]
      base[idx + 2] = overlay[idx + 2]
      base[idx + 3] = 255
    } else {
      // Partial alpha — blend
      const outA = oA + bA * (1 - oA)
      if (outA > 0) {
        base[idx]     = Math.round((overlay[idx]     * oA + base[idx]     * bA * (1 - oA)) / outA)
        base[idx + 1] = Math.round((overlay[idx + 1] * oA + base[idx + 1] * bA * (1 - oA)) / outA)
        base[idx + 2] = Math.round((overlay[idx + 2] * oA + base[idx + 2] * bA * (1 - oA)) / outA)
        base[idx + 3] = Math.round(outA * 255)
      }
    }
  }
}

// ── Main ──

fs.mkdirSync(OUT_DIR, { recursive: true })

// Load source assets
console.log('Loading MetroCity assets...')
const bodySheet = loadPng('Character Model.png')
const hairSheet = loadPng('Hairs.png')
const outfitSheets: PNG[] = []
for (let i = 1; i <= 6; i++) {
  outfitSheets.push(loadPng(`Outfit${i}.png`))
}
console.log(`  Body:    ${bodySheet.width}x${bodySheet.height}`)
console.log(`  Hair:    ${hairSheet.width}x${hairSheet.height}`)
console.log(`  Outfits: ${outfitSheets.length} loaded (${outfitSheets[0].width}x${outfitSheets[0].height} each)`)

// Validate combo uniqueness
const comboKeys = AGENT_COMBOS.map(c => `${c.bodyRow}-${c.hairRow}-${c.outfitIndex}`)
const uniqueKeys = new Set(comboKeys)
if (uniqueKeys.size !== AGENT_COMBOS.length) {
  console.error('ERROR: Duplicate agent combos detected!')
  process.exit(1)
}

// Generate character PNGs — full body + outfit + hair compositing
console.log(`\nGenerating ${AGENT_COMBOS.length} character PNGs (${OUT_W}x${OUT_H}) with body+outfit+hair compositing...`)

for (let i = 0; i < AGENT_COMBOS.length; i++) {
  const combo = AGENT_COMBOS[i]
  const png = new PNG({ width: OUT_W, height: OUT_H, filterType: -1 })
  const outfitSheet = outfitSheets[combo.outfitIndex - 1]  // outfitIndex is 1-based

  // For each output row (down, up, right)
  for (let rowIdx = 0; rowIdx < OUTPUT_ROW_DIRS.length; rowIdx++) {
    const dir = OUTPUT_ROW_DIRS[rowIdx]
    const dirColBase = DIR_COL_OFFSET[dir]

    // For each of the 7 output frames
    for (let frameIdx = 0; frameIdx < FRAME_COUNT; frameIdx++) {
      const srcFrame = FRAME_MAP[frameIdx]
      const srcCol = dirColBase + srcFrame

      // 1. Extract 32x32 body tile (base layer)
      const tile = extractTile(bodySheet, srcCol, combo.bodyRow)

      // 2. Alpha-composite outfit on top of body (outfit PNGs have 1 row only)
      const outfitTile = extractTile(outfitSheet, srcCol, 0)
      alphaBlit(tile, outfitTile)

      // 3. Alpha-composite hair on top of everything
      const hairTile = extractTile(hairSheet, srcCol, combo.hairRow)
      alphaBlit(tile, hairTile)

      // 4. Blit native 32x32 tile directly to output (no downscaling)
      blitFrame(png, tile, frameIdx, rowIdx)
    }
  }

  const buffer = PNG.sync.write(png)
  const outPath = path.join(OUT_DIR, `char_${i}.png`)
  fs.writeFileSync(outPath, buffer)
  console.log(
    `  char_${i}.png  ${combo.name.padEnd(7)} ` +
    `body=${combo.bodyRow} hair=${combo.hairRow} outfit=${combo.outfitIndex}  ` +
    `${OUT_W}x${OUT_H}  (${buffer.length} bytes)`
  )
}

console.log(`\nDone. ${AGENT_COMBOS.length} character PNGs written to ${OUT_DIR}`)
console.log('Full body+outfit+hair compositing complete.')
