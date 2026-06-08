# Agent Benchmark Report

| Field | Value |
|-------|-------|
| Date | 2026-03-08 |
| Generated | 2026-03-08T00:56:40Z |
| gru-ai Version | 0.2.0 |
| Configs Tested | starter, standard, full |

---

## Bug-Fix Benchmark

5 test directives tested across 3 configuration presets.

| Directive | Config | Pass | Fail | Status | Time |
|-----------|--------|------|------|--------|------|
| fix-login-validation | starter | 13 | 0 | PASS | 363ms |
| fix-api-error-handling | starter | 13 | 0 | PASS | 333ms |
| fix-css-overflow | starter | 13 | 0 | PASS | 350ms |
| fix-data-persistence | starter | 13 | 0 | PASS | 350ms |
| fix-race-condition | starter | 13 | 0 | PASS | 362ms |
| fix-login-validation | standard | 13 | 0 | PASS | 436ms |
| fix-api-error-handling | standard | 13 | 0 | PASS | 336ms |
| fix-css-overflow | standard | 13 | 0 | PASS | 336ms |
| fix-data-persistence | standard | 13 | 0 | PASS | 382ms |
| fix-race-condition | standard | 13 | 0 | PASS | 336ms |
| fix-login-validation | full | 13 | 0 | PASS | 363ms |
| fix-api-error-handling | full | 13 | 0 | PASS | 338ms |
| fix-css-overflow | full | 13 | 0 | PASS | 336ms |
| fix-data-persistence | full | 13 | 0 | PASS | 364ms |
| fix-race-condition | full | 13 | 0 | PASS | 333ms |

**Bug-Fix Total:** 195 pass, 0 fail out of 15 runs

---

## Landing Page Benchmark

Directive structure validation for landing page build across configs.

| Config | Pass | Fail | Status | Time |
|--------|------|------|--------|------|
| starter | 15 | 0 | PASS | 287ms |
| standard | 15 | 0 | PASS | 336ms |
| full | 15 | 0 | PASS | 293ms |

**Landing Page Total:** 45 pass, 0 fail out of 3 runs

---

## Improve and Polish Benchmark

Directive structure validation for improve-and-polish workflow across configs.

| Config | Pass | Fail | Status | Time |
|--------|------|------|--------|------|
| starter | 17 | 0 | PASS | 347ms |
| standard | 17 | 0 | PASS | 410ms |
| full | 17 | 0 | PASS | 303ms |

**Improve Total:** 51 pass, 0 fail out of 3 runs

---

## Overall Summary

| Metric | Value |
|--------|-------|
| Total Runs | 21 |
| Total Pass | 291 |
| Total Fail | 0 |
| Status | pass |

---

## File Manifest

Inspectable artifacts produced by this benchmark run:

| File | Description |
|------|-------------|
| `results/agent-benchmark/benchmark-bugfix.json` | Bug-fix benchmark detailed results |
| `results/agent-benchmark/benchmark-improve.json` | Improve benchmark detailed results |
| `results/agent-benchmark/benchmark-landing-page.json` | Landing page benchmark detailed results |
| `results/agent-benchmark/summary.json` | Combined benchmark summary |
| `results/agent-benchmark/artifacts/full-fix-api-error-handling/` | Directive structure for full-fix-api-error-handling |
| `results/agent-benchmark/artifacts/full-fix-css-overflow/` | Directive structure for full-fix-css-overflow |
| `results/agent-benchmark/artifacts/full-fix-data-persistence/` | Directive structure for full-fix-data-persistence |
| `results/agent-benchmark/artifacts/full-fix-login-validation/` | Directive structure for full-fix-login-validation |
| `results/agent-benchmark/artifacts/full-fix-race-condition/` | Directive structure for full-fix-race-condition |
| `results/agent-benchmark/artifacts/improve-full/` | Directive structure for improve-full |
| `results/agent-benchmark/artifacts/improve-standard/` | Directive structure for improve-standard |
| `results/agent-benchmark/artifacts/improve-starter/` | Directive structure for improve-starter |
| `results/agent-benchmark/artifacts/landing-page-full/` | Directive structure for landing-page-full |
| `results/agent-benchmark/artifacts/landing-page-standard/` | Directive structure for landing-page-standard |
| `results/agent-benchmark/artifacts/landing-page-starter/` | Directive structure for landing-page-starter |
| `results/agent-benchmark/artifacts/standard-fix-api-error-handling/` | Directive structure for standard-fix-api-error-handling |
| `results/agent-benchmark/artifacts/standard-fix-css-overflow/` | Directive structure for standard-fix-css-overflow |
| `results/agent-benchmark/artifacts/standard-fix-data-persistence/` | Directive structure for standard-fix-data-persistence |
| `results/agent-benchmark/artifacts/standard-fix-login-validation/` | Directive structure for standard-fix-login-validation |
| `results/agent-benchmark/artifacts/standard-fix-race-condition/` | Directive structure for standard-fix-race-condition |
| `results/agent-benchmark/artifacts/starter-fix-api-error-handling/` | Directive structure for starter-fix-api-error-handling |
| `results/agent-benchmark/artifacts/starter-fix-css-overflow/` | Directive structure for starter-fix-css-overflow |
| `results/agent-benchmark/artifacts/starter-fix-data-persistence/` | Directive structure for starter-fix-data-persistence |
| `results/agent-benchmark/artifacts/starter-fix-login-validation/` | Directive structure for starter-fix-login-validation |
| `results/agent-benchmark/artifacts/starter-fix-race-condition/` | Directive structure for starter-fix-race-condition |
| `specs/landing-page-spec.md` | Landing page requirements spec |
| `specs/improve-spec.md` | Improve and polish requirements spec |

---

_Generated by `generate-report.sh` on 2026-03-08T00:56:40Z_
