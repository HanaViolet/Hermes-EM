# Directive Report: Apply New TMX Game UI Design (v2)

**Date**: 2026-03-09
**Directive**: game-ui-tmx-update
**Planned by**: COO

## Summary

Complete TMX v2 migration: built a TMX parser script, registered 12 tilesets (7 new), replaced all 4 tile layer arrays with TMX data, migrated from 6 zones to 5 (removed server-room + lobby), updated 23 seat positions, remapped all 12 agents, and cleaned up all stale references. 19 files changed, 377 insertions, 860 deletions.

## Definition of Done Assessment

### Task 1: TMX Parser Script
- [x] scripts/parse-tmx.ts exists and runs without error via npx tsx scripts/parse-tmx.ts — MET
- [x] Generated output contains all 4 layer arrays each with exactly 600 elements (30x20) — MET
- [x] Generated output contains SEAT_POSITIONS array with entries having col/row/dir from TMX pixel coords — MET
- [x] Generated output contains ZONE_BOUNDS record with 5 zone entries with correct tile-coordinate bounds — MET
- [x] Generated output contains TILESET_REGISTRY array with all tilesets and a WALL_GIDS set — MET

### Task 2: Copy Tilesets and Register
- [x] 6 new PNG files exist in public/assets/office/ with correct filenames — MET
- [x] tilesetCache.ts loads all 12 tileset images and registers each with correct firstgid — MET
- [x] GID comment block lists all 12 tilesets with firstgid ranges — MET
- [x] No reference to AnimBathroom tileset in the codebase — MET

### Task 3: Replace Office Layout Data
- [x] FURNITURE_TOP array matches TMX layer 3 exactly — MET
- [x] DECO array matches TMX layer 4 exactly — MET
- [x] SEAT_POSITIONS has exactly 23 entries matching TMX seat data — MET
- [x] WALL_GIDS set covers all edge GIDs in the floor layer — MET
- [x] npx tsc --noEmit passes with no errors — MET

### Task 4: Zone and Routing Migration
- [x] RoomZoneId type has exactly 5 values: ceo-office, meeting, workspace, kitchen, break-room — MET
- [x] ROOM_ZONES has 5 entries matching TMX zone bounds — MET
- [x] Zero references to server-room or lobby in src/components/game/ — MET
- [x] chooseDestination idle routing uses break-room, kitchen, ceo-office — MET
- [x] npx tsc --noEmit passes with zero errors — MET

### Task 5: Update OfficeState and Constants
- [x] meetingBounds is { minCol: 23, maxCol: 29, minRow: 0, maxRow: 11 } — MET
- [x] No interaction points reference server-room or lobby zones — MET
- [x] At least one interaction point exists in kitchen zone — MET
- [x] Former lobby points remapped to break-room with valid coordinates — MET
- [x] npx tsc --noEmit passes — MET

### Task 6: Remap Agent Registry Seats
- [x] All 12 agents have valid seatId values from seat-1 through seat-23 with no duplicates — MET
- [x] Each agent's game.position matches their seat's TMX coordinates — MET
- [x] CEO at seat-1 (col 2, row 3), Devon at seat-2 (col 2, row 7) — MET
- [x] JSON is valid and parseable — MET

## Tasks

### TMX Parser Script — completed
- **Phases**: build, review
- **Team**: Devon (build), Sarah (review)
- **Scope**: Created scripts/parse-tmx.ts that reads gruai.tmx XML, extracts 4 CSV tile layers, 23 seat objects, 5 zone objects, and generates src/components/game/generated/office-tmx-data.ts
- **Files changed**: scripts/parse-tmx.ts, src/components/game/generated/office-tmx-data.ts
- **Review findings**: Dead `wallGids.push` on Set (line 266) — fixed in review cycle

### Copy Tilesets and Register — completed
- **Phases**: build, review
- **Team**: Devon (build), Sarah (review)
- **Scope**: Copied 6 new tileset PNGs from ~/Downloads/moderninteriors-win/ to public/assets/office/. Updated tilesetCache.ts to load all 12 tilesets with correct firstgid values. Deleted stale tileset-loader.ts.
- **Files changed**: src/components/game/tilesetCache.ts, src/components/game/tileset-loader.ts (deleted), public/assets/office/*.png (6 new)

### Replace Office Layout Data — completed
- **Phases**: build, review
- **Team**: Devon (build), Sarah (review)
- **Scope**: Replaced all 4 tile layer arrays (FLOOR, FURNITURE_BASE, FURNITURE_TOP, DECO) with TMX-derived data. Expanded SEAT_POSITIONS from 12 to 23 entries. Updated GID comment header.
- **Files changed**: src/components/game/office-layout.ts

### Zone and Routing Migration — completed
- **Phases**: build, review
- **Team**: Devon (build), Sarah (review)
- **Scope**: Collapsed RoomZoneId from 6 to 5 values. Removed server-room, lobby, INFRA_TOOLS set, isInfraTool function. Updated zone bounds from TMX. Propagated to all consumers: GamePage.tsx, SidePanel.tsx, CanvasOffice.tsx, constants.ts, panels/FurniturePanels.tsx, panels/index.ts.
- **Files changed**: src/components/game/engine/roomZones.ts, src/components/game/GamePage.tsx, src/components/game/SidePanel.tsx, src/components/game/CanvasOffice.tsx, src/components/game/panels/FurniturePanels.tsx, src/components/game/panels/index.ts

### Update OfficeState and Constants — completed
- **Phases**: build, review
- **Team**: Devon (build), Sarah (review)
- **Scope**: Updated meetingBounds to TMX meeting zone. Removed server-room interaction points. Remapped lobby points to break-room. Added kitchen interaction point.
- **Files changed**: src/components/game/engine/officeState.ts, src/components/game/constants.ts

### Remap Agent Registry Seats — completed
- **Phases**: build, review
- **Team**: Devon (build), Sarah (review)
- **Scope**: Remapped all 12 agents to TMX seat positions. CEO=seat-1, Devon=seat-2, workspace seats for engineers, Morgan at meeting seat-12, Quinn at break-room seat-16.
- **Files changed**: .claude/agent-registry.json

## Follow-Up Actions

### Auto-Executed (low risk)
- Fixed `hud-ops` → `hud-status` type mismatch in types.ts (semantic alignment with runtime)
- Removed dead `wallGids.push` statement in scripts/parse-tmx.ts line 266
- Removed unused SectionHeader and ParchmentDivider imports from FurniturePanels.tsx

### Auto-Executed (medium risk)
None.

### Backlogged (high risk)
None.

## Revert Commands

No medium-risk actions — no revert commands needed.

## Agent-Proposed Improvements

- TMX parser could be integrated as a Vite plugin for automatic regeneration on file change — proposed by Devon
- Consider visual verification of all 23 seat positions in-browser — proposed by Sarah

## Corrections Caught

All standing corrections verified. No violations found.

## UX Verification Results

No in-browser visual verification performed in this session. The tile data, seat positions, and zone bounds are derived from TMX (authoritative source). Recommend CEO visual review in browser to confirm rendering correctness.

## Potentially Stale Docs

Most stale references are from completed directives referencing files that were modified in this migration. Key ones to note:

- .context/directives/game-hud-redesign/directive.md -> references modified: GamePage.tsx, SidePanel.tsx, panels/index.ts, types.ts
- .context/directives/limezu-asset-animations/audit.md -> references modified: CanvasOffice.tsx, constants.ts, renderer.ts, office-layout.ts, tileset-loader.ts (deleted), tilesetCache.ts
- .context/directives/agent-status-visual-behaviors/directive.md -> references modified: GamePage.tsx, officeState.ts, renderer.ts, roomZones.ts

Most are historical directive docs — not actively referenced. The agent-registry.json references in skill files are expected (registry is a shared resource).

## Self-Assessment

### Audit Accuracy
- Findings confirmed by build: 5/5 (GID mismatches, missing tilesets, seat count, zone mismatch, stale meetingBounds)
- Findings that were wrong or irrelevant: none
- Issues found during build that audit missed: hud-ops/hud-status type mismatch (caught in review)

### Build Success
- Type-check passed: yes (TSC clean)
- Tasks completed: 6/6
- Build failures: none (Vite 1.52s)

### UX Verification
- UI tasks verified in browser: 0/6 (not performed — recommend CEO visual review)
- Dead-end UI found: 0
- Data mismatches found: 0

### Agent Task
- Improvements proposed by agents: 2 (Vite plugin for TMX, visual seat verification)
- Improvements worth pursuing: visual seat verification
- Agents that proposed nothing: N/A (single build agent)

### Risk Classification
- Low-risk auto-executes that caused problems: none
- Items that should have been classified differently: none

### Challenge Accuracy
- Skipped for medium weight — N/A
