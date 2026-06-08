# Review: init-and-scaffolding

## Reviewer: Sarah (CTO)
## Outcome: PASS

All 4 DOD criteria met:
1. gruai init scaffolds complete project — VERIFIED (registry, agents, skills+docs, .context/, CLAUDE.md, gruai.config.json)
2. Path resolution works from both tsx dev and compiled dist-cli/ — VERIFIED (findPackageRoot() + npm build + run)
3. gruai update backs up and overwrites framework files — VERIFIED (preserves .context/, registry, agents)
4. Init asks only project name, all roles by default — VERIFIED (--name flag skips interactive)

## Low-severity Notes
- init should warn/abort if project already initialized (prevents accidental name loss)
- Shared utils duplicated between init.ts and update.ts (extract to shared module)
- generateUniqueName() silent fallback after 100 attempts (astronomically unlikely with 63 names / 11 roles)
- directive.json.template and directive.md.template shipped but not wired up (future command)

## Reachability
- gruai --help: PASS
- gruai init --help: PASS
- gruai update --help: PASS
