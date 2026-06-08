# Conductor Framework Lessons

> Quick-read index. For depth, read the topic files in `lessons/`.

## Critical Patterns

**Scoping:** With AI agents, do it all in one go. Deferred follow-ups get lost between sessions. If the decision is made, execute the full decision.

**Planning:** Strategic planning (Morgan: WHAT/WHO) is separate from codebase scanning (Auditor: WHERE/HOW). Mixing them blows up tokens. Group initiatives by auditor to save tokens.

**Execution:** "Do everything" means keep going until verified, not stop at the report. Always verify UI with Chrome MCP after building. After building, spawn reviewers to find gaps.

**Context:** CEO session = decisions only. Alex (Chief of Staff) handles orchestration. Chrome MCP only works in main session — visual verification bounces back to CEO.

**Quality:** C-suite challenges catch over-engineering. Lightweight implementations beat full-scope for framework changes. Personality files are behavioral contracts, not knowledge stores.

## Topic Files

- `lessons/orchestration.md` — agent coordination, sequencing, resource management
- `lessons/agent-behavior.md` — agent quirks, corrections, behavioral patterns
- `lessons/review-quality.md` — review effectiveness, common pitfalls
- `lessons/skill-design.md` — directive pipeline design, skill pitfalls
- `lessons/state-management.md` — checkpoints, state files, persistence
- `lessons/scenarios.md` — standing cognitive walkthrough scenarios
