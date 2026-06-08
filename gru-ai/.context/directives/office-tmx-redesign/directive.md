# Office TMX Redesign with Limezu Modern Interiors

## CEO Brief

Redesign the office TMX map (`public/office.tmx`) using the Limezu Modern Interiors 16x16 asset pack purchased at `/Users/yangyang/Downloads/moderninteriors-win`.

The current office is sparse with only basic desks and chairs. The goal is to make it feel like a real modern tech startup office.

## Requirements

1. **Copy relevant Limezu 16x16 tileset PNGs** into `public/assets/office/` — at minimum the Generic, Conference Hall, and Living Room theme sheets
2. **Create .tsx tileset files** for each new tileset PNG added
3. **Add new tilesets to the TMX** file with correct `firstgid` values
4. **Populate the office with rich furniture** across the existing layers (Furniture, Tables, laptop, deco, top):
   - Plants and decorative items throughout
   - Rugs in common areas
   - Paintings/art on walls
   - Bookshelves in appropriate locations
   - Sofa/lounge area for breaks
   - Kitchen/break room area (bottom section of map)
   - Conference room with podium and projector screen (enhance existing)
   - Better CEO office (top-left room) with nicer furniture
   - Decorative items in the open workspace area (right side)

## Constraints

- Keep the existing room layout (walls/floors on the Floors layer) intact
- Keep the seat object positions intact (the `seats` objectgroup)
- The map is 32x32 tiles at 16x16px
- Only use 16x16 assets from the Limezu pack
- The existing `room-builder.tsx` (firstgid=1) and `furniture.tsx` (firstgid=225) tilesets remain

## Category

game
