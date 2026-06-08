# Rich Idle Agent Behaviors

## CEO Brief

Agents currently just walk freely around the office with no purpose. Now that we have a richly furnished office (TV, pool table, ping pong, gym equipment, kitchen, arcade machines, bookshelves), agents should interact with the furniture.

## Requirements

1. **Furniture-aware idle activities**: When idle, agents should walk to and interact with specific furniture — watch TV, play pool, use gym equipment, visit the kitchen, read at bookshelves, use arcade machines, sit on sofas
2. **Paired animations**: Two idle agents should be able to play ping pong or pool together — one agent initiates, another joins, they animate together at the furniture location
3. **Location-aware behavior**: Idle activity selection should be based on room zones — agents in the break room gravitate to entertainment, agents near the kitchen go get coffee, etc.
4. **CEO room restriction**: Regular agents should not wander into the CEO's office
5. **Activity animations**: Each activity needs appropriate animation frames (not just standing still) — e.g., watching TV = seated facing TV, playing ping pong = alternating swings

## Success Criteria

- Agents visibly interact with 5+ different furniture types
- At least one paired activity works (two agents at same furniture)
- Agents respect room zone boundaries (no random wandering into CEO room)
- Activities look natural — agents face the right direction, animate appropriately
