# Fix Character Click Regression

Characters in the game canvas are not clickable — clicking a character sprite should open that agent's panel in the SidePanel, but nothing happens.

## Root Cause

Stale React closure bug in `useCallback` hooks. Three callbacks in `CanvasOffice.tsx` and one in `GamePage.tsx` capture initial empty values from async registry loading and never update:

1. `resolveAgentName` — captures empty `AGENT_ID_TO_NAME` map (deps: `[]`)
2. `resolveRealAgentName` — captures empty `AGENT_ID_TO_REAL_NAME` map (deps: `[]`)
3. `processClick` — captures `CEO_ID = null` (missing from deps)
4. `handleAgentClick` in GamePage — captures empty `OFFICE_AGENTS` array (missing from deps)

## Fix

Add proper dependency arrays so callbacks update when agents load:
- `resolveAgentName`: `[AGENT_ID_TO_NAME]`
- `resolveRealAgentName`: `[AGENT_ID_TO_REAL_NAME]`
- `processClick`: add `CEO_ID` to deps
- `handleAgentClick`: add `OFFICE_AGENTS` to deps
