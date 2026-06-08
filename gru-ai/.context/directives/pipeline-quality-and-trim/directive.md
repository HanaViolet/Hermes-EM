# Pipeline Quality Gates & Context Trim

## Problem

The game-ui-tmx-update directive (rev 3) exposed critical pipeline failures:
- 7 CEO requirements went in, 0 were visually delivered after hours of work
- COO compressed 7 requirements into 4 tasks, silently dropping seat mapping
- Builder (Riley) never looked at the actual rendered output
- Reviewer (Sarah) did code review, not acceptance review — missed `zoom < 2` hiding all label/icon work
- DOD was code-centric ("uses ctx.fillText") not user-centric ("labels visible at default zoom")
- CEO Chrome MCP review rubber-stamped via JS console checks instead of visual verification

Root cause: pipeline optimizes for code correctness, not requirement fulfillment.

Secondary problem: pipeline context is bloated. Too many lesson files, verbose pipeline docs, templates, schemas — agents drown in context and miss obvious issues. "Too much context = no context."

## Requirements

### R1: Requirement Traceability
Every CEO requirement must be explicitly tracked from directive.md through to task DOD. If a requirement is dropped, it must be flagged — no silent drops. The COO planning step must produce a requirement-to-task mapping.

### R2: User-Centric DOD
DOD must describe what the user sees/experiences, not implementation technique. Bad: "Labels use ctx.fillText". Good: "Name labels visible above every character at default zoom". For game/UI work, DOD must include visual acceptance criteria.

### R3: User-Centric Review (not code review)
Review-gate must verify requirements are met from the user's perspective. For game/UI: visual check. For API: endpoint test. For CLI: run the command. Code quality is secondary to "does it actually work for the user?" Rename/reframe review guidance away from "code review".

### R4: Context Trim
Audit all pipeline docs, lessons, templates, schemas for bloat. Consolidate, shorten, or delete. Target: reduce total pipeline doc word count by 40-50%. Remove redundant examples, verbose rationale sections, historical notes that don't help current execution. Each doc should fit in one screen of context.

### R5: Builder Self-Verification
Before marking a task done, builder must state what they verified and how. For game/UI: "I checked the rendered output at default zoom and saw X". Not just "tsc passes".

## Out of Scope
- Game rendering fixes (separate directive)
- New pipeline steps or tools
- Dashboard changes
