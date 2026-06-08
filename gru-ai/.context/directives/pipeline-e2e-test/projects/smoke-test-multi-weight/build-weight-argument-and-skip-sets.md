# Build Report: weight-argument-and-skip-sets

## Built
- Script accepts `$1` as weight argument with `medium` as default
- Validation rejects any value other than `lightweight` or `medium` with a clear error message and exit 1
- Replaced `is_medium_skip()` with `is_weight_skip()` that uses a case statement keyed on `$WEIGHT`
- Both lightweight and medium skip sets skip only `brainstorm`; clarification and approve auto-approve (run, not skipped)
- Directive.json template uses `"weight": "${WEIGHT}"` instead of hardcoded `"medium"`
- Results table header shows actual weight via `${WEIGHT}`
- Evidence string for skipped steps says "Skipped for {weight} weight"
- Updated Usage comment in script header to document `[weight]` argument
- SKILL.md passes `$ARGUMENTS` to the script invocation
- SKILL.md documents both `lightweight` and `medium` weight classes
- Removed heavyweight option from SKILL.md (deferred per scope)

## Files Changed

### Script
- `.claude/skills/smoke-test/run-smoke-test.sh` -- weight argument parsing, skip function refactor, directive.json template, results header, usage comment

### Skill documentation
- `.claude/skills/smoke-test/SKILL.md` -- arguments section, script invocation, results summary format

## Verify Results
- `bash -n run-smoke-test.sh` -- PASS (syntax valid)
- `npx tsc --noEmit` -- PASS (no type errors)
- `npx vite build` -- PASS (1.62s, all modules transformed)
- Manual functional test of weight validation -- PASS (default=medium, lightweight accepted, medium accepted, heavyweight rejected, garbage rejected)

## DOD Checklist
1. Script accepts $1 as weight (lightweight|medium), defaults to medium, rejects invalid values -- MET
2. Skip set: lightweight skips brainstorm, medium skips brainstorm, both auto-approve clarification/approve -- MET
3. Test directive.json weight field uses passed argument -- MET
4. SKILL.md documents both weight classes and passes $ARGUMENTS to script -- MET
5. Results table header shows actual weight class -- MET

## Still Missing
- Nothing from the defined scope. All 5 DOD criteria are met.

## Proposed Improvements
- The `is_weight_skip()` function currently has identical logic for both lightweight and medium. When heavyweight support is added, this will differentiate (heavyweight has no skips). The case-statement structure is ready for that extension.
- Consider adding a `--help` flag that prints usage info, especially as more arguments are added.
- The SKILL.md example results table still shows `weight=medium` in the triage evidence column -- this is fine since it is an example, but could be updated to show a placeholder.
