# Directive: Productionize and Publish gruAI as Open Source

## CEO Brief

Transform agent-conductor into `gruai` — an open-source npm package that lets developers run an autonomous AI dev team with a pixel-art office simulation UI. Two usage modes:
1. **Clone & run** — clone repo, `npm run start`, server + game UI running
2. **Install in existing repo** — `npm install gruai`, `npx gruai init` scaffolds everything, `npx gruai start` runs

## Key Areas

### 1. Repo & Brand
- Rename GitHub repo from `agent-conductor` to `gruai`
- Create `agent-conductor` branch to preserve original framework state
- npm package name: `gruai`
- MIT LICENSE

### 2. Build & Publish
- Vite build config that outputs dist with all assets (including LimeZu — compiled game product, not raw redistribution)
- Dist committed to git
- `npm run start` script runs server + serves dist
- npm publish config: package.json (name: gruai), .npmignore
- README with GIF of game UI, quickstart under 3 commands

### 3. Custom Agent Teams (BIGGEST CHALLENGE)
- Pipeline must be **role-based, not name-based** — "the COO plans" not "Morgan plans"
- Casting rules reference roles (`"agent": ["frontend"]`) not hardcoded names (`"agent": ["riley"]`)
- Pipeline docs, templates, prompts — all need to be parameterized by role
- `gruai init` generates agent personalities from role templates with user-chosen or random names
- agent-registry.json is the source of truth — game dynamically maps any agent set to sprites/desks/colors
- Default team ships with randomized names but standard roles (CTO, COO, CPO, CMO + frontend, backend, fullstack, QA, data, content, designer)

### 4. Onboarding (`gruai init`)
- `npx gruai init` scaffolds into user's repo:
  - `.claude/agents/*.md` — generated agent personalities
  - `.claude/agent-registry.json` — team config
  - `.claude/skills/directive/` — full pipeline copied from gruai package
  - `.context/` — vision.md (template), goals/, directives/, lessons/ (starters), reports/
  - `CLAUDE.md` — generated project instructions for Claude Code
  - `gruai.config.json` — port, settings
- Minimal questions (project name at most), smart defaults for everything
- Upgrade path: `npx gruai update` to pull newer pipeline/skill versions

### 5. Developer Experience
- First-run: `gruai start` opens game UI with populated team
- Welcome directive auto-queued so agents are visibly working on first launch
- User defines goals in `.context/goals/`, uses `/directive` for work

## CEO Decisions (from brainstorm)
- Game code stays in this repo, no extraction
- No demo mode — game connects to live conductor server
- LimeZu assets in dist are fine (compiled game product)
- Install within user's repo
- Multi-LLM support (Cursor, Aider, etc.) deferred to future directive
- Repo renamed to gruai, agent-conductor branch preserves original state
- gruai npm name is available (verified)

## Competitive Landscape
- Nobody else has a visual office simulation for AI agents
- Devin ($500/mo), CrewAI, OpenAI Symphony — all headless/CLI
- Cursor/Aider/Windsurf shipped multi-agent Feb 2026 — all IDE/CLI, no game UI
- The pixel-art office is the unique differentiator and distribution strategy

## Prior Work
Asset license compliance handled in directive `game-open-source-prep` (completed).

## Goal Alignment
Goal: `game` — Office Simulation as Primary CEO Interface
