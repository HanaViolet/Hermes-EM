# Apply New TMX Game UI Design

The CEO rebuilt the game UI in Tiled. The new TMX file (gruai.tmx) is at `public/assets/office/gruai.tmx` and `/Users/yangyang/gruai.tmx` (source of truth — always re-copy before building).

## Revision 2 — CEO Feedback

The initial migration (v1) updated tile data, tilesets, constants, and rendering. But the map has been redesigned again with:

1. **7 new tilesets** (12 total, was 5) — LivingRoom, Gym, Basement, Television, Music, Classroom, animated bathroom
2. **TMX object layers** — CEO added `seats` and `zones` object layers in Tiled. These are the source of truth for seat positions and room zones. Parse them from TMX at build-time instead of hardcoding.
3. **23 seats** (was 12) — covering CEO office, workspaces, meeting room, kitchen, break room, gym
4. **5 zones** — ceo-office, workspace, meeting, kitchen, break-room
5. **All 4 tile layers changed** — floor, furniture_base, furniture_top, deco have new data
6. **WALL_GIDS need recalculation** from new floor layer
7. **Interaction points** need remapping to new furniture positions (derive from seat locations and furniture tiles)
8. **Meeting room bounds** need updating from zone objects
9. **Wander waypoints** need regeneration per zone

## TMX Object Layer Format

### Seats (`objectgroup name="seats"`)
Point objects with properties:
- `name`: seat number as string ("1" through "23")
- `dir`: facing direction ("up", "down", "left", "right")
- `x`, `y`: pixel position — divide by 48 and floor to get tile col/row

### Zones (`objectgroup name="zones"`)
Rectangle objects with properties:
- `name`: zone id ("ceo-office", "workspace", "meeting", "kitchen", "break-room")
- `x`, `y`, `width`, `height`: pixel bounds — divide by 48 for tile bounds

### Interactions (`objectgroup name="interaction"`)
Empty — derive from seat positions and furniture context.

## New Tilesets (v2)

| # | TSX file | firstgid | Purpose |
|---|----------|----------|---------|
| 1 | 1_Generic_48x48.tsx | 1 | Generic tiles |
| 2 | Room_Builder_48x48.tsx | 1249 | Floors, walls |
| 3 | Modern_Office_Black_Shadow_48x48.tsx | 9837 | Office furniture |
| 4 | 16_Grocery_store_Black_Shadow_48x48.tsx | 10685 | Store/kitchen items |
| 5 | 12_Kitchen_Black_Shadow_48x48.tsx | 11933 | Kitchen furniture |
| 6 | 2_LivingRoom_Black_Shadow_48x48.tsx | 12717 | Living room (NEW) |
| 7 | 8_Gym_Black_Shadow_48x48.tsx | 13437 | Gym equipment (NEW) |
| 8 | 14_Basement_Black_Shadow_48x48.tsx | 13965 | Basement (NEW) |
| 9 | 23_Television_and_Film_Studio_Black_Shadow_48x48.tsx | 14765 | TV/Film studio (NEW) |
| 10 | 6_Music_and_sport_Black_Shadow_48x48.tsx | 14989 | Music/sport (NEW) |
| 11 | 5_Classroom_and_library_Black_Shadow_48x48.tsx | 15757 | Classroom/library (NEW) |
| 12 | animated_bathroom_cabinet (inline) | 16301 | Animated bathroom (NEW) |

## What Was Already Done (v1)

- TILE_SIZE 16→48, grid 30×20, WALK_SPEED scaled
- CHARACTER_SPRITE_SCALE = 3 applied to all character rendering in renderer.ts
- tilesetCache loads 5 tilesets (needs update to 12)
- office-layout.ts has v1 tile data (needs replacement)
- GID_BASE_LAYER_COUNT = 2 (floor + furniture_base below characters)
- Old tileset-loader.ts deleted, furnitureCatalog cleaned up

## Files to Update

- `src/components/game/office-layout.ts` — Replace tile arrays, seats from TMX objects, WALL_GIDS
- `src/components/game/tilesetCache.ts` — Add 7 new tilesets
- `src/components/game/engine/roomZones.ts` — Parse zones from TMX objects, regenerate waypoints
- `src/components/game/engine/officeState.ts` — Meeting bounds from zone objects
- `src/components/game/constants.ts` — Update interaction points to match new layout
- `.claude/agent-registry.json` — Update seatId mappings for 23 seats

## Build-Time TMX Parser

Create a script or build-time utility that:
1. Reads gruai.tmx XML
2. Extracts tile layer CSV data
3. Extracts seat objects (name, col, row, dir)
4. Extracts zone rectangles (name, bounds in tile coords)
5. Generates TypeScript constants that office-layout.ts, roomZones.ts, and constants.ts import

This eliminates manual coordinate syncing — edit in Tiled, re-run parser, done.

## Revision 3 — CEO Bug Reports + New Requirements

After v2 migration, CEO found multiple bugs and wants new features:

### Bugs

1. **Characters not selectable** — Hit detection uses `CHARACTER_HIT_HALF_WIDTH=24`, `CHARACTER_HIT_HEIGHT=48` but CHARACTER_SPRITE_SCALE (3×) makes sprites render at 48×96px. The clickable area doesn't match the visual. Fix: scale hit detection by CHARACTER_SPRITE_SCALE.

2. **Characters crossing tables/chairs** — Sitting offset (CHARACTER_SITTING_OFFSET_PX=30) affects visual positioning but not collision. Characters visually clip through furniture. The character position needs to be aligned with the actual seat tile, not offset arbitrarily.

3. **Names/icons not showing** — `NAME_LABEL_VERTICAL_OFFSET_PX=84` positions labels too high above characters (84px above anchor). Combined with CHARACTER_SPRITE_SCALE, labels end up off-screen or invisible. Need to recalculate label positioning for the 48px tile / 3× sprite scale setup.

4. **TMX tile data out of sync** — CEO updated TMX again. FURNITURE_TOP rows 7-9, 12-13 changed (animated bathroom tiles moved). Re-sync from `scripts/parse-tmx.ts` output.

### New Requirements

5. **Replace bitmap font** — Stop using the pixel-art bitmap font for character name labels. Use a normal canvas font instead (e.g., a clean sans-serif or a specific font the CEO picks). The `renderBitmapText()` calls in renderer.ts need to be replaced with `ctx.font`/`ctx.fillText()`.

6. **Replace status icons with LimeZu UI sprites** — Use the LimeZu Modern Interiors UI sprite sheets from `/Users/yangyang/Downloads/moderninteriors-win/4_User_Interface_Elements/`:
   - `UI_48x48.png` — sprite sheet with speech bubble icons (gear, heart, question mark, exclamation, zzz, music, mail, etc.)
   - `Animated_Spritesheets/` — individual animated GIFs at 48x48 (thinking dots, timer, mail, angry, tear drop, arrows)
   - Map these to agent statuses: working→gear/timer, idle→zzz/coffee, planning→thinking dots, reviewing→checkmark, etc.
   - Replace the current hand-drawn 8×8 pixel art status icons in `sprites/statusIcons.ts` and `sprites/interactionIcons.ts`

### Files to Touch

- `src/components/game/engine/officeState.ts` — Fix hit detection (CHARACTER_HIT_HALF_WIDTH, CHARACTER_HIT_HEIGHT)
- `src/components/game/engine/renderer.ts` — Fix name label positioning, replace bitmap font with canvas font, integrate LimeZu UI sprites
- `src/components/game/constants.ts` — Adjust NAME_LABEL_VERTICAL_OFFSET_PX and related constants
- `src/components/game/office-layout.ts` — Sync FURNITURE_TOP with latest TMX data
- `src/components/game/sprites/statusIcons.ts` — Replace with LimeZu UI sprite sheet based icons
- `src/components/game/sprites/interactionIcons.ts` — Replace with LimeZu UI sprite sheet based icons
- `public/assets/office/UI_48x48.png` — Copy LimeZu UI sprite sheet
