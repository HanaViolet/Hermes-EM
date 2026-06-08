# Agent Streaming UI

**Category**: game

Show real-time agent activity streaming in the game UI, similar to how Claude Code CLI shows tool calls:

```
riley(Riley: strip non-game UI)
  Read(src/router.tsx)
  Read(src/components/layout/AppLayout.tsx)
  Read(src/components/layout/Sidebar.tsx)
```

## Requirements

### 1. Agent Session Streaming Panel
- In the agent detail/session UI, show a live streaming log of what the agent is currently doing
- Display tool calls (Read, Edit, Write, Bash, etc.) with file paths/args as they happen
- Stream updates in real-time, auto-scroll to bottom

### 2. Global Header Ticker
- Rolling status ticker in the top header bar
- Shows what each active agent is doing: "Riley is building... Morgan is planning..."
- Cycles through active agents, concise single-line updates

### 3. Fix Sprite Status Text
- Current status text under agent sprites is bad: font too big, white, not useful
- Replace or improve with better styled, more useful streaming status
- Can show the streaming info next to/near the sprite instead of just under it
- Must be readable and visually integrated with the pixel-art style
