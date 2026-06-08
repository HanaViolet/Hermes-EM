# Multi-Platform Support — Brainstorm Synthesis

## Participants
- Sarah Chen (CTO / Auditor)
- Marcus Rivera (CPO)
- Priya Sharma (CMO)

## Phase 1 Proposals

### Sarah Chen (CTO)
**Approach**: PlatformAdapter interface with three tiers: (1) PlatformAdapter interface normalizing session discovery, activity detection, config injection, and task dispatch with ClaudeCodeAdapter as first implementation; (2) MCP-first integration for platforms that support it — gruAI's MCP server becomes bidirectional (expose tools + consume activity via `activity_report` tool); (3) CLI-spawn adapters for headless platforms. Build order: extract adapter interface → MCP activity channel → CLI-spawn adapters starting with Codex CLI.

**Key Technical Findings**:
- session-state.ts: 400+ lines of Claude Code JSONL parsing (hardest file to generalize)
- foreman.ts spawns via `claude -p --agent` — pipeline docs are LLM-consumed, making platform-conditional logic fragile
- MCP server already exists — natural extension point for passive activity detection across 5+ platforms
- Agent personality injection is fragmented: .claude/agents/*.md vs .cursorrules vs .windsurfrules vs .aider.conf.yml vs config.toml
- Cursor CLI has known stability issues (hanging); Windsurf has no CLI mode
- Cloud platforms (Devin, Copilot Workspace) need polling/webhook instead of filesystem watching
- agent-registry.json is already platform-agnostic

**Tradeoffs**: MCP covers communication but not lifecycle management. Session JSONL format is deeply platform-specific. Cloud platforms break the filesystem-watcher model.

**Confidence**: Medium

### Marcus Rivera (CPO)
**Approach**: 3-tier prioritization: Tier 1 (now) Claude Code + Cursor; Tier 2 (3 months) Aider + Cline; Tier 3 (evaluate) Codex CLI/Windsurf/Devin. Extract PlatformAdapter from ~6 server files. Deep integration with fewer platforms. Game UI stays platform-agnostic, .context/ is universal state.

**Key Product Findings**:
- Claude Code is #1 AI coding tool (March 2026) — multi-platform is strategic insurance, not urgent survival
- Cursor at $2B ARR, 360K+ paying customers — largest commercial base but closed ecosystem
- Need user research before building Cursor adapter — zero data on whether Cursor users want pixel office
- Each platform needs different distribution package and onboarding flow
- Graceful degradation: full animation on Claude Code, simplified status-polling on platforms with less state exposure

**Tradeoffs**: Deep-on-few means smaller initial reach but preserves game simulation quality. Cursor is big market but unstable API.

**Confidence**: Medium

### Priya Sharma (CMO)
**Approach**: Wave-based rollout: Wave 1 Claude Code depth, Wave 2 CLI tools (Aider, Codex CLI), Wave 3 IDE tools (Cursor, Windsurf, Cline). Position as "the AI team you can see". Build SEO content clusters per platform.

**Key Market Findings**:
- BRAND COLLISION: gru.ai is an existing funded AI coding company, #1 on SWE-Bench Verified. Risk of brand confusion, SEO cannibalization, potential trademark disputes.
- COMPETITOR: Pixel Agents (2.8K GitHub stars, Fast Company coverage, VS Code marketplace) — first-mover in "pixel office for AI agents" but Claude Code-only, Windows-only, no autonomous framework
- Community sizes: Claude Code 71.5K stars, Codex CLI 62K stars, Cursor 32K/77K Reddit, Aider 26K stars, Cline 5M installs, Roo Code 1.2M installs
- AI coding tool market at 84% developer adoption, 41% of code AI-generated
- Each distribution channel requires different packaging: npm for CLI, VS Code marketplace for IDE, pip for Python-native tools

**Tradeoffs**: Wave rollout delays Cursor/Windsurf users but prevents shipping broken integrations. Open-source adapters attract contributors but enable competitors.

**Confidence**: Medium

## Phase 2 Rebuttals

### Sarah → Priya
Wave ordering is inverted from technical dependency standpoint. CLI tools are EASIEST adapters (same spawn-and-parse pattern as Claude Code). IDE tools are HARDER (proprietary formats, immature APIs, VS Code extension packaging). Building harder things second and easier things third is wrong order. Marketing waves should follow engineering waves, not lead them.

### Marcus → Priya
No user validation step. Commits to 6+ platform adapters without demand evidence. Should gate each adapter behind actual demand signals (request form, GitHub issues, fork attempts). Deep integration with 1-2 validated platforms beats shallow coverage across 6 unvalidated ones.

### Priya → Marcus
Cursor as Tier 1 contradicts his own risk assessment (Background Agent API is new/sparse). Cursor users already have built-in AI experience — harder sell. CLI tool users (Codex CLI, Aider) have zero visual feedback today and are actively underserved. Multi-agent frameworks should stay on radar, not be excluded outright.

## Convergence Points
1. PlatformAdapter interface extraction comes first — zero behavior change, just abstraction
2. Deep-on-few beats shallow-on-many — game simulation needs rich real-time data
3. Exclude CrewAI/AutoGen/LangGraph from active development (v1)
4. CLI tools are technically easiest adapters (spawn-and-parse pattern)
5. Game UI stays platform-agnostic; .context/ is universal state layer
6. MCP is useful but incomplete — covers communication, not lifecycle/personality/session parsing

## Key Disagreements (Unresolved)
1. Cursor timing: Tier 1 now (Marcus) vs Wave 3 later (Sarah, Priya)
2. Demand validation gates: required before each adapter (Marcus) vs assumed for CLI tools (Sarah, Priya)
3. Marketing timing: follow engineering (Sarah) vs parallel/pre-launch (Priya)

## Critical Intelligence
- gru.ai brand collision must be resolved before multi-platform marketing
- Pixel Agents is a direct competitor with first-mover advantage but narrow scope
- MCP activity_report tool could provide passive detection for 5+ platforms without custom parsing
- Cursor CLI has stability issues; Windsurf has no CLI mode at all
- Claude Code is current market leader — multi-platform is strategic, not survival
