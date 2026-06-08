# Brainstorm Synthesis: E2E Comprehensive Testing

## Phase 1 Proposals

### Sarah Chen (CTO)
- 7 independent shell scripts (tests/e2e/01-install.sh through 07-benchmarks.sh)
- Each phase runs standalone or composed by orchestrator
- Chrome MCP stays manual (honest about platform constraint)
- Agent bug-fix phase opt-in via --with-agents flag
- Fix 8 known bugs BEFORE building the suite
- npm pack + npm install for real consumer path testing
- WebSocket via simple node script (ws module)
- Confidence: high

### Marcus Rivera (CPO)
- Single orchestrator (run-e2e.sh) with --dim flag for per-dimension runs
- Chrome MCP as structured manual checklist for CEO
- --skip-agents flag for fast structural-only runs
- Negative test: validate.sh on unmodified fixture should fail (proves assertions discriminate)
- Bash + node scripts only, no test framework
- Simulates real user journey end-to-end
- Confidence: high

### Sam Nakamura (QA/Auditor)
- Single tsx runner (tests/e2e/run.ts) using existing validate-*.ts patterns
- Playwright (pip install + chromium) for Chrome MCP automation
- Dimension 3 as separate benchmark script
- PORT bug flagged as blocker (server/config.ts ignores PORT env var)
- with_server.py doesn't exist (referenced by webapp-testing skill but missing)
- Most detailed codebase-specific feasibility flags
- Confidence: high

## Phase 2 Deliberation

### Sarah → Sam (rebuttal)
Playwright is 400MB chromium for ONE test dimension. Cross-runtime dependency (Python in Node project) will rot. tsx runner that shells out is "a worse shell script." E2E must test published artifact from outside — fundamentally a shell concern. Sam's feasibility flags (PORT bug, missing with_server.py) are useful data but wrong architecture conclusion.

### Marcus → Sam (rebuttal)
Playwright is scope creep. Chrome MCP verification is intentionally manual per directive — the CEO reviews in browser. tsx adds indirection without value over bash calling tsx scripts. PORT bug and missing infra are tasks, not architecture constraints.

### Sam → Sarah (rebuttal)
7 independent scripts is over-engineered for a project with zero test suite. Creates multi-file coordination problem (shared state, exit codes, ordering). E2E needs shared server lifecycle (start once, run multiple dimensions, tear down). Manual Chrome MCP checklist is "documentation, not a test" — dashboard type-drift between server/types.ts and src/stores/types.ts is the #1 regression vector.

## Convergence Points
1. **No test framework** — all 3 reject jest/vitest/mocha. Plain scripts.
2. **Agent bug-fix dimension is opt-in** — expensive, non-deterministic, separate from structural tests.
3. **PORT bug must be fixed** — either before or during execution.
4. **Bash is the right language** for testing CLI tool from consumer perspective (2 out of 3; Sam concedes tsx adds little value for shelling out).
5. **Each dimension independently runnable** — structural agreement, differ on how (7 files vs --dim flag vs single runner).

## Unresolved Disagreements

### 1. Chrome MCP: Manual checklist vs Playwright automation
- Sarah + Marcus: manual by design, CEO reviews in Chrome MCP main session
- Sam: manual is "documentation, not a test" — dashboard regressions need automated browser verification
- **Key tension**: We DO have Chrome MCP in the main session. The CEO CAN do visual verification. But Sam's point about type-drift regressions is valid — manual checklists get stale.

### 2. Test architecture: 7 scripts vs 1 orchestrator vs tsx runner
- Sarah: 7 independent scripts, composable
- Marcus: 1 bash orchestrator with --dim flag
- Sam: 1 tsx runner
- **Key tension**: 7 scripts means no shared state (server lifecycle). 1 script means monolith. Marcus's --dim flag is the middle ground.

### 3. When to fix known bugs: Before vs during
- Sarah: fix BEFORE building the suite (don't test broken behavior)
- Sam: flag as blockers
- Marcus: fix as tasks during execution
- **Key tension**: Building tests against known-broken behavior wastes cycles. But fixing bugs first means the e2e directive scope expands.
