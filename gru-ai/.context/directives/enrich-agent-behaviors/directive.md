# Enrich Agent Actions & Status

## CEO Brief

Enrich the game's agent behavior system with:

1. **Interaction action mappings with icons** — detailed mapping of what agents are doing (building, reviewing, auditing, planning, brainstorming) → visual icons/indicators in the game UI
2. **Session status mappings with icons** — map session statuses (working, waiting-approval, waiting-input, idle, offline) → distinct visual states with icons
3. **Idle detection with time thresholds** — differentiate between:
   - Recently active (< 10 min since last activity)
   - Idle (10-30 min since last activity)
   - Long idle (> 30 min since last activity)
   Each should have different visual treatment
4. **Wandering behaviors** — agents who are idle should exhibit wandering behavior (walk around the office, visit break room, etc.) instead of sitting motionless at their desk

## Scope

- Game engine: character state, movement, behavior
- Game renderer: status icons, interaction indicators
- GamePage: status derivation, idle time tracking
- All frontend — no backend changes
