# Pipeline Iteration Model

## CEO Brief

The current directive pipeline is designed for an ideal autonomous flow: CEO gives directive → subagents plan/brainstorm/audit/build/review → done. In practice, this linear model rarely works on the first pass:

1. **First-pass quality gap**: Results don't meet CEO requirements, or features don't work. The pipeline has a 1-cycle code-review fix loop and a completion gate reopen, but no structured iteration model for "this isn't what I wanted."

2. **Mid-flight requirement evolution**: Even when outcomes are good, the CEO often wants to add new requirements based on seeing results. Currently the directive is at `awaiting_completion` — there's no clean workflow for "great, now also do X."

3. **Linear pipeline rigidity**: The pipeline is strictly linear (triage → ... → completion). Real work is iterative — build → feedback → adjust → build again. The pipeline doesn't model this.

## Questions to Research

- How do other AI agent frameworks handle iteration and human-in-the-loop feedback?
- What patterns exist for "inner loops" within pipelines (e.g., build-test-iterate cycles)?
- How do multi-agent systems handle requirement changes mid-execution?
- What's the right balance between autonomy and human checkpoints?

## Scope

- Pipeline architecture docs (.claude/skills/directive/)
- directive.json schema and state machine
- Completion gate, review-gate, execute loop
- No code changes yet — research and design first
