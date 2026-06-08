# Directive: Multi-Platform Support Research & Planning

## CEO Brief

gruAI currently only works with Claude Code as the underlying AI coding agent. We need comprehensive research into supporting multiple platforms so that gruAI can work as a visual office simulation layer on top of ANY AI coding tool.

## Research Scope

### Platforms to Research
- **Claude Code** (current) — CLI-based, session JSONL files, `.claude/` config
- **Cursor** — IDE-based, AI agent mode, composer, .cursorrules
- **Windsurf** — IDE-based, Cascade agent, .windsurfrules
- **Aider** — CLI-based, git-integrated, chat history
- **Cline/Roo Code** — VS Code extension, MCP support
- **OpenAI Codex CLI** — CLI-based, sandboxed execution
- **GitHub Copilot Workspace** — cloud-based, spec-driven
- **Devin** — cloud-based autonomous agent ($500/mo)
- **CrewAI / AutoGen / LangGraph** — multi-agent frameworks
- **Any other emerging platforms** worth considering

### Key Questions to Answer
1. **Session/activity detection**: How does each platform expose what agents are doing? Log files, APIs, WebSocket, file watchers?
2. **Configuration injection**: How do we inject agent personalities, rules, and context into each platform? (.cursorrules, CLAUDE.md, system prompts, etc.)
3. **Task delegation**: How can gruAI dispatch work to each platform? CLI commands, API calls, IDE automation?
4. **State tracking**: How do we track task progress, completions, and failures across platforms?
5. **Abstraction layer design**: What's the right abstraction that captures commonalities without losing platform-specific capabilities?
6. **MCP as unifier**: Can MCP (Model Context Protocol) serve as a universal integration layer? Which platforms support it?
7. **Market analysis**: Which platforms have the largest user bases? Where should we prioritize?

### Deliverable
A comprehensive research report + architectural recommendation for the platform abstraction layer, with a phased rollout plan prioritizing by market impact and integration feasibility.

## Category
game
