# Agent Status Visual Behaviors

Add `paused` and `done` as distinct agent visual behaviors in the game engine.

## Current State
AgentStatus only has: `working | waiting | idle | error | offline`. The `paused` server status (5min-1hr old, still between turns) maps to `working`, which is wrong — agents appear busy when they're actually done. The `done` status (agent gave final response) maps to `idle`, losing the "just finished" signal.

## Desired Behaviors

| Status | Visual | Location |
|--------|--------|----------|
| `working` | Typing animation at desk | Desk (or meeting/server room) |
| `waiting` | Reading animation at desk | Current location |
| `paused` | Idle/coffee pose at desk (not typing) | Stay at desk |
| `done` | Brief linger at desk, then walk to break room | Desk -> break room |
| `idle` | Walking around the office freely | Wander anywhere |
| `error` | Error indicator at desk | Desk |
| `offline` | Walking to break room | Break room |

## Goal
Make the office feel alive — you can tell at a glance who's actively working, who just finished a task, who's on break, and who hasn't worked in a while.

## Files to Touch
- `src/components/game/pixel-types.ts` — add `paused` and `done` to AgentStatus
- `src/components/game/GamePage.tsx` — update toAgentStatus mapping
- `src/components/game/engine/officeState.ts` — update applyAgentStatus for new states
- `src/components/game/engine/roomZones.ts` — update chooseDestination routing
- `src/components/game/engine/characters.ts` — paused animation behavior
- `src/components/game/engine/renderer.ts` — any visual indicators for new states
