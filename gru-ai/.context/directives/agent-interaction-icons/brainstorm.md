# Rich Interaction Icons for Office Game
Date: 2026-03-07
Decision: Option A — Lean Pipeline Types (5 icons)
Participants: Quinn (UX), Sarah (CTO), Marcus (CPO), Morgan (COO)

## Context
Agents only have a generic chat bubble when interacting. The CEO needs context-specific animated icons that reflect what agents are actually doing — brainstorming, reviewing, planning, auditing, building. The office game is the primary CEO interface and icons are the fastest signal for understanding company state at a glance.

## Options Considered
- **Option A: 5 Lean Pipeline Types** — planning, brainstorming, building, reviewing, auditing. One icon per type with 2-4 animation frames. Merges plan + project-brainstorm.
- **Option B: 6 Full Pipeline Verbs** — Adds scoping (blueprint) for project-brainstorm. More pipeline detail but tighter readability at 8x8.
- **Option C: 7 Extended Verbs** — Adds reading (open book) and shipping (package). Most complete but highest readability risk.
- **Cycling icons** — Multiple distinct icons rotating per type (brain -> lightbulb -> chat). Rejected: violates glance test, visual noise.

## Decision
Option A — 5 icons. CEO chose readability and fast shipping over maximum pipeline granularity.

### Interaction Types

| Type | Icon | Color | Pipeline Steps | Frames | Animation |
|------|------|-------|---------------|--------|-----------|
| Planning | Clipboard | Blue | plan, project-brainstorm | 2 | Pencil writing on clipboard |
| Brainstorming | Lightbulb | Amber/Yellow | brainstorm, challenge | 3 | Glow pulse with rays |
| Building | Hammer | Gray | execute | 3-4 | Hammer swing arc with impact spark |
| Reviewing | Magnifying glass | Purple/Indigo | review-gate | 2 | Glass sweeps left-right over doc |
| Auditing | Shield | Orange/Rose | audit | 2-3 | Shield with scanning line |

### Architecture
- Widen `interactionMap` from `Map<number, number>` to `Map<number, {partnerId: number, type: InteractionType}>`
- Define `InteractionType = 'planning' | 'brainstorming' | 'building' | 'reviewing' | 'auditing'` in types.ts
- New `interactionIcons.ts` file using expand() + palette pattern
- GamePage.tsx tags interaction pairs with type from directive state
- Renderer selects sprite set by type, replaces status icon (never stacks)

### Non-Negotiables
- One icon per interaction type — no cycling/randomization
- Distinguishable by shape alone (not just color) for accessibility
- Derived from directive/pipeline state, not session heuristics
- 2-4 animation frames, subtle motion only
- Debounce 10-15s for brief pipeline steps
- Lightbulb in meeting room is the hero visual
- Zoom < 2 fallback uses per-type colored dots

## Next Steps
Create directive for implementation.
