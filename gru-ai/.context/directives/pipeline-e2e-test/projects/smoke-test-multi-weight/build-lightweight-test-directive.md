# Build Report: lightweight-test-directive

## Built
- Weight-specific directive.md templates: lightweight creates a marker file (`smoke-test-marker.txt`), medium creates a utility module (`smoke-test-util.ts` with function + config)
- Updated evidence strings to clearly distinguish skipped vs auto-approved steps:
  - Skipped steps (e.g., brainstorm): `"Skipped (lightweight skip set: step not run)"` -- step was never executed
  - Auto-approved steps (e.g., clarification, approve): `"Auto-approved (lightweight weight) -- {output}"` -- step ran but auto-approved
  - Non-weight skips: `"Skipped (pipeline decision)"` -- step skipped for reasons unrelated to weight
- Verified polling logic handles fast lightweight completion without false timeouts (all-step scan per poll, agent death grace period, 300s timeout sufficient)
- Confirmed directive.json template already uses `${WEIGHT}` variable (no hardcoding)
- Confirmed evidence string in `is_weight_skip` handler already uses `${WEIGHT}` (not hardcoded to "medium")

## Files Changed
- `.claude/skills/smoke-test/run-smoke-test.sh` -- weight-specific directive.md heredoc, auto-approve evidence annotations, skipped-step evidence improvements

## Verify Results
- `bash -n run-smoke-test.sh`: PASS (syntax valid)
- `npx tsc --noEmit`: PASS (no type errors)

## DOD Assessment
1. **Lightweight test directive.json template has weight='lightweight' and appropriate initial state** -- MET. Template at line 274-305 uses `"weight": "${WEIGHT}"` which resolves to `lightweight` when passed. Initial state is correct (status: pending, current_step: triage, empty pipeline).
2. **Results table distinguishes 'skipped' steps from 'auto-approved' steps with clear evidence strings** -- MET. Three distinct evidence patterns: skip-set skips mention weight and "step not run", auto-approved steps mention weight and "Auto-approved", other skips say "pipeline decision".
3. **Script handles lightweight pipeline completing faster than medium without false timeout** -- MET. Polling scans all 15 steps per interval (catches multi-step jumps), agent death has 2s grace period, 300s timeout is generous for lightweight runs.
4. **Running `bash run-smoke-test.sh lightweight` produces a valid results table** -- NOT DIRECTLY TESTABLE in build phase (requires live pipeline session with spawn-agent.ts). The script syntax validates, evidence strings are correctly wired, and the directive template is weight-appropriate.

## Still Missing
- Live end-to-end validation (requires spawning a real pipeline agent, which is out of scope for the build phase)
- The evidence truncation at 60 chars (line 520) may clip the auto-approve annotation for steps that have long output summaries -- the key info ("Auto-approved (lightweight weight)") is 35 chars so it fits within the 60-char limit

## Proposed Improvements
- The `TIMEOUT_SECONDS` could be weight-dependent (e.g., 180s for lightweight, 300s for medium) since lightweight pipelines should complete faster -- a shorter timeout would catch stalls sooner
- A `--dry-run` flag could print the generated directive.md and directive.json without spawning an agent, enabling template validation without a live pipeline
- The results table could include a "Type" column distinguishing step categories (skipped / auto-approved / manual / completed) for quicker visual scanning
- If heavyweight tests are added later, the `is_weight_skip` function and auto-approve annotation logic are ready to extend (just add cases)
