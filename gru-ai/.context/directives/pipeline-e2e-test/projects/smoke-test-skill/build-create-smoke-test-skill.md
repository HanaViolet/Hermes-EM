# Build Report: create-smoke-test-skill

## What Was Built

Created the `/smoke-test` skill with two files:

1. **SKILL.md** (`.claude/skills/smoke-test/SKILL.md`) -- Skill definition with YAML frontmatter (`name: smoke-test`), step-by-step instructions for the invoking agent, result presentation format, and failure handling table. Follows the healthcheck SKILL.md pattern.

2. **run-smoke-test.sh** (`.claude/skills/smoke-test/run-smoke-test.sh`) -- Self-contained bash runner that:
   - Creates a test directive (`smoke-test-{timestamp}`) with directive.md and directive.json
   - Sets `test_mode: true` and `weight: "medium"` in directive.json
   - Creates a test branch (`directive/smoke-test-{timestamp}`)
   - Spawns a real `/directive` session via `spawn-agent.ts` in detached mode
   - Polls directive.json every 10 seconds to track pipeline step progression
   - Runs `validate-gate.sh` after each step completes (validates the NEXT step's prerequisites)
   - Enforces a 5-minute overall timeout
   - Prints a formatted pass/fail table with step name, status, gate result, and evidence
   - Cleans up test branch, directive directory, and temp files via EXIT trap
   - Exits 0 on full pass, 1 on any failure

Key design decisions:
- **Bash 3.2 compatible**: No associative arrays (`declare -A`), no `local` outside functions. macOS ships bash 3.2 -- all tracking uses parallel indexed arrays.
- **Detached spawn**: The agent runs independently so the script can poll. PID is captured for cleanup.
- **Gate validation strategy**: After a step completes, validate-gate.sh is called for the NEXT step (which checks the just-completed step's artifacts exist). For the final step (completion), validate the completion gate itself.
- **Three termination conditions**: (1) directive status reaches `completed` or `awaiting_completion`, (2) timeout fires, (3) agent process dies unexpectedly. All three produce a complete results table.

## Proposed Improvements

1. **Completion gate `test_mode` support**: The script sets `test_mode: true` in directive.json, but `11-completion-gate.md` does not yet check for it. This is the next task (`add-test-mode-completion-gate`). Without it, the smoke test will reach `awaiting_completion` and the agent will stop, which the script handles (reports status) but does not auto-complete.

2. **Heavyweight test path**: The SKILL.md mentions a `heavyweight` argument but the bash runner only implements `medium`. A heavyweight test would need CEO interaction simulation at the clarification and approve STOP gates. Could use pre-canned responses injected into the agent prompt.

3. **Parallel run detection**: If two smoke tests run simultaneously, they create separate branches/directories and should not conflict. However, the pre-flight cleanup in `00-delegation-and-triage.md` kills ALL orphaned `claude -p` processes, which could kill an in-progress smoke test's agent. Consider a PID file lock mechanism.

4. **Output log analysis**: The script captures agent output to `/tmp/smoke-test-{timestamp}.log` but does not analyze it. A future enhancement could parse this log for error patterns, token usage, and step timing.

5. **Incremental gate validation**: Currently, gates are only validated when a step transitions to `completed`. Some gate violations might be detectable earlier (e.g., missing artifacts from a prior step that will block a future step). Running all future gates proactively could surface issues faster.

6. **Step timing**: Track when each step starts and completes to report per-step duration. This would help identify slow steps that are candidates for optimization.

7. **Test directive task design**: The current test task ("add a comment to vision.md") is simple but touches a sensitive file. A safer alternative might be creating a new file (e.g., `.context/smoke-test-marker.txt`) that is guaranteed not to conflict with anything.

## User Walkthrough

1. The CEO runs `/smoke-test` (or `/smoke-test medium`).
2. The invoking agent reads SKILL.md and executes `bash .claude/skills/smoke-test/run-smoke-test.sh`.
3. The script creates a test directive with a trivial task and spawns a `/directive` session.
4. Real-time output shows each step as it activates and completes:
   ```
   [0m03s] Creating test directive: smoke-test-1710086400
   [0m05s] On branch directive/smoke-test-1710086400
   [0m08s] Agent spawned (PID: 12345)
   [0m18s] ACTIVE: triage
   [0m28s] COMPLETED: triage | Gate: PASS
   [0m38s] COMPLETED: checkpoint | Gate: PASS
   ...
   ```
5. After the pipeline finishes (or times out), a formatted results table is printed:
   ```
   ============================================================
     SMOKE TEST RESULTS
   ============================================================

   Directive:  smoke-test-1710086400
   Weight:     medium
   Duration:   3m 42s
   Result:     PASS

   #   Step                 Status       Gate     Evidence
   --- -------------------- ------------ -------- ----------------------------------------
   1   triage               completed    PASS     weight=medium
   2   checkpoint           completed    PASS     No prior checkpoint
   ...
   15  completion           completed    PASS     test_mode auto-approved
   ```
6. Cleanup removes the test branch and directive directory automatically.
7. The invoking agent presents this output to the CEO in the format described in SKILL.md.
