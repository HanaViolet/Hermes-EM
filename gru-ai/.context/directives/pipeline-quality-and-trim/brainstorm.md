# Brainstorm Synthesis — Pipeline Quality Gates

## Approved Scope (5 Surgical Prompt Edits)

CEO narrowed from full brainstorm to 5 targeted edits across 4 files. No new schemas, steps, scripts, or process overhead. Context trim deferred to separate directive.

### 1. COO Clarification Behavior
**File:** `docs/reference/templates/planner-prompt.md`
**Change:** Add instruction for COO to ask clarifying questions and surface gaps when requirements are ambiguous or numerous, rather than silently compressing/dropping requirements. Model after brainstorm's "superpowers" questioning behavior.

### 2. User-Centric DOD for UI Work
**File:** `docs/pipeline/07b-project-brainstorm.md`
**Change:** When CTO + builder write DOD for UI/visual tasks, criteria must use "user can see/do at default state" format. Not implementation technique ("uses ctx.fillText") but observable outcome ("name labels visible above every character at default zoom").

### 3. Acceptance Review > Code Review
**File:** `docs/pipeline/09-execute-projects.md`
**Change:** Rewrite review prompt to weight acceptance testing (does it work for the user?) over code review (is the code clean?). For UI work: verify visually. For API: test endpoints. For CLI: run commands. Code quality is secondary.

### 4. Default-State Verification
**File:** `docs/pipeline/09-execute-projects.md`
**Change:** Review must verify at default state — default zoom, default view, no special setup required. The `zoom < 2` bug happened because nobody checked at zoom 1.0.

### 5. DOD Quality Gate in Project Brainstorm
**File:** `docs/reference/rules/scope-and-dod.md`
**Change:** Add user-centric DOD rules: UI/visual DOD must describe what user sees, not implementation. Include default-state criterion for visual work.

## Key Brainstorm Decisions
- **No self-verification step** — dropped as process overhead; builder already has DOD
- **User story DOD format for UI work only** — non-UI tasks keep technical DOD
- **No requirements_map schema** — COO clarification behavior handles this organically
- **Context trim is separate directive** — independent concern, don't bundle
- **Fix existing prompts, don't add new process** — the pipeline structure is sound, the prompts are wrong
