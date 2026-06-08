# Rich Interaction Icons

Replace the generic chat bubble with 5 context-specific animated 8x8 pixel icons for agent interactions, based on the brainstorm decision (Option A: Lean Pipeline Types).

## Interaction Types

| Type | Icon | Color | Pipeline Steps | Frames | Animation |
|------|------|-------|---------------|--------|-----------|
| Planning | Clipboard | Blue | plan, project-brainstorm | 2 | Pencil writing on clipboard |
| Brainstorming | Lightbulb | Amber/Yellow | brainstorm, challenge | 3 | Glow pulse with rays |
| Building | Hammer | Gray | execute | 3-4 | Hammer swing arc with impact spark |
| Reviewing | Magnifying glass | Purple/Indigo | review-gate | 2 | Glass sweeps left-right |
| Auditing | Shield | Orange/Rose | audit | 2-3 | Shield with scanning line |

## Architecture (from brainstorm)

1. **Data pipeline**: Widen `interactionMap` from `Map<number, number>` to `Map<number, {partnerId: number, type: InteractionType}>`. Define `InteractionType = 'planning' | 'brainstorming' | 'building' | 'reviewing' | 'auditing'` in types.ts.
2. **Sprite data**: New `interactionIcons.ts` file using expand() + palette pattern (matching statusIcons.ts). Each type gets its own color palette and 2-4 animation frames.
3. **GamePage.tsx**: Tag interaction pairs with type derived from directive state (currentStepId → InteractionType mapping).
4. **CanvasOffice.tsx**: Propagate type into interactionMap when building from agentInteractions.
5. **Renderer**: `renderChatBubbles` → `renderInteractionIcons`. Select sprite set by type. Zoom < 2 fallback uses per-type colored dots.

## Non-Negotiables (from brainstorm)
- One icon per interaction type — no cycling/randomization
- Distinguishable by shape alone (not just color) for accessibility
- Interaction icon replaces status icon — never stacks
- 2-4 animation frames, subtle motion only
- Debounce 10-15s for brief pipeline steps
- All sprites 8x8 using expand() pattern

## Files to Touch
- `src/components/game/types.ts` — add InteractionType, update interaction pair types
- `src/components/game/sprites/interactionIcons.ts` — NEW: 5 icon sprite sets
- `src/components/game/GamePage.tsx` — tag pairs with InteractionType
- `src/components/game/CanvasOffice.tsx` — propagate type in interactionMap
- `src/components/game/engine/renderer.ts` — renderInteractionIcons with per-type sprite selection
