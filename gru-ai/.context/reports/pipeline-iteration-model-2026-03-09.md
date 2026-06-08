# Directive Report: Pipeline Iteration Model

**Date**: 2026-03-09
**Directive**: pipeline-iteration-model
**Weight**: Strategic
**Planned by**: COO (Morgan)

## Summary

Redesigned the pipeline to solve intent degradation (CEO's words never reaching builders) and add iteration support. Three layers: (1) intent propagation with CEO brief + verified intent flowing verbatim to builders, (2) user-centric DOD with acceptance scenarios replacing technical checklists, review fix cycles (3 code-review, 2 standard), and (3) completion gate with amend/extend/redirect options. 14 tasks completed across 3 projects; 1 project deferred (P2).

## Directive-Level DOD Assessment

- [x] Pipeline asks me to verify intent extracted from brief + audit + brainstorm — **MET** (clarification step doc created with intent extraction and CEO verification gate)
- [x] Builder's prompt contains original brief and verified intent — **MET** (09-execute-projects.md Builder Context requires CEO brief + verified intent verbatim)
- [x] Review finds bugs, builder fixes them, re-review happens — **MET** (code-review: 3 fix cycles with convergence detection; standard review: 2 fix cycles)
- [x] Completion gate shows acceptance scenarios as checklist with pass/fail evidence — **MET** (11-completion-gate.md rewritten with acceptance checklist centerpiece)
- [x] Can say 'amend' for small fix without full pipeline restart — **MET** (4 options: approve/amend/extend/redirect with token budgets and restart points)
- [x] DOD reads like user stories, not technical checklists — **MET** (scope-and-dod.md rewritten with given/when/then examples, derivation chain)

## Projects

### Project 1: walkthrough-polish — completed

**Priority**: P0 | **Agent**: Taylor | **Reviewer**: Sarah

3 tasks completed:

1. **add-pipeline-scenarios** — 5 new pipeline-specific standing scenarios added to scenarios.md (directive-intent-extraction, builder-context-completeness, review-fix-cycle, completion-checklist, pipeline-smoke-test)
2. **enhance-cto-trace-step** — CTO trace in walkthrough SKILL.md now includes doc-consistency checks (cross-references, schema-template alignment, validation script coverage)
3. **update-gap-report-for-doc-consistency** — Report template includes conditional Doc Consistency section with findings

### Project 2: first-pass-quality — completed

**Priority**: P0 | **Agent**: Taylor | **Reviewer**: Sarah

8 tasks completed:

1. **reorder-pipeline-merge-challenge** — Pipeline reordered: audit before brainstorm, challenge merged into brainstorm, clarification step added. SKILL.md routing table updated.
2. **add-directive-level-dod** — directive-json.md now has `dod` object with success_looks_like, failure_looks_like, quality_bar, examples
3. **create-clarification-step** — New 04b-clarification.md: intent extraction from CEO brief + audit + brainstorm, CEO verification for heavyweight/strategic
4. **rewrite-scope-and-dod** — scope-and-dod.md rewritten with user-centric acceptance scenarios, given/when/then format, DOD derivation chain
5. **update-project-brainstorm-inputs** — 07b-project-brainstorm.md now receives CEO brief + verified intent, derives task DOD from directive DOD
6. **update-execute-builder-and-reviews** — Builder gets CEO brief verbatim, code-review 3 fix cycles, standard review 2 fix cycles
7. **remove-single-project-bias-and-weight-upgrade** — "SINGLE-PROJECT IS THE DEFAULT" removed from planner-prompt.md, audit weight_recommendation added
8. **create-failure-patterns-and-final-cleanup** — failure-patterns.md created with 3 patterns, cross-file consistency pass (11 issues fixed)

**Review findings**: 1 fix cycle triggered — CTO found brainstorm/challenge merge incomplete (SKILL.md still linked old 04-challenge.md), orphan challenger files still existed. Fixed in retry.

### Project 3: iteration-fallback — completed

**Priority**: P1 | **Agent**: Taylor | **Reviewer**: Sarah

3 tasks completed:

1. **schema-iteration-fields** — iterations[], revision, intent_version defined in directive-json.md with full types
2. **completion-gate-rewrite** — 11-completion-gate.md rewritten: acceptance checklist, 4 options (approve/amend/extend/redirect), token budgets, restart points
3. **failure-handling-iteration-cases** — 5 new failure-handling rows for iteration cases, orphaned reopen references cleaned

### Project 4: orchestrator-split — deferred (P2)

6 tasks defined but not executed. All directive DOD items met by projects 1-3. Orchestrator split is an optimization — separating the CEO session from the orchestrator session for better context management.

## Files Changed (26 files, +1156 -800 lines)

**Pipeline docs** (13): SKILL.md, 00-delegation-and-triage.md, 02-read-directive.md, 03-read-context.md, 04-challenge.md, 05-planning.md, 06-technical-audit.md, 07-plan-approval.md, 07b-project-brainstorm.md, 08-worktree-and-state.md, 09-execute-projects.md, 10-wrapup.md, 11-completion-gate.md

**Reference docs** (8): failure-handling.md, phase-definitions.md, scope-and-dod.md, audit-output.md, directive-json.md, architect-prompt.md, brainstorm-prompt.md, planner-prompt.md

**Deleted** (2): challenger-output.md, challenger-prompt.md (absorbed into brainstorm)

**Created** (1): 04b-clarification.md

**Other** (2): walkthrough/SKILL.md, scenarios.md, CLAUDE.md, failure-patterns.md

## Follow-Up Actions

### Backlogged (deferred project)
- **orchestrator-split** (P2) — Separate orchestrator session from CEO session. 6 tasks defined in project.json. Source: pipeline-iteration-model directive.

### No auto-executed follow-ups
No audit-generated follow-ups — audit was skipped (brainstorm Phase 2 served as audit).

## Revert Commands

No medium-risk actions — no revert commands needed.

## Agent-Proposed Improvements

No improvements proposed — this was a pipeline doc rewrite directive with no code execution.

## Corrections Caught

No standing corrections applied — pipeline doc changes don't trigger code-level corrections.

## UX Verification Results

No UI tasks — UX verification skipped.

## Potentially Stale Docs

The stale docs detection found 80+ references, but nearly all are from old completed directives referencing broadly-modified files (CLAUDE.md, SKILL.md, types.ts). The pipeline-relevant stale references are:

- Old directive docs referencing modified SKILL.md (expected — SKILL.md routing table changed)
- Agent memory files referencing modified types (unrelated to this directive's scope)
- No stale references within the pipeline docs themselves — cross-file consistency was verified in task 8

## Self-Assessment

### Audit Accuracy
- Audit skipped (brainstorm Phase 2 root cause analysis served as audit)
- Brainstorm identified 5 failure points — all addressed in execution

### Build Success
- Tasks completed: 14/14 (across 3 projects)
- Projects completed: 3/4 (1 deferred as P2)
- Build failures: 0
- Review fix cycles: 1 (first-pass-quality project — brainstorm/challenge merge incomplete)

### Challenge Accuracy
- Brainstorm: 2 rounds, 8 agents
- Phase 1 proposals rejected by CEO (focused on cheaper iteration, not first-pass quality)
- Phase 2 converged on intent degradation as root cause — unanimous across CTO/CPO/COO
- Root cause analysis proved correct: all 6 DOD items addressed by fixing intent propagation

### Risk Classification
- No low-risk auto-executes
- Items that should have been classified differently: none
