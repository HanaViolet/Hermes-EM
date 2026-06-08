# Agent Identity Extraction Layer — Digest

**Directive:** agent-identity-extraction-layer
**Weight:** Lightweight
**Date:** 2026-03-09
**Builder:** Jordan (BE) | **Reviewer:** Sarah (CTO)

## Summary

Moved agent identity resolution behind the `PlatformAdapter` interface. Previously, `session-state.ts` directly imported and called 3 identity detection functions from `session-scanner.ts` (prompt regex, parent cross-ref, agent-setting lookup), mixing Claude Code-specific logic into platform-agnostic code.

## Changes

| File | Change |
|------|--------|
| `server/platform/types.ts` | Added `resolveAgentIdentity()` to `PlatformAdapter` interface |
| `server/platform/claude-code.ts` | Implemented `resolveAgentIdentity()` with 4-step fallback chain |
| `server/parsers/session-state.ts` | Replaced direct identity calls with `ResolveIdentityFn` callback |
| `server/parsers/session-scanner.ts` | Added `resolveAgentFromMeta()` for `.meta.json` sidecar support |

## Fallback Chain (ClaudeCodeAdapter)

1. `agent-setting` JSONL entry (CLI-spawned agents)
2. `.meta.json` sidecar (subagents — new detection path)
3. Prompt pattern matching ("You are {Name}, {Role}")
4. Parent session cross-reference (subagent_type from Agent tool calls)

## Review Outcome

- **Result:** Pass
- **Bugs found:** 0
- **DOD:** 4/4 criteria met
- **Type-check:** Zero errors
- **Tests:** 61 pass

## Notes

- Identity functions remain exported from `session-scanner.ts` — no breaking changes
- `resolveAgentFromSetting` stays as a direct import in `session-state.ts` for inline JSONL entry handling (entry-level, not file-level)
- Two low-severity observations about dual `parentAgentMapCache` singletons — expected during Strangler Fig migration
