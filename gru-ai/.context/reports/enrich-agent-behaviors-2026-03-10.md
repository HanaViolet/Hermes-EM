# Directive Report: Enrich Agent Actions & Status

**Date**: 2026-03-10
**Directive**: enrich-agent-behaviors
**Planned by**: COO (Morgan)

## Summary

Comprehensive agent behavior enrichment: added offline status, 3-tier idle detection, furniture-first wandering with 20+ interaction points, activity animations for all furniture types, 30-min idle threshold, mobile name pill rendering, and dead code cleanup. CEO directed sensible idle behaviors interactively via Chrome MCP.

## Definition of Done Assessment

### Add 'offline' AgentStatus, 3-tier idle detection
- [x] AgentStatus type is 'working' | 'idle' | 'offline' in both pixel-types.ts and types.ts
- [x] IdleTier type ('recent' | 'moderate' | 'long') exists with thresholds as named constants
- [x] characters.ts computes idleTier from sessionInfo.lastActivityMs
- [x] GamePage.tsx toAgentStatus returns 'offline' for no-session agents
- [x] officeState.ts handles 'offline' without errors

### Distinct visual treatment per idle tier
- [x] PILL_DOT_COLORS has working (green), idle-recent (muted green), idle-moderate (amber), idle-long (gray), offline (dark gray)
- [x] STATUS_EMOJI differentiates by idle tier
- [x] Character sprites render at full opacity (no alpha dimming)
- [x] panelUtils.ts handles 'offline' status with distinct styling
- [x] Type-checks pass

### Remove dead code
- [x] renderStatusIcons deleted from renderer.ts
- [x] renderInteractionIcons deleted from renderer.ts
- [x] Both call sites in renderFrame() removed
- [x] No remaining references in codebase
- [x] Type-checks pass

### Sensible idle behaviors
- [x] pickWanderDestination: ~85% furniture, ~15% social, fallback to waypoints, 3-attempt retry
- [x] Chat facing: agents face each other during proximity interactions
- [x] Activity animations for all types (exercising bounces, ping pong swings, pool shifts, arcade/couch, vending)
- [x] 20+ interaction points (kitchen chairs, couches, gym mats, pool stools, ping pong, TV, vending)
- [x] 30-min idle threshold (WANDER_IDLE_THRESHOLD_MS)
- [x] No alpha dimming (charAlpha hardcoded to 1.0)
- [x] Mobile: name pills render at min 0.7 zoom, task cards + AgentTicker hidden on mobile
- [x] Meeting zone restricted to prevent unreachable pathfinding
- [x] Type-checks pass

## Tasks

### Add 'offline' AgentStatus and 3-tier idle — completed
- **Phases**: build, code-review, review
- **Team**: Riley (build), Sarah (review)
- **Files changed**: pixel-types.ts, types.ts, characters.ts, officeState.ts, GamePage.tsx, constants.ts

### Distinct visual treatment per idle tier — completed
- **Phases**: build, code-review, review
- **Team**: Riley (build), Sarah (review)
- **Files changed**: renderer.ts, panelUtils.ts, TeamPanel.tsx, AgentPanel.tsx, constants.ts

### Dead code cleanup — completed
- **Phases**: build, review
- **Team**: Riley (build), Sarah (review)
- **Files changed**: renderer.ts

### Sensible idle behaviors — completed
- **Phases**: build, review
- **Team**: CEO (interactive build via Chrome MCP)
- **Files changed**: officeState.ts, constants.ts, characters.ts, roomZones.ts, renderer.ts, GamePage.tsx
- **Notes**: Built interactively with CEO directing changes and visually verifying in Chrome MCP. Iterated on ping pong positions (left/right -> above/below), gym mat tiles, couch activity type (TV -> arcade/PS5), and dimming removal.

## Follow-Up Actions

No follow-ups from audit findings — all gaps addressed during execution.

## Revert Commands

No medium-risk actions — no revert commands needed.

## Agent-Proposed Improvements

No formal build reports from agent spawns for task 4 (CEO-directed). Tasks 1-3 were completed by pipeline agents.

## Corrections Caught

All standing corrections verified. No violations found.

## UX Verification Results

- Game canvas verified via Chrome MCP: pass — agents wander to furniture, activity animations cycle, pills render with correct emoji/status dots
- Ping pong: 2 players positioned above/below table with walk animation
- Couch: gamepad emoji (arcade/PS5), typing sprite animation
- Pool stools: pool emoji when seated
- Gym mats: agents snap to mat tiles, exercise bounce animation
- Kitchen chairs: agents sit facing table
- Mobile: name pills render at minimum 0.7 zoom scale, task cards and AgentTicker hidden

## Potentially Stale Docs

Key docs referencing files modified in this directive (showing only directly relevant ones):

- .context/directives/agent-status-visual-behaviors/directive.md -> references: characters.ts, officeState.ts, renderer.ts, roomZones.ts, pixel-types.ts
- .context/directives/game-ui-tmx-update/directive.md -> references: constants.ts, officeState.ts, renderer.ts, roomZones.ts
- .context/directives/mobile-ux-improvements/directive.md -> references: index.html, CanvasOffice.tsx, GameHeader.tsx, GamePage.tsx, constants.ts

86 total stale doc references detected across all historical directives/reports (mostly from older completed directives referencing common files like CLAUDE.md, types.ts).

## Self-Assessment

### Audit Accuracy
- Findings confirmed by build: 16/16
- Findings wrong or irrelevant: none
- Issues found during build that audit missed: mobile name pill rendering (zoom < 0.8 threshold), meeting zone unreachable pathfinding, AgentTicker clutter on mobile

### Build Success
- Type-check passed: yes
- Tasks completed: 4/4
- Build failures: none

### UX Verification
- UI tasks verified in browser: 4/4 (all via Chrome MCP)
- Dead-end UI found: 0
- Data mismatches found: 0
- Issues fixed during verification: ping pong position (left/right -> above/below), gym mat approach tile conflict, couch activity type

### Challenge Accuracy
- N/A — medium weight, no C-suite challenge
