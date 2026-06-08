# Audit: Pipeline E2E Test Skill

## Key Findings

### Skill Infrastructure
- 12 skills discovered via `.claude/skills/{name}/SKILL.md` convention
- YAML frontmatter (name, description) + markdown body, $ARGUMENTS for input
- No registry — auto-discovery by convention

### Pipeline State Monitoring
- directive.json has 15 pipeline steps with structured output per step
- 5 validation scripts: validate-gate.sh (artifact chain per step), validate-project-json.sh, validate-reviews.sh, validate-cast.sh, detect-stale-docs.sh
- validate-gate.sh is the key programmatic verifier — checks prerequisite artifacts exist and are structurally valid

### Test Isolation
- Branch-based isolation: `directive/smoke-test-{timestamp}` — simpler than worktree
- Cleanup pattern: trap on EXIT matching existing e2e tests
- Existing e2e tests (dim-pipeline.sh) simulate pipeline by writing JSON state directly — NOT real execution

### Existing Scenarios
- lessons/scenarios.md has 7 scenarios: 5 walkthrough-focused, 2 pipeline-mechanical (pipeline-smoke-test, pipeline-smoke-test-heavyweight)
- Pipeline-mechanical scenarios should move to smoke-test skill; UX-focused ones stay for /walkthrough

### Execution Strategy — Option C Recommended (Hybrid)
- Spawn a REAL /directive session via spawn-agent.ts in tracked mode
- Inject `test_mode: true` into directive.json — completion gate auto-approves
- Poll directive.json every 10s to track step progression
- After completion, run validate-gate.sh per step to verify artifact chain
- Test directive: trivial task like "add a comment to vision.md"
- Medium weight ensures brainstorm skipped, clarification/approve auto-approved
- Only completion needs the test_mode flag (3-line addition to 11-completion-gate.md)

### Active Files
- `.claude/skills/` — skill patterns to follow
- `.claude/hooks/validate-gate.sh` — primary verification tool
- `scripts/spawn-agent.ts` — spawning mechanism
- `.context/lessons/scenarios.md` — scenarios to migrate
- `.claude/skills/directive/docs/pipeline/11-completion-gate.md` — needs test_mode support
