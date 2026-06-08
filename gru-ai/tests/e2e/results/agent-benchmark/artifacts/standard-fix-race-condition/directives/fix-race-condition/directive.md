# Fix Race Condition in Async Todo Loading

## Scope
Rapidly switching between todo categories causes stale data to display because previous fetch responses arrive after newer ones. Add request cancellation or sequence checking to prevent stale renders.

## Context
This directive was created by the agent benchmark suite for testing purposes.
