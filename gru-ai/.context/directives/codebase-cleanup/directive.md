# Codebase Cleanup

After 100+ rounds of pivots and iterations, the codebase has accumulated extensive dead code, unused files, stale references, and outdated patterns. This directive performs a complete cleanup.

## Scope

Audit every file and every line of code across the entire codebase:
- **Frontend (src/)**: Unused components, dead imports, stale type definitions, dead routes, unused CSS classes, orphaned hooks
- **Server (server/)**: Removed watchers, dead parsers, unused types, stale aggregator logic
- **Game (src/components/game/)**: Leftover code from old iterations, unused sprites/constants/types
- **Scripts (scripts/)**: Dead scripts, unused utilities
- **Config**: Stale package.json deps, unused config files, dead public/ assets

## Key Constraint

Don't just check if code is referenced — understand the latest state of the system. With 100+ iterations, code may be imported but functionally dead (e.g., a component that's imported but never rendered, a type that's defined but never instantiated in the current architecture).

## Expected Outcome

A significantly leaner codebase with no dead code, no orphaned files, no stale references. Every remaining file and export should be actively used in the current system state.
