# Pipeline Quality Gates — Directive Report

**Directive:** pipeline-quality-and-trim | **Weight:** Strategic | **Date:** 2026-03-09

## Summary

5 surgical prompt edits across 4 pipeline docs to prevent the failure modes exposed by the game-ui-tmx-update directive, where 7 CEO requirements went in and 0 were visually delivered.

## Root Cause Addressed

The pipeline optimized for code correctness, not requirement fulfillment:
- COO silently compressed 7 requirements into 4 tasks
- DOD was code-centric ("uses ctx.fillText"), not user-centric ("labels visible at default zoom")
- Reviewer did code review, not acceptance review
- `zoom < 2` guard hid all work at default zoom — nobody checked

## Changes Made

### 1. COO Clarification Behavior (`planner-prompt.md`)
Added REQUIREMENT CLARITY CHECK section. COO now scans for ambiguous requirements and surfaces them in `challenges.risks` before planning. Three ambiguity patterns documented: vague scope, missing default-state conditions, unbounded visual requirements.

### 2. User-Centric DOD for UI Tasks (`07b-project-brainstorm.md`)
Added rule in TASK DECOMPOSITION RULES: UI task DOD must describe what the user sees at default state. Two contrasting examples (bad: "Component renders" vs good: "Labels visible at default zoom"). Scoped to UI/visual files only.

### 3. Acceptance Review > Code Review (`09-execute-projects.md`)
Restructured User-Perspective Review: user_scenario verification is now STEP 1 (primary), gap analysis is STEP 2 (secondary). Explicit rule: `workflow_improvement: "no"` = fail, even with clean code.

### 4. Default-State Verification (`09-execute-projects.md`)
Added default-state verification block for UI tasks. Reviewers verify at default browser zoom (100%), default view, representative data. `default_state_check` field added to review JSON. Concrete example references the `zoom < 2` bug.

### 5. UI/Visual DOD Rules (`scope-and-dod.md`)
New "UI/Visual Definition of Done Rules" section with 3 rules: describe what user sees, include default-state conditions, no implementation-only language. Each rule has BAD/GOOD contrasting examples.

## Review Results

- **Reviewer:** Sarah (CTO)
- **Outcome:** Pass — all 20 DOD criteria met
- **Minor issues found and fixed:**
  1. Step numbering mismatch in planner-prompt.md (renumbered)
  2. `default_state_check` was unconditional in review JSON template (added conditional note)
  3. File pattern inconsistency (`pages/` missing from 07b) (added)

## Follow-ups

- **Context trim** — CEO explicitly deferred to separate directive. Pipeline docs total ~28K words. Target: 40-50% reduction.
- **Builder self-verification (R5)** — Dropped from scope. The user-centric DOD improvements address the underlying issue organically.
