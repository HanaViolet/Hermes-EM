# Design-First Step for UI Tasks

## CEO Brief

For any UI-related task in the pipeline, spawn the designer (Quinn) to produce a design BEFORE the builder starts coding.

### Flow

1. During execution, detect if a task/project is UI-related (browser_test: true, category: game/dashboard, or agent includes frontend)
2. Spawn Quinn (designer) to create the design — visual spec, layout, component structure
3. Show the design to the assigned builder (e.g. Riley for frontend)
4. **Builder agrees** → proceed to build using the design as spec
5. **Builder disagrees** → escalate to CEO with both the design and the builder's objections. CEO decides.

### Why

Builders coding UI without a design spec leads to generic output and endless iteration cycles. The designer should lead visual decisions, not the builder. This also gives the CEO a checkpoint before code is written — cheaper to change a design than refactor code.

### Scope

- Modify `09-execute-projects.md` to add design-first flow for UI tasks
- May need a design output schema (what Quinn produces)
- Builder prompt template should reference the design artifact
- CEO escalation path when builder disagrees
