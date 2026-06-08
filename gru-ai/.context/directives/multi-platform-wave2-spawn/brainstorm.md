# Wave 2 Brainstorm Synthesis

## Participants
- Sarah Chen (CTO)
- Marcus Rivera (CPO)

## Convergence
1. SpawnAdapter as SEPARATE interface from PlatformAdapter — monitoring and execution are different concerns
2. Universal agent personality format with thin platform-specific compiler (prose shared, frontmatter compiled)
3. Don't inject conditionals into pipeline markdown docs — replace `claude -p --agent` with `scripts/spawn-agent.ts` wrapper
4. Exclude Cursor/Windsurf from spawn layer (no CLI spawn mode)
5. Auto-detect installed platforms at `gruai init`, store in config, allow per-role platform assignment
6. Prove abstraction with Claude Code (existing) + Codex CLI (closest match), then stop

## Key Architecture Decisions (Sarah)
- SpawnAdapter interface: `spawnAgent(prompt, agentId, opts): SpawnHandle` + `killAgent(pid)`
- SpawnHandle must normalize completion detection (exit code + output parsing) across heterogeneous formats
- Pipeline docs stay platform-neutral — all spawn mechanics in `scripts/spawn-agent.ts` + `docs/reference/rules/spawn-rules.md`
- Agent personality compiler: reads .claude/agents/*.md, emits platform-native configs (.aider.conf.yml, codex flags, etc.)
- Codex sandboxing may conflict with wave-based shared working tree assumption

## Key Product Decisions (Marcus)
- Multi-platform simultaneously is the killer differentiator (C-suite on Claude Code, engineers on Codex CLI)
- Auto-detect at init + test connection step to validate credentials
- Default: single-platform. Multi-platform as opt-in.
- PlatformCapabilities.supportsCLISpawn gates spawn availability
- Authentication/billing varies per platform — init must validate per-platform
