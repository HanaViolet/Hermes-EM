# Audit: Limezu Asset Animations

## Critical Finding
Furniture is rendered via GID-based tile layers (7 TMX layers), NOT via tileset-loader singles. The singles directory doesn't exist. tileset-loader.ts is dead code for the main office rendering.

## Baseline
- All furniture from pre-baked GID numbers in office-layout.ts
- Rendered by tilesetCache.ts as static tile images
- Zero FurnitureInstance items (OFFICE_LAYOUT.furniture = [])
- Tiled TSX files have NO animation elements
- Limezu animation frames are adjacent tiles in the tileset PNG (GID N, N+1, N+2...)

## Recommended Approach
1. Investigate Interiors.png to identify which GIDs have animation frames
2. Create animation registry mapping base GIDs to frame GIDs + timing
3. In renderer.ts tile rendering, substitute animated GIDs based on identity.time
4. Thread identity.time through to renderTileGrid/renderGidOverlayLayers

## Active Files
- src/components/game/engine/renderer.ts
- src/components/game/tilesetCache.ts
- src/components/game/office-layout.ts
- src/components/game/CanvasOffice.tsx
- src/components/game/constants.ts
- src/components/game/pixel-types.ts

## Dead Code
- src/components/game/tileset-loader.ts (singles don't exist)
- public/00_Modern_Office_Singles.tsx
