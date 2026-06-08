// ---------------------------------------------------------------------------
// Furniture Animation Registry
// Maps GIDs from the Tiled layout to animation frame sequences.
// Limezu animated objects use adjacent tiles in the same tileset row.
// ---------------------------------------------------------------------------

import { ANIMATED_TILE_DEFS } from './generated/office-tmx-data'

/**
 * Definition for a single animated tile group.
 * Each individual tile that is part of the animation has an entry mapping
 * its base GID to the sequence of GIDs it cycles through.
 */
interface AnimatedTileEntry {
  /** Ordered GIDs to cycle through */
  frames: number[]
  /** Seconds per frame */
  frameDuration: number
}

// ---------------------------------------------------------------------------
// Animation Registry — auto-populated from parse-tmx.ts generated data
// Indexes BOTH base GIDs and every frame GID so that tiles placed at any
// frame position in the map will still animate.
// ---------------------------------------------------------------------------

const animMap = new Map<number, AnimatedTileEntry>()

for (const d of ANIMATED_TILE_DEFS) {
  const entry: AnimatedTileEntry = { frames: d.frames, frameDuration: d.frameDurationSec }
  // Register the base GID
  animMap.set(d.baseGid, entry)
  // Register every frame GID (so non-base frames placed in the map also animate)
  for (const gid of d.frames) {
    if (!animMap.has(gid)) {
      animMap.set(gid, entry)
    }
  }
}

export const ANIMATED_TILES: ReadonlyMap<number, AnimatedTileEntry> = animMap

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Collect all GIDs that appear as animation frames (for tileset pre-extraction).
 * This includes every GID in every frame sequence, not just the base GIDs.
 */
export function collectAnimationFrameGids(): Set<number> {
  const gids = new Set<number>()
  for (const entry of ANIMATED_TILES.values()) {
    for (const gid of entry.frames) {
      gids.add(gid)
    }
  }
  return gids
}

/**
 * Given a GID and the current time in seconds, return the GID
 * that should be rendered for this frame.
 *
 * - If the GID is not in the animation registry, returns it unchanged
 *   (passthrough for static tiles).
 * - If the GID is animated, computes the current frame index from time.
 */
export function getAnimatedGid(gid: number, timeSec: number): number {
  const entry = ANIMATED_TILES.get(gid)
  if (!entry) return gid

  const frameCount = entry.frames.length
  if (frameCount <= 1) return gid

  const frameIndex = Math.floor(timeSec / entry.frameDuration) % frameCount
  return entry.frames[frameIndex]
}
