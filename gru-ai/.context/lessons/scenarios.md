# Standing Scenarios — Cognitive Walkthrough
<!-- Pipeline-specific scenarios. Run /walkthrough all after pipeline doc changes. -->

## directive-intent-extraction
- **Actor**: CEO (solo founder)
- **Trigger**: CEO types `/directive improve-dashboard-ux` with a brief describing the problem and desired outcome
- **Goal**: The system extracts my intent -- not just my words -- after audit and brainstorm ground it in codebase reality. I verify the extracted intent piece by piece before anyone plans.
- **Critical path**:
  1. CEO writes directive.md with a brief: "The dashboard loads too slowly and the layout wastes space on mobile"
  2. Read step extracts directive-level DOD from the brief into `directive.json.dod` (success_looks_like, failure_looks_like, quality_bar, examples)
  3. Audit step runs -- auditor scans active files, produces findings with baseline metrics and file inventory. May recommend weight upgrade via `weight_recommendation`
  4. Brainstorm step runs (heavyweight/strategic) -- C-suite agents receive audit findings as input, produce approach options grounded in codebase reality, written to `brainstorm.md`. Challenge is embedded in brainstorm Phase 1 (no separate challenge step)
  5. Clarification step (04b-clarification.md) synthesizes intent from directive.md + audit output + brainstorm output into structured `verified_intent`: goal, constraints, quality_bar, acceptance_scenarios, out_of_scope. CEO verifies each field piece by piece (heavyweight/strategic) or auto-approved (lightweight/medium)
  6. COO reads directive.md + audit findings + brainstorm + verified intent, produces `plan.json`. Plan references the verified intent, not a re-interpretation
  7. After approval, project-brainstorm step decomposes tasks -- each task gets a `user_scenario` and `dod` derived from `directive.json.dod.success_looks_like` via the DOD derivation chain
- **Success criteria**: Every task DOD in project.json traces back to a `directive.json.dod.success_looks_like` item. The CEO verifies intent in the clarification step BEFORE planning begins. Intent does not degrade across triage -> audit -> brainstorm -> clarification -> plan -> task decomposition.

## builder-context-completeness
- **Actor**: Builder agent (engineer assigned to a task)
- **Trigger**: Execute step spawns the builder for task 1 of a project
- **Goal**: My prompt contains everything I need to build what the CEO actually wants -- the CEO's original brief verbatim, the verified intent from the clarification step, the acceptance scenarios, and the auditor's recommended approach. I should never have to guess what the CEO meant.
- **Critical path**:
  1. Execute step reads project.json and extracts the task: `scope`, `dod`, `user_scenario`, `phases`
  2. Builder prompt is assembled per 09-execute-projects.md "Builder Context" section -- includes task scope + DOD
  3. Builder prompt includes **CEO brief** (directive.md content -- verbatim, per Builder Context required inputs)
  4. Builder prompt includes **verified intent** (directive.json.pipeline.clarification.output.verified_intent -- verbatim, per Builder Context required inputs)
  5. Builder prompt includes the auditor's `recommended_approach` and `active_files` (verbatim, as guidance)
  6. Builder prompt includes brainstorm output from `brainstorm.md` (if project had brainstorm phase) with the brainstorm constraint preamble requiring `brainstorm_alignment` in the build report
  7. Builder prompt includes `.context/preferences.md` (standing CEO corrections) and `.context/vision.md` (guardrails)
  8. Builder reads the prompt, builds the feature, and produces a build report with `user_walkthrough` and `proposed_improvements` sections
- **Success criteria**: The builder's prompt contains: (a) task scope and DOD from project.json, (b) CEO brief verbatim, (c) verified intent verbatim, (d) auditor's recommended approach, (e) brainstorm output with alignment constraint, (f) CEO preferences and vision guardrails. No critical context is missing. The builder's `user_walkthrough` demonstrates the feature works as the CEO described in the original brief.

## review-fix-cycle
- **Actor**: Code reviewer agent (from project's `reviewers` cast)
- **Trigger**: Builder completes build phase, code-review phase begins per the task's `phases` array
- **Goal**: I review with fresh eyes -- full file contents and diff, no builder reasoning. If I find bugs, the builder fixes them and I re-review. Up to 3 code-review cycles with convergence detection, then up to 2 standard review cycles.
- **Critical path**:
  1. Code-review phase starts -- reviewer receives full contents of touched files + `git diff` output + auditor's `recommended_approach`, but NO builder reasoning or design docs (fresh-context prompt per 09-execute-projects.md)
  2. Reviewer produces structured output: `code_review_outcome` (pass/fail/critical), `bugs_found[]`, `approach_deviation`, `data_flow_issues[]`, `reachability_check[]`
  3. If `code_review_outcome` = "fail" -- execute step re-spawns the builder with `bugs_found` and `data_flow_issues` as fix instructions (verbatim from review output)
  4. Builder fixes the identified issues and reports what changed
  5. Code-review runs again on the updated diff -- same fresh-context prompt, same reviewer, new file contents
  6. **Convergence detection**: if the same bug appears in 2 consecutive cycles, escalate to a senior engineer or log as known issue -- don't keep retrying the same approach
  7. Max 3 code-review fix cycles. If still failing: log remaining findings, proceed to standard review
  8. Standard review runs with DOD verification + user-perspective evaluation. If fail: re-spawn builder with findings, re-review. Max 2 standard review fix cycles. Total budget across both review types: 5 fix cycles per task
- **Success criteria**: Bugs caught in code-review are fixed BEFORE the standard reviewer sees the code. The fix cycle is bounded (max 3 code-review + 2 standard = 5 total) with convergence detection so the pipeline does not stall on the same bug. The reviewer's `code_review_outcome` JSON drives the fix/proceed decision mechanically.

## completion-checklist
- **Actor**: CEO (solo founder)
- **Trigger**: Directive reaches `awaiting_completion` status after wrapup step
- **Goal**: I see an acceptance checklist with every directive DOD scenario marked pass/fail with evidence. I choose from 4 options -- not binary accept/reject.
- **Critical path**:
  1. Wrapup step produces a digest to `.context/reports/{directive-name}-{date}.md` with key points, review findings, and task outcomes
  2. Wrapup sets directive.json `status` to `"awaiting_completion"` and `current_step` to `"completion"`
  3. Completion gate (11-completion-gate.md) builds an **acceptance checklist** walking every project's DOD as pass/fail rows with evidence. Also persists `acceptance-checklist.md` for async review
  4. CEO reviews the acceptance checklist -- each directive.json.dod.success_looks_like item mapped to pass/fail with evidence from project DOD verification
  5. CEO chooses one of 4 options:
     - **Approve**: status -> `"completed"`, `completed` date set
     - **Amend**: small fix, restarts from execute. Adds `iterations[]` entry, increments `revision`
     - **Extend**: add scope, restarts from plan with delta planning only
     - **Redirect**: full replanning, restarts from plan with new approach
  6. For amend/extend/redirect: directive.json records the iteration (type, reason, items), revision increments, intent_version bumps if scope changed
- **Success criteria**: CEO sees directive DOD pass/fail per criterion with evidence -- not a vague "looks good." CEO can amend specific items without full pipeline restart. The completion gate is the ONLY path to `"completed"` status -- no directive skips it.