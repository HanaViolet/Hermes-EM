# Technical Audit: E2E Comprehensive Testing

## Key Findings

### Bug Fixes (Project 1)
- **PORT bug**: `server/config.ts` reads from `~/.conductor/config.json`, NEVER reads `process.env.PORT`. One-line fix: check env var first.
- **Config template**: `gruai.config.json.template` missing preset/platform fields. Add template vars + substitution in scaffold.ts.
- **CEO entry**: `registry.agents` includes CEO with `agentFile: null`. This is INTENTIONAL per validate-init.ts. Not a bug — just documentation/display mismatch.

### E2E Orchestrator (Project 2)
- `tests/e2e/` doesn't exist yet — greenfield
- 6 existing validation scripts to reuse patterns from
- Server has `/api/health` endpoint for readiness polling
- Init supports `--name --preset --path --yes` flags for non-interactive mode
- PORT fix is prerequisite for spawning server on custom ports

### Agent Benchmark (Project 3)
- 5 fixture directives: 3 lightweight, 1 medium, 1 heavyweight — good weight coverage
- `validate.sh` is mature (regex patterns, absence checks, PASS/FAIL/SKIP summary)
- Fixture needs CLAUDE.md + .gruai/ scaffolding for agent orientation
- Must git-reset fixture between runs for isolation
- Agent benchmarks are non-deterministic — need multiple runs for reliable metrics
- Start with lightweight directives first

### Chrome MCP Checklist (Project 4)
- 8 panel components + GamePage + CanvasOffice to verify
- Needs panel-specific instructions (how to trigger, what data to expect, what to click)
