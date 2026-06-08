# Todo App — Bug-Fix Benchmark Fixture

This is a simple todo app used as a test fixture for the agent benchmark suite.

## About
A basic todo application with intentional bugs seeded in specific areas.
Each bug is described in a directive under `.context/directives/`.

## Stack
- Vanilla JavaScript frontend
- Simple Node.js server (if applicable)
- CSS for styling

## Instructions for Agents
Fix the bugs described in the directives. Each directive contains:
- A `directive.json` with the bug scope and metadata
- A `directive.md` with the bug description and expected fix

After fixing, the `validate.sh` script can verify correctness by checking
expected file patterns and outcomes defined in `expected-outcomes.json`.
