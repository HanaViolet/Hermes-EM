# Pipeline E2E Test Skill

## Problem

We have no way to verify the pipeline actually works end-to-end. After making pipeline doc changes (like the iteration model rework), we can only do cognitive walkthroughs (agents read docs and imagine what would happen). We need to actually run a real directive through the pipeline and verify each step produces correct output.

## What I Want

A `/smoke-test` skill (or `/e2e-test`) that:

1. Creates a small, real test directive (e.g., "rename a config key", "add a utility function") — something trivial that exercises every pipeline step without risk
2. Runs it through `/directive` with medium weight (auto-approves at most gates, only stops at completion)
3. Monitors `directive.json` for step progression — after each step completes, validates the output fields exist and make sense
4. Reports pass/fail per pipeline step with evidence
5. At completion gate, auto-approves (test mode)

## Key Design Questions

- **CEO interaction simulation**: Medium-weight directives auto-approve at clarification and approve gates. Only completion needs interaction. The test skill could auto-approve completion in test mode.
- **Triggering test**: Optionally test that saying "build me X" without `/directive` correctly triggers the pipeline. This is non-deterministic (LLM routing) so might be separate or optional.
- **Test isolation**: Should run in a worktree or branch so test artifacts don't pollute the repo. Clean up after.
- **Scenarios file**: Move pipeline test scenarios out of `lessons/scenarios.md` into the test skill's own config. Lessons are for knowledge, not test definitions.
- **Heavyweight variant**: Eventually test the full heavyweight path with pre-canned CEO responses at clarification and approve STOP gates.

## Success Looks Like

- I run `/smoke-test` and see a step-by-step report: triage PASS, checkpoint PASS, read PASS, ..., completion PASS
- If a step fails (missing output field, wrong schema, step didn't advance), I see exactly what broke
- After pipeline doc changes, I run this and know in ~5 minutes whether the pipeline still works
- The test is repeatable and deterministic — same result every time on the same pipeline docs

## Failure Looks Like

- The test is another cognitive walkthrough that just reads docs
- The test requires me to babysit each step manually
- The test can't handle STOP gates and just hangs
- Test artifacts leak into the real repo
