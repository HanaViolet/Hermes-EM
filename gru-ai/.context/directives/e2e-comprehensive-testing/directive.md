# Comprehensive E2E Testing of gru-ai v0.2.0

## CEO Brief

Test whether gru-ai works end-to-end when installed fresh by a consumer. This is the real benchmark — not unit tests, not validation scripts. Actual installation, initialization, server startup, directive execution, and UI verification.

## Test Dimensions

### 1. Fresh Install & Init (3 presets)
- Install `gru-ai@0.2.0` from npm in 3 clean directories
- Run `npx gru-ai init` with starter/standard/full presets
- Verify ALL scaffolded files: `.gruai/`, `.context/`, `.claude/`, `CLAUDE.md`, `gruai.config.json`
- Validate agent-registry.json schema (correct agent count, roles, titles, agentFile references)
- Cross-check: every agentFile in registry exists in `.claude/agents/`
- Verify welcome directive scaffolded correctly

### 2. Server Startup & Dashboard
- Run `npx gru-ai start` from each preset directory
- Verify HTTP server responds on configured port
- Verify WebSocket connection establishes
- Verify dashboard HTML/JS/CSS assets serve correctly
- Check server logs for errors

### 3. Directive Execution (Real Bug-Fix Benchmark)
- Copy the benchmark fixture app (tests/fixture/) into the standard-preset test directory
- The fixture has 5 intentional bugs across an Express+React app
- Each bug has a directive with expected-outcomes.json
- Spawn agents to fix ALL 5 bugs using the gruai agent system
- Validate fixes with validate.sh (24 pattern-match assertions)
- Measure: time-to-fix per bug, success rate, agent accuracy

### 4. Directive Structure Validation
- After agents fix bugs, verify directive.json schemas:
  - Required fields: id, title, weight, status, pipeline
  - Pipeline steps have correct structure (status, agent, output, artifacts)
  - Timestamps are valid ISO format
- Verify project.json schemas if created:
  - Required: agent[], reviewers[], tasks[]
  - Tasks have: id, title, status, scope, dod[{criterion, met}]

### 5. Chrome MCP UI Verification
- Navigate to running dashboard in Chrome
- Verify: dashboard loads, navigation works
- Check agents panel: shows correct agent count and names
- Check directives panel: shows active/completed directives
- Check game view: renders without errors (if assets available)
- Take screenshots as evidence

### 6. Multi-Platform Init
- Test `--platform aider` — verify `.aider/` directory created instead of `.claude/`
- Test `--platform gemini-cli` — verify `.gemini/` directory
- Test `--platform codex` — verify `.codex/` directory
- Test `--platform other` — verify only `.gruai/` (no platform-specific dir)
- Each platform: verify agent files placed in correct directory

### 7. Benchmarks
- Installation time (npm install)
- Init scaffolding time per preset
- Server cold-start time (time to first HTTP response)
- Agent bug-fix time (per directive)
- Total test suite execution time

## Success Criteria
- All 3 presets scaffold correctly with correct file counts
- Server starts and serves dashboard for all presets
- 5/5 benchmark bugs fixed by agents (24/24 validation assertions pass)
- All directive.json schemas valid
- Chrome MCP shows correct UI state
- All 4 platform variants scaffold to correct directories
- All benchmarks captured with timing data

## Output
- Comprehensive JSON results at `/tmp/gruai-e2e-EiuRnZ/results/`
- Screenshots from Chrome MCP
- Final summary report with pass/fail counts and benchmarks
