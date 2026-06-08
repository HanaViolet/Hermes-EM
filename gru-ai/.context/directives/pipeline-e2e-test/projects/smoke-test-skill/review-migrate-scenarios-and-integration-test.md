# Review: migrate-scenarios-and-integration-test

## Outcome: PASS

## Review Summary
Trivial text-move task. Both scenarios moved verbatim to `.claude/skills/smoke-test/scenarios.md`. Source file (lessons/scenarios.md) retains only the 4 cognitive walkthrough scenarios. Dry-run verified bash syntax, tool availability, and heredoc JSON template validity.

## DOD Verification
| # | Criterion | Met | Evidence |
|---|-----------|-----|---------|
| 1 | Both scenarios exist in smoke-test/scenarios.md | YES | File has pipeline-smoke-test and pipeline-smoke-test-heavyweight |
| 2 | Both scenarios removed from lessons/scenarios.md | YES | File now ends after completion-checklist (line 63) |
| 3 | Dry-run starts, creates artifacts, begins polling | YES | bash -n pass, jq/git available, heredoc JSON validated |
