# Dashboard Status Sync — Fix UI Not Showing Active Directives

## Problem
1. **Active directives not showing in UI**: `gruai-marketing-launch` has `status: "active"` but doesn't appear in the dashboard. The directive-watcher's `readCurrentState()` only checks for `in_progress` and `awaiting_completion`, filtering out `active` status.

2. **Pipeline state not updated in time**: During brainstorming/execution, agents complete work but directive.json isn't always updated promptly, so the dashboard lags behind reality.

## Root Cause
- `mapStatus()` in `server/watchers/directive-watcher.ts` maps `"active"` to `"pending"` (default case)
- `readCurrentState()` hardcodes filter: `status === 'in_progress' || status === 'awaiting_completion'` — skips `"active"`
- `readActiveDirectives()` hardcodes filter: `['in_progress', 'awaiting_completion', 'reopened']` — skips `"active"`
- MCP `conductor_status` tool correctly handles `"active"` (inconsistency)

## Expected Outcome
- Directives with `status: "active"` appear in the dashboard
- Status mapping is consistent across server watcher and MCP tools
- Pipeline state updates propagate to UI reliably
