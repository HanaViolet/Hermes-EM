# Brainstorm Synthesis — Remove Goals Layer

## Proposals

### Sarah (CTO)
Three-phase migration: consolidate project location, replace goal_ids with category, update all consumers. Archive 44 historical projects to .context/archive/goals/. GoalWatcher becomes CategoryAggregator. Backlogs move to .context/backlog/{category}.json.

### Morgan (COO)
Two-project execution: (1) schema + pipeline docs migration, (2) code + hooks migration. Leave 44 historical projects in place as read-only archive. Consolidate backlogs into single .context/backlog.json with category field per item. Category is single string, not array.

## Convergence Points
- Don't migrate historical projects — they're completed, no value in moving
- Replace goal_ids/goal_folder with category (single string enum)
- Pipeline docs are highest risk — 12+ files, LLM-interpreted, must update atomically
- GoalWatcher needs replacement or removal
- Backlogs relocate from goals/{goal}/backlog.json to flat location
- validate-project-json.sh must drop goal_id requirement, add category

## Key Disagreement
- Sarah: move historical to .context/archive/goals/
- Morgan: leave in place, just stop reading from them
- **Resolution**: Leave in place (Morgan) — moving creates reference breakage in old reports for zero value

## Resolved Approach
1. Leave goals/ directory as read-only archive (no deletion, no migration)
2. All active project paths: directives/{id}/projects/
3. directive.json: goal_ids → category (single string enum: data-model | workflow-orchestration | ui | game)
4. morgan-plan schema: goal_folder → category
5. Pipeline docs: all goals/{goal}/projects/ → directives/{id}/projects/
6. GoalWatcher: remove or convert to category aggregator from directives
7. Backlogs: consolidate to single flat file or category-keyed files
8. CLAUDE.md, vision.md: update context tree docs
