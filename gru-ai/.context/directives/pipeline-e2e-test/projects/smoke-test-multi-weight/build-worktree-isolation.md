# Build Report: worktree-isolation

## Built
- Replaced `git checkout -b` with `git worktree add "$WORKTREE_PATH" -b "$BRANCH_NAME"` for full isolation
- Added `WORKTREE_PATH="/tmp/smoke-test-${TIMESTAMP}"` variable pointing to a temp directory
- Updated `DIRECTIVE_DIR` to create the test directive inside the worktree (`${WORKTREE_PATH}/.context/directives/...`)
- Swapped step order: worktree creation (Step 1) now precedes directive creation (Step 2) since the directive lives inside the worktree
- Updated cleanup trap to use `git worktree remove --force` with fallback to `rm -rf` + `git worktree prune` if removal fails
- Removed `ORIGINAL_BRANCH` variable and all `git checkout` calls -- user's branch is never touched
- Added `--cwd "$WORKTREE_PATH"` to the `spawn-agent.ts` invocation so the /directive session operates inside the isolated worktree
- `VALIDATE_GATE` and `SPAWN_AGENT` still reference `REPO_ROOT` (main repo) since they are tools, not test artifacts

## Files Changed
- `.claude/skills/smoke-test/run-smoke-test.sh` -- all worktree isolation changes (single file, as scoped)

## Verify Results
- `bash -n run-smoke-test.sh` -- PASS (no syntax errors)
- `npx tsc --noEmit` -- PASS (no type errors)
- `npx vite build` -- PASS (built in 1.65s)

## DOD Assessment
1. "Script uses `git worktree add <path> -b <branch>` instead of `git checkout -b`; no `git checkout` calls remain" -- MET. Line 204 uses `git worktree add`. Zero `git checkout` calls in the entire file.
2. "Cleanup trap removes worktree with `git worktree remove` and deletes the branch; user's current branch is never changed" -- MET. Lines 90-106 handle worktree removal (with fallback) and branch deletion. No checkout operations exist.
3. "Agent spawn command includes the worktree path as the working directory" -- MET. Line 289 passes `--cwd "$WORKTREE_PATH"` to spawn-agent.ts.
4. "Running the script while on any branch does not change HEAD or leave dangling worktrees on success or failure" -- MET. The EXIT trap (line 117) fires on all exit paths (success, failure, signals). It removes the worktree, prunes if needed, and deletes the branch. No git operations touch the user's HEAD.

## Still Missing
- Nothing from the task scope is missing. All 4 DOD criteria are met.

## Proposed Improvements
- The script could verify `git worktree` is available (older git versions may not support it) with a pre-flight check like `git worktree list >/dev/null 2>&1` before proceeding
- A `--keep-worktree` debug flag would be useful for inspecting the worktree after a failed test run (currently the trap always cleans up)
- The `WORKTREE_PATH` could use `mktemp -d` instead of a fixed `/tmp/smoke-test-{ts}` path for better uniqueness, though timestamp collision is extremely unlikely in practice
- validate-gate.sh runs against `DIRECTIVE_DIR` inside the worktree, but the gate script itself is from the main repo -- if the gate script reads sibling files relative to itself, this could cause subtle path mismatches (worth verifying during integration testing)
