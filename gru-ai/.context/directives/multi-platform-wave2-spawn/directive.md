# Directive: Multi-Platform Wave 2 — Spawn & Execution Abstraction

## CEO Brief

Wave 1 extracted the monitoring layer behind PlatformAdapter (session parsing, file watching, config discovery). Wave 2 abstracts the execution layer — how gruAI spawns agents and dispatches work across platforms.

## Current State (Claude Code Specific)

1. **Foreman** (`scripts/foreman.ts`) — spawns agents via `claude -p --agent`, tracks child PIDs
2. **Pipeline execution** (`09-execute-projects.md`) — uses `claude -p --agent` for parallel builds, Agent tool with `subagent_type` for inline spawns
3. **Agent definitions** (`.claude/agents/*.md`) — Claude Code-specific frontmatter (`permissionMode`, `hooks`, `skills`)
4. **Skills** (`.claude/skills/directive/SKILL.md`) — references Agent tool, subagent_type, Claude Code-specific patterns
5. **CLI init** (`cli/commands/init.ts`) — scaffolds `.claude/` directory structure

## Scope

### In Scope
- Abstract foreman spawn logic behind a SpawnAdapter interface
- Make pipeline execution docs platform-conditional (detect active platform, use appropriate spawn)
- Agent personality compiler: generate platform-specific config from agent-registry.json (.cursorrules, codex.md, .clinerules, etc.)
- Extend PlatformAdapter with spawn/dispatch methods
- Research: what's the equivalent of `claude -p --agent` for each platform?

### Out of Scope
- Building actual non-Claude-Code adapters (Wave 3)
- Marketing/distribution work
- Game UI changes

## Prior Work
- Wave 1 directive: `multi-platform-support` (completed)
- Research report: `.context/directives/multi-platform-support/projects/platform-research-and-adapter/research-report.md`
- PlatformAdapter interface: `server/platform/types.ts`
- ClaudeCodeAdapter: `server/platform/claude-code.ts`

## Category
framework
