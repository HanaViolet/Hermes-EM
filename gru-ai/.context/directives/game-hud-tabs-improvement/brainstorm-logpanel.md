# LogPanel Improvement — Brainstorm Synthesis

## Proposals

### Marcus (CPO — Product/UX)
**Approach:** Restructure LogPanel from a flat chronological list into a layered activity feed with 3 source categories: (1) Real-time agent activity via sessionActivities — what each agent is DOING (editing file X, running bash Y, thinking). Biggest gap. (2) Multi-directive awareness via activeDirectives[] and directiveHistory[]. (3) Source-type filter tabs (Agent Activity / Directives / System) alongside the existing priority filter. Enrich session events with model name, git branch, subagent data.

**Key insight:** Do NOT add workState/backlog/feature data — that's inventory data, not activity events. OpsPanel and BookshelfPanel already serve that. LogPanel's job is *narrative*: what happened, when, by whom.

**Tradeoffs:** High volume from activity events needs deduplication. Source-type filter tabs add UI complexity. Ephemeral "what agent is doing now" may not age well in historical log — consider a "live ticker" section vs mixing into the feed.

### Sarah (CTO — Architecture)
**Approach:** Add 4 new event builder functions reading existing Zustand store data — no server changes needed. (1) buildActivityEvents: sessionActivities diffs to show tool switches. (2) buildSubagentEvents: session subagent spawning/completion. (3) buildMultiDirectiveEvents: activeDirectives[] + directiveHistory[]. (4) buildWorkStateEvents: P0 backlogs + directive weight/category context.

**Key insight:** sessionActivities is a snapshot, not a time-series log. Need useRef diffing to accumulate events from snapshot changes. ~20 lines of logic.

**Feasibility flags:**
- activeDirectives[] and directiveHistory[] already populated in store via WebSocket — zero server work
- FeedEvent.source is a union type — extending is type-safe one-file change
- workState may be null until first state_updated message
- All styling constants already imported

## Convergence

Both proposals agree on:
1. **Agent activity events are the #1 gap** — CEO can see agents are "working" but not WHAT they're working on
2. **Multi-directive awareness** — currently only shows one directive
3. **No server-side changes needed** — all data already flows to the client
4. **Need deduplication/throttling** for activity events to prevent noise
5. **Filter mechanism needed** to let CEO choose what to see

## Key Disagreement

- **Marcus says NO to workState data** (backlogs/features) — it's inventory, not activity, and belongs in other panels
- **Sarah says YES to limited workState** (P0 backlogs only, as event context) — enriches directive events with weight/category

**Resolution:** Marcus is right that the LogPanel shouldn't become a dashboard-within-a-dashboard. But Sarah's point about enriching directive events with weight/category context (not showing full backlog lists) is complementary. Include directive metadata enrichment, exclude backlog/feature items as standalone events.

## Final Synthesis

**Must-have (P0):**
1. Agent activity events from sessionActivities (with snapshot diffing + dedup)
2. Multi-directive events from activeDirectives[] + directiveHistory[]
3. Subagent lifecycle events (spawn/complete/error)
4. Enriched session events with model, gitBranch, subagent names
5. Filter upgrade: Important / Activity / All (or similar)

**Nice-to-have (P1):**
6. Live ticker section at top for real-time agent activity (vs mixing into historical feed)
7. Directive metadata enrichment (weight/category context on directive events)
