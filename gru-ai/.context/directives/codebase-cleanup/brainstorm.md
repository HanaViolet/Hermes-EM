# Codebase Cleanup — Brainstorm Synthesis

## Proposals

### Sarah Chen (CTO) — 5 projects, dependency-ordered
Server dead code > Frontend dead code > Dependency cleanup > Public assets > Scripts. Specific targets: Intelligence Trends types (~50 lines), Codex CLI adapter (DELETE), zod transitive dep bug, dialog.tsx unused, type drift reconciliation.

### Morgan Park (COO) — 5 projects, parallel by domain
Frontend purge > Server cleanup > Scripts+config > Public assets > Server types alignment. Types alignment runs last. Each project independently verifiable.

### Sam Nakamura (QA) — 4 projects, risk-ordered sequential
Dead files > Public assets > Deps+config > Type drift. Additional finds: cleanup.ts (zero imports), barrel index files (zero consumers), toolUtils.ts orphaned, getEventsBySession dead function, dist dirs not in .gitignore.

## Convergence Points
1. Domain-based decomposition, NOT single-agent whole-codebase sweep
2. Same core dead targets: intelligence-trends, codex-proof, find-gids, Tiled .tsx files, cmdk dep
3. Type-check (`tsc --noEmit`) + vite build verification after each project
4. Deletion only — no refactoring or restructuring
5. Git history preserves everything — aggressive deletion is safe

## Disagreements
- **Codex platform adapter**: Sarah says delete (dead today), Sam says keep (foreman imports it). RESOLUTION: verify actual import chain before deciding.
- **Execution order**: Sam wants sequential (risk isolation), Morgan wants parallel (speed). RESOLUTION: parallel with type-check gates.
- **Barrel index files**: Sam found engine/index.ts, sprites/index.ts, layout/index.ts have zero external consumers. Sarah didn't flag these.

## Unique Findings by Agent
- **Sarah**: zod transitive dep bug in work-item-types.ts, FullWorkState sub-types safe (used by panels)
- **Morgan**: ~120 lines of dead types in src/stores/types.ts, server/frontend type divergence details
- **Sam**: cleanup.ts zero imports, toolUtils.ts orphaned, dist-cli/dist-server not in .gitignore, public/singles/ 24 dirs potentially bloat, getEventsBySession dead function in db.ts
