# Code Review: Agent Streaming UI

## Reviewers
- Marcus (CPO) — independent code review
- Quinn (UX) — independent code review

## Outcome: PASS (with fix applied)

### Marcus Review
- **Outcome**: pass
- **Approach deviation**: none
- **Bugs**: None critical. Noted ref-based buffer has one-frame delay (imperceptible in practice).
- **Reachability**: All 5 artifacts confirmed reachable (ToolCallLog, useAgentTicker, tickerFadeIn, sprite text, ops→status rename)
- **Verdict**: "Code is solid. All three features correctly implemented and reachable."

### Quinn Review
- **Outcome**: pass (2 medium notes)
- **Approach deviation**: none
- **Bug 1 (medium, FIXED)**: Auto-scroll fights user intent — ToolCallLog snapped to bottom unconditionally. Fixed: now tracks user scroll position and only auto-scrolls when user is near bottom.
- **Bug 2 (medium, accepted)**: Ref-based buffer relies on indirect re-renders from sessionActivities store. Works in practice because the same store update triggers both buffer fill and parent re-render.
- **Bug 3 (low)**: Ticker index race — mitigated by nullish coalescing on line 169.
- **Accessibility**: Color contrasts acceptable for game UI context.
- **Layout shift**: None — ticker uses maxWidth+overflow:hidden, animation uses composited properties only.
- **Verdict**: "No critical bugs. Recommend fixing auto-scroll before shipping." (Fixed)

## Fix Applied
- `AgentPanel.tsx` ToolCallLog: Added `userScrolledRef` + `onScroll` handler to only auto-scroll when user is at/near bottom (within 8px threshold).
