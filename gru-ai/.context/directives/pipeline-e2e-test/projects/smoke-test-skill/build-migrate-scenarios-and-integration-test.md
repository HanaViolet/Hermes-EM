# Build Report: migrate-scenarios-and-integration-test

## Built
- Created `.claude/skills/smoke-test/scenarios.md` with both `pipeline-smoke-test` and `pipeline-smoke-test-heavyweight` scenarios, verbatim from the lessons file
- Removed the two pipeline-mechanical scenarios from `.context/lessons/scenarios.md`, leaving the 4 cognitive walkthrough scenarios intact (directive-intent-extraction, builder-context-completeness, review-fix-cycle, completion-checklist)
- Dry-ran the bash runner (`run-smoke-test.sh`) with three verification passes:
  - `bash -n` syntax check: PASSED
  - Required tools check (jq, git): both available at `/usr/local/bin/`
  - Heredoc JSON template validation: created test directive artifacts, verified `directive.json` is valid JSON with correct fields (`id`, `weight: "medium"`, `test_mode: true`, `current_step: "triage"`), cleaned up successfully

## Files Changed
- **Created**: `.claude/skills/smoke-test/scenarios.md` -- two pipeline-mechanical scenarios moved here
- **Modified**: `.context/lessons/scenarios.md` -- removed lines 65-95 (the two scenarios), now ends after `completion-checklist`

## Verify Results
- `npx tsc --noEmit`: PASS (no output, no errors)
- `npx vite build`: PASS (built in 1.60s, 4 output files)
- `bash -n run-smoke-test.sh`: PASS (syntax valid)
- Heredoc JSON validation: PASS (valid JSON, correct field values)
- Test artifact creation + cleanup: PASS (directory created, files written, directory removed)

## DOD Assessment
| Criterion | Met |
|-----------|-----|
| pipeline-smoke-test and pipeline-smoke-test-heavyweight scenarios exist in .claude/skills/smoke-test/scenarios.md | YES |
| The two scenarios are removed from .context/lessons/scenarios.md | YES |
| Dry-run of run-smoke-test.sh starts successfully, creates test directive artifacts, and begins polling | YES (setup verified; polling requires a live /directive session which cannot be safely spawned in this context) |

## Still Missing
- Full end-to-end execution of the smoke test (requires `scripts/spawn-agent.ts` to spawn a real `/directive` session, which would modify the git working tree and context files)
- The polling loop was not exercised because no agent was spawned; only the setup phase (artifact creation, JSON validation, cleanup trap) was verified

## Proposed Improvements
- The smoke-test scenarios in the new `scenarios.md` could be linked from `SKILL.md` so that anyone reading the skill entry point knows the test scenarios exist
- A `--dry-run` flag for `run-smoke-test.sh` that stops after creating the directive artifacts and validating them (without spawning an agent) would make CI integration easier
- The heavyweight scenario is documented but `run-smoke-test.sh` only supports medium weight; adding a `$1` weight argument (as the script's own comment suggests) would enable heavyweight smoke testing
