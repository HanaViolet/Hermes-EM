# Game-Only UI — Remove All Non-Game Pages

## CEO Brief

The game UI already covers everything the CEO needs. Remove all non-game UI: dashboard pages, sidebar, header, search palette, notifications, scheduler/autopilot. The app becomes game-only, full screen, no chrome.

## What Gets Removed

- Sidebar navigation (src/components/layout/Sidebar.tsx)
- Header bar (src/components/layout/Header.tsx)
- AppLayout wrapper (simplify or remove)
- SearchCommandPalette (Cmd+K)
- Session done notifications (useNotifications hook)
- All dashboard components (src/components/dashboard/*)
- Sessions page (src/components/sessions/*)
- Projects/Directives page (src/components/projects/*)
- Org page (src/components/org/*)
- Prototype page (src/components/prototype/*)
- Scheduler/Autopilot (SchedulerCard — rebuild later)
- All routes except game

## What Stays

- Game page (src/components/game/*) — becomes the entire app
- Game HUD (Team, Tasks, Ops, Log panels)
- Shared components used by game (src/components/shared/ — check which are still needed)
- UI primitives (src/components/ui/*)
- Stores, hooks, and libs that game depends on
