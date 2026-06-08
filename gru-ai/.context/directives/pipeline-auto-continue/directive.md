# Pipeline Auto-Continue Fix

## Problem
Directive pipeline sessions die at step boundaries (context limits, timeouts) and nothing picks up. Every recent directive completed execute but never reached review-gate/wrapup/completion. Root cause: no explicit step-loop in SKILL.md and no stalled-directive detection in the watcher.

## Requirements
1. Add explicit step-loop to SKILL.md so the LLM reads and executes the next step doc after completing each step
2. Add stalled-directive detection in directive-watcher that flags directives stuck at a step with all project tasks completed
3. Ensure project.json task statuses get persisted back by the execute step

## Context
- SKILL.md says "set current_step to the next step's ID" but has no loop instruction
- 01-checkpoint.md handles resume but only when manually triggered
- directive-watcher.ts reads state but takes no action on stalled directives
- 09-execute-projects.md completes tasks but doesn't reliably persist status back to project.json
