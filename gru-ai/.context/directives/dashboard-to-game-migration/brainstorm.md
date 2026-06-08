# Brainstorm Synthesis: Dashboard-to-Game Migration

## Proposals

### Sarah (CTO/Auditor)
**Three-phase migration with fullscreen panel mode.**
1. Port 6 missing dashboard widgets into existing game panels (CeoBrief, SchedulerCard, OrientationBanner, AttentionRequired, StatsBar, WorkSummary)
2. Add a "fullscreen panel" mode to SidePanel that expands over the canvas — required because Sessions kanban (1,166 lines), Directives list (1,240 lines), and Org chart (855 lines) cannot fit in a 384px side panel
3. Delete dashboard, sidebar, and all old routes/pages

**Confidence:** Medium. Feasibility flags: SidePanel already has two variants (side/bottom), FURNITURE_TAB_MAP is extensible, ActionPanel may overlap with ProjectsPage, SearchCommandPalette becomes primary navigation.

### Marcus (CPO)
**Three incremental deliverables with compressed views.**
1. Add a "Brief" HUD tab (5th tab) absorbing CeoBrief + SchedulerCard
2. Enrich existing Tasks and Team tabs to absorb full-page equivalents — compress Sessions kanban into grouped status lists, Directives into priority-sorted summaries, Org into Team tab drill-downs
3. Remove sidebar nav and /overview route

**Confidence:** High. Key insight: game context changes what information density the CEO needs — glanceable status, not full administrative views.

## Deliberation: Key Disagreements

### The Central Tension: Fullscreen Panel vs Compressed Views

**Sarah's critique of Marcus:** Cramming kanban (5 columns), directives list, and org chart into a 384px panel loses the visualization that makes these useful. "Just make them smaller" is not an answer — it deletes functionality rather than migrating it.

**Marcus's counter:** A fullscreen panel that hides the canvas and shows a full-page view is just "a modal page viewer" — it's redirection with extra steps, not consolidation. The CEO doesn't need 1,240 lines of directive list in a pixel-art office. Compressed summaries serve the actual use case (quick status checks while watching agents work) better than full-page ports.

### Which Critique Landed?

**Marcus's critique landed harder.** His core insight is correct: a fullscreen panel mode that replaces the canvas IS just the old dashboard in a popup — it violates the spirit of "game IS the interface." However, Sarah's concern about information loss is also valid — some views genuinely need more than 384px.

### Convergence Points

Both proposals agree on:
- **Phase 1 is identical**: Port small dashboard widgets into game panels (CeoBrief, SchedulerCard, etc.)
- **Don't embed old page components directly** — restyle everything in parchment theme
- **OrientationBanner becomes a one-time overlay/toast**
- **Delete dashboard and old routes as the final step**
- **SearchCommandPalette is the fallback navigation mechanism**

## Synthesized Recommendation

**Hybrid approach: Marcus's compression philosophy + Sarah's escape hatch.**

1. **Phase 1 (Quick wins):** Port dashboard widgets into game panels. New BriefPanel for CeoBrief+SchedulerCard. Merge AttentionRequired into TeamPanel. Fold stats into StatsOverlay/OpsPanel.

2. **Phase 2 (Compress + redesign):** Redesign Sessions, Directives, and Org as game-native panels designed for the SidePanel width. These are NOT ports — they're new compressed views designed for glanceable status. Sessions becomes status-grouped list with expand/collapse. Directives becomes priority-sorted summary with pipeline indicators. Org becomes enhanced Team tab with role drill-down.

3. **Phase 3 (Cleanup):** Remove dashboard, sidebar, old routes. Game is the sole interface.

**For the escape hatch:** If the CEO finds compressed views insufficient, add a "pop out" button that opens a full-width overlay (not a route — stays in the game context). But don't pre-build this — ship compressed first and see if it's enough.

## CEO Clarification Questions

1. **Information density vs game immersion:** Are you okay with Sessions/Directives/Org being compressed summaries (top items + counts + expand) rather than full-page views? Marcus argues you want glanceable status while watching agents, not spreadsheets. Sarah argues you lose decision-making capability. Which matches how you actually use these views?

2. **Separate pages (Sessions, Directives, Org) — kill or keep as escape hatches?** Option A: Remove entirely, everything lives in game panels. Option B: Keep as hidden routes accessible via SearchCommandPalette (Cmd+K) for when you need the full view. Option C: Build them but only as "pop-out" overlays within the game.

3. **Sidebar navigation — remove entirely or keep a minimal strip?** The sidebar currently provides: Office, Overview, Team, Directives, Sessions links + connection status + search shortcut. The game's HUD buttons + furniture clicks + Cmd+K palette could replace all of this. Do you want the sidebar gone completely, or a thin icon-only strip?
