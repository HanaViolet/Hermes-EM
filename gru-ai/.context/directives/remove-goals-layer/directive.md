# Remove Goals Layer

## CEO Directive

Remove the goals layer entirely from the context tree. Currently we have two parallel hierarchies:
- `goals/*/projects/*/project.json` (old, 44 projects)
- `directives/*/projects/*/project.json` (new, pipeline-driven)

Goals (`data-model`, `workflow-orchestration`, `ui`, `game`) should be replaced by categories on directives. The `goal_ids`/`goalIds` field on directive.json becomes a `category` field (or similar).

## What Must Change

1. **Data model**: Remove goal.json schema. Add `category` to directive.json schema.
2. **CLAUDE.md**: Remove "Four Goals" table, update context tree docs, update "How to Read the Context Tree"
3. **vision.md**: Update references to goals
4. **Pipeline docs**: Any references to `goals/` paths
5. **Old projects under goals/**: Archive or remove (these are historical — active work already goes through directives)
6. **Dashboard/watcher**: If they read goal.json files, update them

## Approach

CEO chose: "Remove goals entirely — everything is a directive, categories replace goals."
