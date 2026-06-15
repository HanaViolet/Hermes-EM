// ---------------------------------------------------------------------------
// Asset Loader — loads floor tiles and local market character sprites
// ---------------------------------------------------------------------------

import type { SpriteData } from './pixel-types'
import { setFloorSprites } from './floorTiles'
import { setCharacterTemplates } from './sprites/spriteData'
import { createPixelCharacterTemplates } from './sprites/pixelCharacters'
import { loadTilesetCache } from './tilesetCache'

// ── Helpers ─────────────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function rgbaToHex(r: number, g: number, b: number, a: number): string {
  if (a < 128) return '' // transparent
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)
}

function extractSprite(
  data: Uint8ClampedArray,
  imgWidth: number,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
): SpriteData {
  const sprite: SpriteData = []
  for (let y = 0; y < sh; y++) {
    const row: string[] = []
    for (let x = 0; x < sw; x++) {
      const idx = ((sy + y) * imgWidth + (sx + x)) * 4
      row.push(rgbaToHex(data[idx], data[idx + 1], data[idx + 2], data[idx + 3]))
    }
    sprite.push(row)
  }
  return sprite
}

/** Convert a sprite to grayscale (for floor tiles that will be colorized) */
function toGrayscale(sprite: SpriteData): SpriteData {
  return sprite.map((row) =>
    row.map((hex) => {
      if (!hex) return ''
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
      const h = gray.toString(16).padStart(2, '0')
      return `#${h}${h}${h}`
    }),
  )
}

// ── Floor Tiles (extracted from atlas via pre-computed GIDs) ──

import { ATLAS_MAP, ATLAS_TILE_SIZE, FLOOR_PATTERN_GIDS } from './generated/atlas-map'

export async function loadFloorAssets(src = '/assets/office/atlas.png'): Promise<void> {
  try {
    const img = await loadImage(src)
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    const imageData = ctx.getImageData(0, 0, img.width, img.height)
    const data = imageData.data

    const sprites: SpriteData[] = []

    for (const gid of FLOOR_PATTERN_GIDS) {
      const pos = ATLAS_MAP[gid]
      if (!pos) continue
      const [col, row] = pos
      const sprite = extractSprite(data, img.width, col * ATLAS_TILE_SIZE, row * ATLAS_TILE_SIZE, ATLAS_TILE_SIZE, ATLAS_TILE_SIZE)
      sprites.push(toGrayscale(sprite))
    }

    setFloorSprites(sprites)
    console.log(`✓ Loaded ${sprites.length} floor tile patterns from atlas`)
  } catch {
    console.warn('Floor atlas not found. Using fallback rendering.')
  }
}

// ── Character Sprites (local market preset library) ──

export function loadCharacterAssets(): void {
  const characters = createPixelCharacterTemplates()
  setCharacterTemplates(characters)
  console.log(`✓ Loaded ${characters.length} local market pixel character presets`)
}

// ── Load all assets ─────────────────────────────────────────────

let loaded = false
let tilesetReady = false

/** Callbacks to fire when tileset sprites are applied to catalog */
const onTilesetReadyCallbacks: Array<() => void> = []

export function onTilesetReady(cb: () => void): void {
  if (tilesetReady) {
    // Assets already loaded (e.g. HMR re-render) — fire immediately
    cb()
    return
  }
  onTilesetReadyCallbacks.push(cb)
}

export function loadAllAssets(): void {
  if (loaded) return
  loaded = true
  loadFloorAssets()
  loadCharacterAssets()
  loadTilesetCache().then(() => {
    tilesetReady = true
    for (const cb of onTilesetReadyCallbacks) cb()
  })
}
