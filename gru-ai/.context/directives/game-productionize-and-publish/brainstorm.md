# Brainstorm: gruAI Productionization & Publishing

## Phase 1 Proposals

### Sarah (CTO) — Architecture
- Rename package to `gruai`, 3 build outputs: dist/, dist-server/, dist-cli/
- Ship all three + public/assets/ + .claude/ scaffolding via npm
- Extend existing cli/commands/init.ts (80% already built)
- Fix path resolution for installed-package mode (import.meta.dirname)
- Server already resolves dist correctly via relative paths
- better-sqlite3 is friction but acceptable for our audience
- Skills MUST be copied to user repo (Claude reads from .claude/skills/)
- Confidence: high

### Marcus (CPO) — User Experience
- Critical moment: 90 seconds from install to seeing something alive
- Init: 3 questions max, smart defaults for everything
- Welcome directive auto-queued on first run (agents visibly working)
- Don't show blank office — pre-populate with default team
- Defer agent customization to post-init (edit config later)
- Single port for server + game
- Confidence: medium

### Priya (CMO) — Positioning & Growth
- Lead README with GIF of game UI — that IS the conversion funnel
- Pitch: "Your AI dev team, visualized"
- npm description: "Autonomous AI dev team with a live office simulation — powered by Claude Code"
- Pixel-art game is inherently shareable — unlike any competitor
- Quickstart under 3 commands
- Confidence: high

## Phase 2 Rebuttals

### Sarah → Marcus
better-sqlite3 friction is overblown. Our audience runs Claude Code (native deps already). Real fix is additive: scaffold .claude/skills/ + queue welcome directive.

### Marcus → Sarah
Proposal treats this as a build engineering problem when it's a first-run experience problem. Start from user's first 90 seconds, work backward to build structure.

### Priya → Sarah
Package naming is a branding decision buried in a technical proposal. "gruai" needs market validation.

## CEO Decisions (Post-Brainstorm)

1. **gruai npm name**: Verified available. CEO confirms.
2. **Repo rename**: GitHub repo renamed from `agent-conductor` to `gruai`. `agent-conductor` branch preserves original state.
3. **Multi-LLM support**: Deferred to future directive. Currently Claude Code only.
4. **Custom agent teams**: Added to scope — this is the BIGGEST challenge. Pipeline must become role-based (not name-based). Casting rules, pipeline docs, agent prompts all need parameterization.
5. **No demo mode**: Confirmed. Game connects to live server.
6. **No separate CLI**: Server handles everything.
7. **better-sqlite3**: Keep it. Target audience has full Node toolchain.

## Competitive Intel

- **gruai is unique**: No competitor has a visual office simulation for AI agents
- Devin ($500/mo), CrewAI, OpenAI Symphony — all headless
- Cursor/Aider/Windsurf multi-agent (Feb 2026) — all IDE/CLI
- The pixel-art office IS the distribution strategy (Priya)

## Scope for Morgan's Planning

### Area 1: Build & Publish
- Vite build → dist with assets
- npm publish config (package.json name: gruai, MIT LICENSE, .npmignore)
- `npm run start` runs server + serves dist
- Dist committed to git
- README with GIF, quickstart

### Area 2: Custom Agent Teams (BIGGEST)
- Parameterize all pipeline docs/templates/prompts: role-based, not name-based
- Casting rules use role tags (`frontend`, `backend`, `cto`) not names (`riley`, `jordan`, `sarah`)
- Agent personality templates that `gruai init` instantiates with user/random names
- agent-registry.json as source of truth — game dynamically maps any team
- Default team: standard roles (CTO, COO, CPO, CMO + 7 specialists), random names

### Area 3: Onboarding (`gruai init`)
- Extend existing cli/commands/init.ts
- Scaffold: .claude/agents/, .claude/agent-registry.json, .claude/skills/directive/, .context/ tree, CLAUDE.md, gruai.config.json
- Minimal questions, smart defaults
- Path resolution for installed-package mode
- `gruai update` for version upgrades

### Area 4: First-Run Experience
- Welcome directive auto-queued on first `gruai start`
- Game UI shows populated team immediately
- README/docs guide user to first real directive

### Area 5: Repo Housekeeping
- Create `agent-conductor` branch
- Rename references throughout codebase
- Update package.json name to gruai
