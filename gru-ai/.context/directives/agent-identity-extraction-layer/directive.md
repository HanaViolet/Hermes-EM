# Agent Identity Extraction Layer

## Problem

The session watcher currently mixes Claude Code-specific JSONL parsing directly into `session-state.ts` and `session-scanner.ts` with no abstraction. Agent identity detection uses fragile heuristics (regex on prompt text, parent session cross-referencing) that break when prompt format changes — as just happened with Riley's session.

The game UI needs two things from sessions:
1. **Which agent** is this session (identity)
2. **Is it active** right now (liveness)

These are different from pipeline state (what task they're assigned to). Both are needed.

## Current Detection (all CC-specific, no abstraction)

1. `extractAgentIdentityFromFile()` — regex on first few KB of JSONL for "You are {Name}" pattern. Works only when the prompt includes the identity line.
2. `resolveAgentFromParent()` — reads parent JSONL to find Agent tool call with matching agentId. Fragile, requires parsing large parent files.
3. `agent-setting` JSONL entry — only for CLI-spawned agents (`claude --agent riley`), not Agent tool subagents.
4. `.meta.json` sidecar — Claude Code writes `{"agentType":"riley"}` for every subagent. Deterministic but undocumented.

## Requirements

1. **Extract a platform-agnostic interface** for agent identity resolution. The interface returns `{ agentName, agentRole, platform }` given a session file path.

2. **Claude Code implementation** behind that interface:
   - Primary: `agent-setting` JSONL entry (CLI-spawned)
   - Secondary: `.meta.json` sidecar (subagents)
   - Tertiary: prompt identity line (`"You are {Name}, {Role}"`)
   - Last resort: parent cross-reference

3. **Keep the extraction layer in the server's platform directory** (`server/platform/`). The existing `server/platform/claude-code.ts` and `server/platform/types.ts` already define a platform abstraction — extend it.

4. **Remove identity detection from `session-state.ts`** — it should call the platform extraction layer, not do regex matching itself.

5. **Ensure the prompt identity line is documented as a convention** (already done in agent-prompts.md) — this is the universal fallback that works regardless of platform.

## Scope

- Refactor `session-state.ts` and `session-scanner.ts` to use a platform interface for agent identity
- Move CC-specific detection logic into `server/platform/claude-code.ts` (or a new file under `server/platform/`)
- Add `.meta.json` reading as a CC-specific detection path (not a hack — proper platform implementation)
- Keep existing behavior: all current detection paths must still work
- No game UI changes needed — the consumer interface (`agentName`, `agentRole`) stays the same

## Non-goals

- Implementing other platform adapters (Agent SDK, custom) — just define the interface
- Changing the game UI's consumption of agent status
- Modifying the pipeline's agent spawning mechanism
