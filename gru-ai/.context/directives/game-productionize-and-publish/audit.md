# Audit: gruAI Productionization

## Investigation (Sam) — Key Numbers

| Project | Key Metric |
|---------|-----------|
| repo-brand-publish | 264 "agent-conductor" refs (61 source, 203 .context/) |
| role-based-pipeline | 507 hardcoded name refs across 47 files (Morgan: 193, Sarah: 96) |
| init-and-scaffolding | init.ts 349 lines, 80% done, 8 missing features |
| game-dynamic-team | Already dynamic! 25 seats, 12 assigned, 1 missing color |
| first-run-and-readme | README exists (187 lines), needs rebranding |

## Architecture (Sarah) — Recommendations

### repo-brand-publish
- bin field must point to compiled .js not .ts
- Add build scripts for all 3 outputs (client, server, CLI)
- Only rename 61 source-file refs — leave .context/ docs as-is
- CLI path resolution: use findPackageRoot() for npm-install compatibility
- server/index.ts already resolves dist correctly

### role-based-pipeline
- Use role-based language ("CTO reviews") not template variables (no {{CTO}})
- Process in tiers: pipeline docs → skill defs → agent personalities → lessons
- Do NOT rename agent .md filenames (breaks agentFile registry lookup)
- CRITICAL: Add role-resolution instructions to SKILL.md so pipeline can map roles to agents
- Leave historical lesson references as-is, only change prescriptive ones

### init-and-scaffolding
- scaffoldRegistry() filters canonical registry by selected agents
- Path fix: findPackageRoot() walks up to find package.json
- Must copy skill docs/ subdirs, not just SKILL.md
- gruai update v1: overwrite-with-backup only, no diff/merge
- 5 new templates needed (claude-md, preferences, backlog, directive-template, agent-registry)

### game-dynamic-team (DESCOPED)
- OFFICE_AGENTS already dynamic from registry
- Real work: add rose to COLOR_NAME_TO_HEX, defensive seatId fallback, verify 2-15 agents
- Do NOT modify tilemap — desks are fixed pixel art, seat ASSIGNMENT adapts
- Effectively simple, not moderate

### first-run-and-readme
- Rewrite README.md (full rebrand)
- Welcome directive in cli/templates/welcome-directive/
- GIF is aspirational — use screenshot/placeholder, don't block on it

## Execution Waves
- Wave 1: repo-brand-publish + role-based-pipeline + game-dynamic-team (parallel)
- Wave 2: init-and-scaffolding (needs role-based-pipeline)
- Wave 3: first-run-and-readme (needs init + brand)

## Critical Gaps Identified
1. Role-resolution in SKILL.md — without it pipeline breaks after name→role conversion
2. CLI path resolution for npm-installed packages — findPackageRoot() needed
3. server imports ../scripts/intelligence-trends.js — verify this resolves from dist-server
