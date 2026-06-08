// ── LimeZu UI_48x48 Sprite Sheet Icon Loader ──────────────────
//
// Loads individual 48x48 icons from the UI sprite sheet and provides
// them at arbitrary zoom levels via cached canvas scaling.
//
// Sprite sheet layout (each cell is 48x48px):
//   Row 0: arrows, speech bubbles (empty, filled)
//   Row 1: small arrows
//   Row 2: small directional arrows
//   Row 3: hand pointers, fire, clouds
//   Row 4: circular bubbles — dollar, wrench/gear, question, exclamation, pencil, music, moon, sun, strikethrough, angry
//   Row 5: circular bubbles — minus, question, heart, pencil, music, moon, sun, cross, strikethrough, water
//   Row 6: glowing circles (animated row 1)
//   Row 7: glowing circles (animated row 2) + colored circular icons
//
// Icon positions are (col, row) 0-indexed.

const ICON_SIZE = 48

/** The raw sprite sheet image (loaded once) */
let sheetImage: HTMLImageElement | null = null
let sheetLoaded = false
let sheetLoadPromise: Promise<void> | null = null

/** Cache of extracted + scaled icon canvases: "col,row,zoom" -> canvas */
const iconCache = new Map<string, HTMLCanvasElement>()

/** Load the sprite sheet image. Safe to call multiple times. */
function ensureSheetLoaded(): void {
  if (sheetLoadPromise) return
  sheetImage = new Image()
  sheetLoadPromise = new Promise<void>((resolve) => {
    sheetImage!.onload = () => {
      sheetLoaded = true
      resolve()
    }
    sheetImage!.onerror = () => {
      // Silently fail -- icons will just not render
      resolve()
    }
    sheetImage!.src = '/assets/office/ui.png'
  })
}

// Kick off load immediately on module import
ensureSheetLoaded()

/**
 * Status type to sprite sheet position mapping.
 * Positions are (col, row) in the 48x48 grid.
 * These are best-effort matches from visual inspection of the LimeZu UI sheet.
 */
const STATUS_ICON_POSITIONS: Record<string, { col: number; row: number }> = {
  // Gear/wrench icon in circular bubble -- working
  working: { col: 6, row: 4 },
  // Moon icon in circular bubble -- idle/sleeping
  idle: { col: 8, row: 5 },
  // Exclamation icon in circular bubble -- error
  error: { col: 8, row: 4 },
  // Question mark in circular bubble -- waiting
  waiting: { col: 7, row: 4 },
  // Pencil icon in circular bubble -- planning
  planning: { col: 8, row: 3 },
  // Sun/star icon in circular bubble -- brainstorming
  brainstorming: { col: 9, row: 5 },
  // Wrench in circular bubble -- auditing/reviewing
  reviewing: { col: 6, row: 5 },
  auditing: { col: 6, row: 5 },
}

/**
 * Get a LimeZu UI icon for the given status at the requested zoom level.
 * Returns null if the sheet hasn't loaded yet or the status is unknown.
 *
 * The returned canvas is 24*zoom x 24*zoom pixels (icons rendered at half
 * their native 48px size for a good visual fit above characters).
 */
export function getStatusIcon(status: string, zoom: number): HTMLCanvasElement | null {
  if (!sheetLoaded || !sheetImage) return null

  const pos = STATUS_ICON_POSITIONS[status]
  if (!pos) return null

  return getIconAt(pos.col, pos.row, zoom)
}

/**
 * Extract a single 48x48 icon from the sheet and return it scaled to
 * 24*zoom x 24*zoom pixels. Cached per (col, row, zoom) triple.
 */
export function getIconAt(col: number, row: number, zoom: number): HTMLCanvasElement | null {
  if (!sheetLoaded || !sheetImage) return null

  // Quantize zoom to 1 decimal place to bound cache size
  const qZoom = Math.round(zoom * 10) / 10
  const key = `${col},${row},${qZoom}`

  const cached = iconCache.get(key)
  if (cached) return cached

  // Source rect in the sprite sheet
  const sx = col * ICON_SIZE
  const sy = row * ICON_SIZE

  // Render at half native size (24px base) scaled by zoom
  const renderSize = Math.round(24 * qZoom)
  if (renderSize < 1) return null

  const canvas = document.createElement('canvas')
  canvas.width = renderSize
  canvas.height = renderSize
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.imageSmoothingEnabled = false
  ctx.drawImage(sheetImage, sx, sy, ICON_SIZE, ICON_SIZE, 0, 0, renderSize, renderSize)

  iconCache.set(key, canvas)
  return canvas
}

/** Check if the UI sprite sheet has finished loading */
export function hasUIIcons(): boolean {
  return sheetLoaded
}
