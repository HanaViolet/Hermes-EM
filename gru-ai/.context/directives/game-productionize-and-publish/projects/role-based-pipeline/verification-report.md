# Role-Based Pipeline Conversion -- Verification Report

## TL;DR

All 5 tasks completed + fix cycle pass. Hardcoded agent names converted to
role-based language across 47+ files. Fix cycle addressed 3 issues: stale
goals/ paths in healthcheck/SKILL.md, 4 remaining prescriptive name refs in
lessons, and this verification report update.

## Fix Cycle (2026-03-07)

3 files modified in fix cycle:

1. `.claude/skills/healthcheck/SKILL.md` -- replaced 8 stale `.context/goals/`
   path references with correct `.context/directives/` and `.context/backlog.json`
   paths (goals layer was removed 2026-03-07)
2. `.context/lessons/agent-behavior.md` -- line 19: "spawn Morgan for planning,
   spawn Sarah/reviewers" -> "spawn the COO for planning, spawn the CTO/reviewers"
3. `.context/lessons/orchestration.md` -- lines 15, 16, 20: three remaining
   prescriptive Morgan refs converted to "the COO"

## Final Grep Audit

| Category | Remaining Prescriptive Name Refs | Status |
|----------|--------------------------------|--------|
| `.claude/skills/` | 0 | Clean |
| `.claude/skills/healthcheck/SKILL.md` goals/ paths | 0 | Clean |
| `.claude/agents/` (cross-refs) | 0 | Clean |
| `.claude/agents/` (self-refs) | 9 (3 per personality file x 3 files) | Expected |
| `.context/lessons/` (prescriptive) | 0 | Clean |
| `.context/lessons/` (historical) | 10 across 4 files | Preserved |

### Historical references preserved (10 total)

- `orchestration.md` (5): Morgan/Sarah incident narratives about scoping
  disagreements, planning phase metrics, personality file discussions
- `agent-behavior.md` (2): Morgan JSON output behavior, Sarah review catches
- `state-management.md` (2): Morgan/Sarah challenge and schema review incidents
- `review-quality.md` (1): Sarah artifact_paths schema review

### Self-references in personality files preserved (9 total)

- `morgan-coo.md`: 3 occurrences (identity, name, self-description)
- `sarah-cto.md`: 3 occurrences (identity, name, self-description)
- `riley-frontend.md`: 3 occurrences (identity, name, self-description)

## Conversion Rules Applied

1. Morgan -> "the COO", Sarah -> "the CTO", Marcus -> "the CPO", Priya -> "the CMO"
2. Riley -> "the frontend engineer", Jordan -> "the backend engineer"
3. Devon -> "the full-stack engineer", Sam -> "the QA engineer"
4. Taylor -> "the content builder", Quinn -> "the UI/UX designer"
5. Casey -> "the data engineer"
6. JSON agent ID fields: name -> `{role}-id` (e.g., `"cto-id"`, `"frontend-engineer-id"`)
7. Gendered pronouns ("her", "she") -> "them", "the {role}"
8. `subagent_type` fields generalized to registry references
9. `planning.morgan_plan` -> `planning.coo_plan` in directive.json schema
10. Stale `goals/` paths updated to `directives/` where found

## Files NOT Modified (by design)

- `.claude/agent-registry.json` -- the name-to-role mapping source of truth
- Agent `.md` filenames -- unchanged (e.g., `morgan-coo.md` stays)
- `KNOWN_AGENTS` in `server/parsers/session-scanner.ts` -- runtime code
- Historical narrative in lessons files -- preserved as written
