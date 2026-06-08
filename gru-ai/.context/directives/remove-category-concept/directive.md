# Remove Category Concept

## CEO Brief

Remove the hardcoded `category` field from the framework entirely. The enum (`framework | pipeline | dashboard | game`) is specific to this repo and not generic enough for other users of the framework.

## Scope

Clean removal — strip `category` from:
- All `directive.json` files (the field itself)
- Pipeline docs (schemas, templates, pipeline steps that reference category)
- Server code (types, watchers, aggregator filtering)
- Frontend store types
- MCP server tools (status grouping, backlog filtering/adding)
- Hooks (validate-project-json.sh requires category)
- Backlog.json items
- CLAUDE.md (Categories table and references)

## Out of Scope
- `furnitureCatalog.ts` category field — unrelated game furniture categories, stays
- No replacement concept (tags, labels, etc.) — just remove

## Definition of Done
- No references to directive/project category enum remain in framework code
- All `directive.json` files have `category` field removed
- Server compiles without category references
- MCP tools work without category filtering
- Pipeline docs don't mention category enum
- Backlog schema doesn't require category
