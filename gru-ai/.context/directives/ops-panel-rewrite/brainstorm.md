# OpsPanel Rewrite — Brainstorm Synthesis

## Proposals

### Marcus (CPO — Product/UX)
**Name:** "Status" — directly answers "what is the state of the system right now?"
**Approach:** 3 sections: (1) System Pulse KPI grid (connection, sessions, directives, backlog depth), (2) Directive Velocity (last 5 completed + 7d throughput), (3) Session Breakdown (stacked bar of status distribution). Drop all category/feature/backlog-card code.
**Avoid:** Don't make this a second Tasks panel with per-project progress bars.
**Confidence:** High

### Sarah (CTO — Architecture)
**Name:** "Status" (same)
**Approach:** 3 sections: (1) System Vitals strip (connection, sessions, directives, projects), (2) Directive Health (active directives with pipeline progress from activeDirectives[]), (3) Category Breakdown (aggregate by category field).
**Critical findings:**
- `workState.backlogs.items` is ALWAYS EMPTY — state-watcher.ts initializes `allBacklog=[]` but never pushes to it
- `workState.features.features` are actually project.json records mapped to FeatureRecord — misleading naming
- `activeDirectives[]` already has pipeline steps, projects with task counts, weight, category — everything needed
**Avoid:** Don't build on the half-dead features/backlogs data model. Kill the indirection, read from activeDirectives directly.
**Confidence:** High

## Convergence
Both agree on:
1. Rename to "Status"
2. Kill all categories/features/backlogs code (confirmed dead by Sarah's audit)
3. Use sessions + activeDirectives + directiveHistory as primary data sources
4. System vitals KPI strip as section 1

## Key Difference
- Marcus emphasizes **velocity** (completed directives, throughput)
- Sarah emphasizes **current state** (active directives with pipeline progress)
- Resolution: include BOTH — active directives for current state, velocity for trend

## Final Synthesis
4 sections in priority order:
1. **System Vitals** — KPI strip: connection dot, active sessions, active directives, in-flight projects
2. **Active Directives** — each directive with pipeline step, weight badge, project count/progress
3. **Velocity** — last 5 completed directives + 7d throughput
4. **Session Health** — horizontal stacked bar showing status distribution (working/idle/error/waiting)

Tab rename: "Ops" → "Status" (touches SidePanel.tsx HudTab type, TAB_LIST, TAB_ICONS, HUD_TYPES, useBadgeCounts)
