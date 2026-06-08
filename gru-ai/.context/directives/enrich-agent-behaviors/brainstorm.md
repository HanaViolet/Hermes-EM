# Agent Behavior Enrichment — Brainstorm Decision

Date: 2026-03-09
Decision: Option A — Furniture-First + Facing Fix
Participants: Sarah Chen (CTO), Marcus Rivera (CPO)

## Context

CEO feedback: idle agents walk randomly instead of using furniture, chatting agents don't face each other, emoji switching is too fast. Behaviors lack common-sense logic.

## Decision

Ship the surgical fix (Option A):
1. Kill random tile walking — change `pickWanderDestination()` from 60/40 furniture/random to 85/15 furniture/social-approach
2. Chat facing — when proximity chat triggers, both agents face each other via `directionBetween()`
3. Slow emoji timing — show 4-6s, hide 10-20s, synchronize pairs
4. Add more interaction points — kitchen chairs, break room TV spots, to support 11 agents

## Non-Negotiables (team consensus)
- Every idle movement targets furniture, another agent, or own desk — zero purposeless movement
- Chatting agents MUST face each other
- Emoji show duration >= 4 seconds
- Working agents (TYPE state) never affected
- Chat emoji pairs loosely synchronized

## Watch-Outs
- With 85% furniture targeting, need enough interaction points to avoid congestion
- Set facing only when both agents are stopped (not mid-walk)
- Social approach targets a tile, not the agent — handles race condition if target moves
- First emoji on proximity should show immediately (0s initial delay), then use longer cycle
