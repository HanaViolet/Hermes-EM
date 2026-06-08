# Multi-Platform Session Data Format Research Report

## 1. Claude Code (BASELINE)

### Session Format
- **File type**: JSONL (JSON Lines)
- **Schema**: Each line is a `RawEntry` object with fields:
  - `type`: `"user"` | `"assistant"` | `"system"` | `"agent-setting"`
  - `subtype`: optional (e.g., `"agent-setting"` for CLI-spawned sessions)
  - `sessionId`, `agentId`, `agentSetting`: identity fields
  - `timestamp`, `cwd`, `version`, `gitBranch`, `slug`: metadata
  - `message`: `RawMessage` containing `role`, `model`, and `content: RawContentBlock[]`
- **Content blocks**: `RawContentBlock` has `type` (text, tool_use, tool_result), `name` (tool name), `input` (tool args), `content` (result text or nested blocks)

### Discovery Path
- **Location**: `~/.claude/projects/{encoded-path}/*.jsonl`
- **Path encoding**: Filesystem paths encoded by replacing `/` with `-` (e.g., `/Users/yangyang/Repos/agent-conductor` becomes `-Users-yangyang-Repos-agent-conductor`)
- **Decoding**: `decodeProjectDirName()` in `server/config.ts` uses backtracking to try hyphen-to-slash splits and checks `fs.existsSync()` for each candidate
- **Subagents**: Stored under `{project-dir}/{session-uuid}/subagents/agent-{agentId}.jsonl`
- **Nested subagents**: Recursive under `{session-uuid}/{agent-id}/subagents/`
- **Discovery function**: `discoverSessionFiles()` in `server/parsers/session-state.ts` (lines 400-464)
- **Project discovery**: `discoverProjects()` in `server/config.ts` (lines 91-134) scans `~/.claude/projects/` and checks for `.context/` directory

### Metadata Available
- **Agent identity**: Extracted from initial prompt via regex (`"You are {Name} {LastName}, {Role}"`), cross-referenced against `agent-registry.json`
- **Session state**: 3-state machine (`working` | `needs_input` | `done`) derived from JSONL entry types
- **Tool tracking**: `toolUseCount`, `toolResultCount`, `lastToolName`, `lastToolDetail`, `pendingInputTool`
- **Prompts**: `initialPrompt` (from file head), `latestPrompt` (from file tail)
- **Git context**: `gitBranch`, `cwd`, `version`, `slug`
- **Token/model**: `model` field on assistant messages
- **File size**: tracked for incremental reads
- **Timestamps**: `lastActivityAt` from file mtime

### Real-Time Watching
- **Method**: chokidar file watcher on `~/.claude/projects/` with `awaitWriteFinish` (200ms stability threshold)
- **Incremental reads**: `processFileUpdate()` reads only new bytes from `byteOffset` to current file size
- **Bootstrap**: Cold start reads last 64KB (`TAIL_SIZE`) and feeds through state machine
- **Active window**: Sessions considered active if mtime within 300 seconds (`ACTIVE_WINDOW_MS`)
- **Implementation**: `SessionWatcher` in `server/watchers/session-watcher.ts`, state machine in `server/parsers/session-state.ts`

### Config Injection
- **Project-level**: `CLAUDE.md` in project root (loaded automatically)
- **User-level**: `~/.claude/CLAUDE.md`
- **Agent definitions**: `.claude/agents/*.md` files define agent personalities with frontmatter

### CLI/API Spawn
- **CLI spawn**: `claude -p "prompt"` for non-interactive, `claude --agent "agent-name"` for agent definitions
- **Programmatic**: Can be spawned via `child_process.exec()` or shell scripts
- **Background**: `run_in_background: true` in Agent tool, or `claude -p` from CLI
- **Session output**: First JSONL line for CLI-spawned sessions: `{"type":"agent-setting","agentSetting":"{name}"}`

### MCP Support
- Yes, full MCP client support. MCP servers configured in `.claude/settings.json` or project-level config.

### Code References
| Component | File | Lines |
|-----------|------|-------|
| State machine | `server/parsers/session-state.ts` | 831 lines total |
| Session scanner | `server/parsers/session-scanner.ts` | 411 lines total |
| Config/discovery | `server/config.ts` | 238 lines total |
| Types | `server/types.ts` | Session, SessionActivity, DashboardState |
| Watcher | `server/watchers/claude-watcher.ts` | chokidar-based |

---

## 2. OpenAI Codex CLI

### Session Format
- **File type**: JSONL (JSON Lines) -- same as Claude Code
- **Schema**: Rollout files contain `RolloutLine` entries, which wrap `RolloutItem` variants:
  - `SessionMeta`: Contains `SessionMetaLine` with session ID, model, source, cwd, git info, agent nickname/role, CLI version
  - `ResponseItem`: Model response items (tool calls, text output)
  - `Compacted`: Context compaction events
  - `TurnContext`: Per-turn context snapshots
  - `EventMsg`: Rich typed events (70+ event types)
- **Event types** (from `EventMsg` union type): `task_started`, `task_complete`, `agent_message`, `user_message`, `exec_command_begin/end`, `exec_approval_request`, `mcp_tool_call_begin/end`, `token_count`, `session_configured`, `thread_rolled_back`, `plan_update`, and many more
- **Filename format**: `rollout-{ISO-timestamp}-{UUID}.jsonl` (e.g., `rollout-2025-05-07T17-24-21-5973b6c0-94b8-487b-a530-2aeb6098ae0e.jsonl`)

### Discovery Path
- **Location**: `~/.codex/sessions/` (active sessions), `~/.codex/archived_sessions/` (archived)
- **Layout**: Nested by date under `sessions/` directory, or flat depending on `ThreadListLayout`
- **Thread listing**: `get_threads()` function scans rollout files, returns `ThreadItem` with pagination support (`ThreadsPage` with cursor)
- **Session index**: `~/.codex/session_index.jsonl` -- append-only JSONL mapping thread IDs to names
- **History log**: `~/.codex/history.jsonl` -- conversation-level history entries with `{conversation_id, ts, text}`
- **State database**: SQLite via `codex-state` crate -- stores thread metadata, backfill state, extraction outcomes

### Metadata Available
- **Thread metadata** (`ThreadItem`): thread_id, first_user_message, cwd, git_branch, git_sha, git_origin_url, source, agent_nickname, agent_role, model_provider, cli_version, created_at, updated_at
- **Session configuration** (`SessionConfiguredEvent`): session_id, forked_from_id, thread_name, model, model_provider_id, service_tier, approval_policy, sandbox_policy, cwd, reasoning_effort, history_log_id, rollout_path
- **Token tracking**: `TokenCountEvent` provides per-turn token counts
- **Collab agents**: spawn/interaction begin/end events for sub-agents (`CollabAgentSpawnBeginEvent`, etc.)
- **Diff tracking**: `TurnDiffEvent` captures file changes per turn

### Real-Time Watching
- **Feasibility**: HIGH -- rollout files are JSONL appended to continuously, same pattern as Claude Code
- **Method**: File watching on `~/.codex/sessions/` with incremental byte-offset reads would work identically to our current approach
- **App-server protocol**: Codex also has a JSON-RPC based app-server protocol with real-time event streaming between the Rust backend and UI frontends, but this requires being a Codex client

### Config Injection
- **Project-level**: `codex.md` in project root (equivalent to CLAUDE.md) -- recently renamed from `AGENTS.md`
- **User-level**: `~/.codex/instructions.md` for global instructions
- **Config file**: `~/.codex/config.toml` (TOML format, not JSON)
- **Skills**: Codex supports skills (custom prompts) configurable via config

### CLI/API Spawn
- **CLI spawn**: `codex -q "prompt"` for quiet/non-interactive mode
- **Programmatic spawn**: Can be spawned as subprocess
- **Thread management**: `ThreadStartParams`, `ThreadResumeParams`, `ThreadForkParams` for creating/resuming/forking sessions
- **App-server**: JSON-RPC server that frontends (TUI, VS Code extension) connect to -- could potentially be used for programmatic control

### MCP Support
- Yes, full MCP support. MCP servers configured in config.toml. Events include `mcp_startup_update`, `mcp_startup_complete`, `mcp_tool_call_begin`, `mcp_tool_call_end`, `mcp_list_tools_response`.

---

## 3. Aider

### Session Format
- **Chat history**: Markdown file (`.aider.chat.history.md`) -- human-readable, structured with markdown headers
  - Format: `# aider chat started at {timestamp}` followed by alternating `#### {role}` sections
  - User messages and assistant responses in markdown
  - Tool calls/results embedded as code blocks
- **Input history**: Plain text file (`.aider.input.history`) -- prompt_toolkit `FileHistory` format, used for command-line recall
- **LLM history**: Optional log file (path specified via `--llm-history-file`), format: `{ROLE} {ISO-timestamp}\n{content}\n`
- **Analytics log**: JSONL format with events like `{event, properties, user_id, time}` (e.g., `{"event": "launched", "properties": {}, "user_id": "uuid", "time": epoch}`)
- **No structured session state file** -- Aider does not persist a machine-readable session state. It's a REPL that optionally logs to markdown.

### Discovery Path
- **Chat history**: `{git-root}/.aider.chat.history.md` (default, per-repo)
- **Input history**: `{git-root}/.aider.input.history` (default, per-repo)
- **Config**: `{git-root}/.aider.conf.yml` (per-repo), `~/.aider.conf.yml` (global)
- **Model settings**: `{git-root}/.aider.model.settings.yml`
- **Model metadata**: `{git-root}/.aider.model.metadata.json`
- **OAuth keys**: `~/.aider/oauth-keys.env`
- **Installs tracking**: `~/.aider/installs.json`
- **Tags cache**: `{git-root}/.aider.tags.cache.v3/` (tree-sitter tag cache)
- **Discovery method**: Scan for `.aider.chat.history.md` files in known project roots

### Metadata Available
- **LIMITED**: Aider's markdown history contains conversation content but minimal structured metadata
- **No agent identity**: Aider is single-agent (user + LLM)
- **No tool tracking**: Tool calls appear inline in markdown, not as structured data
- **Git integration**: Aider auto-commits with `--auto-commits`, each commit has "aider:" prefix
- **Token/cost**: Tracked per-message in memory, reported to console, not persisted in structured format
- **Analytics events**: `launched`, `message_send_starting`, `message_send_exception`, `exit` with properties
- **File watching**: `aider/watch.py` uses `watchfiles` library to detect AI comments (`# ai ...`) in source files

### Real-Time Watching
- **Feasibility**: LOW-MEDIUM
- **Chat history file**: Can be watched with chokidar, but it's markdown -- parsing requires regex/structured extraction, not JSONL line parsing
- **No state machine**: No equivalent of working/needs_input/done -- would need to infer from file modification patterns and process status
- **Process detection**: Could detect running `aider` processes via `ps` and infer activity from `.aider.chat.history.md` mtime
- **Git commits**: Could watch for aider-authored git commits as a proxy for activity

### Config Injection
- **Convention file**: `.aider.conf.yml` in project root (YAML config)
- **Model settings**: `.aider.model.settings.yml`
- **Repo map**: Aider automatically builds a repo map from tree-sitter tags
- **No agent personality injection**: Aider doesn't have a per-session personality system

### CLI/API Spawn
- **CLI spawn**: `aider --message "prompt" --yes` for non-interactive single-shot execution
- **Batch mode**: `aider --message "prompt"` processes one message and exits
- **Watch mode**: `aider --watch` monitors files for AI comments and processes them
- **No daemon mode**: Aider is a REPL process, not a persistent service

### MCP Support
- No native MCP support. Aider uses its own tool system (edit blocks, shell commands, file operations).

---

## 4. Cursor

### Session Format
- **Proprietary**: Cursor stores session data in its internal databases, not as accessible files
- **Composer history**: Stored in Cursor's internal SQLite/LevelDB databases within the VS Code data directory
- **Location**: `~/Library/Application Support/Cursor/User/` (macOS), with workspace-specific data in `workspaceStorage/`
- **Format**: Not publicly documented -- binary database format (LevelDB or SQLite depending on version)
- **Background Agent**: Cursor's Background Agent (launched ~Feb 2026) runs remotely on Cursor's servers, with results accessible via the Cursor UI and API

### Discovery Path
- **Workspace storage**: `~/Library/Application Support/Cursor/User/workspaceStorage/{hash}/`
- **Global storage**: `~/Library/Application Support/Cursor/User/globalStorage/`
- **Background Agent**: Sessions managed server-side, accessible via Cursor dashboard at `cursor.com`
- **No filesystem-based session files**: Unlike Claude Code and Codex, Cursor does not write human-readable session logs to disk
- **`.cursor/` directory**: Project-level config directory, contains `.cursorrules` and MCP config

### Metadata Available
- **Through UI only**: Session history, token usage, model selection visible in Cursor UI
- **Background Agent API**: Provides task status, PR creation, and completion events
- **No structured export**: No built-in way to export session history as structured data
- **Composer sessions**: Track multi-file edits, model used, token counts -- but locked in proprietary storage

### Real-Time Watching
- **Feasibility**: LOW
- **No file-based sessions**: Cannot watch JSONL/JSON files for changes
- **Background Agent**: Could potentially poll the Background Agent API for task status
- **Process detection**: Could detect running Cursor processes and infer activity from workspace file mtimes
- **Extension API**: Cursor extensions could potentially expose session state, but no public API exists for this

### Config Injection
- **`.cursorrules`**: Project-level rules file (markdown), loaded as system prompt context
- **`.cursor/rules/`**: Directory of rule files for more granular control
- **MCP config**: `.cursor/mcp.json` for MCP server configuration
- **Settings**: `~/.cursor/settings.json` for global settings

### CLI/API Spawn
- **No CLI agent mode**: Cursor is IDE-only, no headless CLI for spawning coding sessions
- **Background Agent**: Can be triggered from the Cursor UI, but no public CLI/API to start a Background Agent session programmatically
- **`cursor` CLI**: Opens files/projects in Cursor IDE, but doesn't run agent sessions

### MCP Support
- Yes, MCP client support added in recent versions. Configured in `.cursor/mcp.json`. Supports stdio and SSE transports.

---

## 5. Windsurf (Codeium)

### Session Format
- **Proprietary**: Windsurf (formerly Codeium's IDE) stores Cascade agent data in internal databases
- **Location**: `~/Library/Application Support/Windsurf/User/` (macOS), similar to VS Code data layout
- **Format**: Not publicly documented -- internal state stored in extension/workspace storage
- **Cascade sessions**: The Cascade agent (Windsurf's multi-step agent) tracks conversation state server-side with local caching

### Discovery Path
- **Workspace storage**: `~/Library/Application Support/Windsurf/User/workspaceStorage/{hash}/`
- **Global storage**: `~/Library/Application Support/Windsurf/User/globalStorage/`
- **No filesystem session logs**: Like Cursor, Windsurf does not expose session data as readable files
- **`.windsurf/` directory**: Project-level config directory

### Metadata Available
- **Through UI only**: Cascade conversation history, model selection, file edits visible in Windsurf UI
- **No structured export**: No API or file-based access to session metadata
- **Cascade flow**: Tracks multi-step reasoning, tool calls, and file changes -- but locked in proprietary format

### Real-Time Watching
- **Feasibility**: VERY LOW
- **No file-based sessions**: Cannot watch for session file changes
- **No public API**: No known API for programmatic access to Cascade state
- **Process detection**: Could detect running Windsurf process, but no way to determine agent state
- **Extension API**: Windsurf's VS Code extension APIs could theoretically expose state, but nothing public exists

### Config Injection
- **`.windsurfrules`**: Project-level rules file (equivalent to `.cursorrules`)
- **Cascade settings**: Configurable through Windsurf IDE settings
- **MCP config**: Windsurf has MCP support, configurable in settings

### CLI/API Spawn
- **No CLI mode**: Windsurf is IDE-only with no headless agent mode
- **No programmatic spawn**: Cannot start Cascade sessions from the command line
- **SWE-1 agent**: Windsurf's cloud agent runs server-side, no public API for programmatic control

### MCP Support
- Yes, MCP client support. Configured through Windsurf settings UI.

---

## 6. Cline / Roo Code

### Session Format (Cline)
- **Task history index**: `~/.cline/data/tasks/taskHistory.json` -- JSON array of `HistoryItem` objects
- **HistoryItem schema**:
  ```typescript
  {
    id: string,           // unique task ID
    ulid?: string,        // ULID for tracking
    ts: number,           // timestamp (epoch ms)
    task: string,         // task description/prompt
    tokensIn: number,
    tokensOut: number,
    cacheWrites?: number,
    cacheReads?: number,
    totalCost: number,
    size?: number,
    shadowGitConfigWorkTree?: string,
    cwdOnTaskInitialization?: string,
    isFavorited?: boolean,
    modelId?: string
  }
  ```
- **Per-task messages**: Stored as `ClineMessage[]` arrays (likely in per-task directories or in globalState)
- **ClineMessage schema**:
  ```typescript
  {
    ts: number,
    type: "ask" | "say",
    ask?: ClineAsk,       // "followup" | "command" | "tool" | "completion_result" | etc.
    say?: ClineSay,       // message category
    text?: string,
    reasoning?: string,
    images?: string[],
    files?: string[],
    partial?: boolean,
    lastCheckpointHash?: string,
    conversationHistoryIndex?: number,
    modelInfo?: ClineMessageModelInfo
  }
  ```
- **Storage backend**: File-backed JSON stores via `ClineFileStorage` (atomic write-then-rename)

### Discovery Path (Cline)
- **Global state**: `~/.cline/data/globalState.json`
- **Secrets**: `~/.cline/data/secrets.json` (mode 0o600)
- **Task history**: `~/.cline/data/tasks/taskHistory.json`
- **Workspace state**: `~/.cline/data/workspaces/{hash}/workspaceState.json`
- **VS Code fallback**: Legacy data in VS Code's `globalStorage/saoudrizwan.claude-dev/` (migrated on startup)

### Session Format (Roo Code)
- **Similar architecture**: Roo Code is a fork of Cline with the same storage patterns
- **CLI storage**: `~/.roo-code/` (CLI mode uses file-backed storage at `apps/cli/src/lib/storage/`)
- **Config dir**: Platform-specific via `config-dir.ts`
- **History**: `apps/cli/src/lib/task-history/index.ts` manages task history
- **State store**: `apps/cli/src/agent/state-store.ts` for agent state management

### Metadata Available
- **Rich task metadata**: Task ID, prompt, token counts (in/out/cache), cost, model, workspace path, timestamps
- **Message-level detail**: Each ClineMessage has type (ask/say), tool/command info, reasoning text, file attachments, checkpoint hashes
- **Workspace context**: `cwdOnTaskInitialization`, `shadowGitConfigWorkTree` for project association
- **No real-time state machine**: Activity state inferred from message stream, not from an explicit state field

### Real-Time Watching
- **Feasibility**: MEDIUM
- **File-backed storage**: `~/.cline/data/` files are JSON, watchable via chokidar
- **Atomic writes**: ClineFileStorage uses write-then-rename, so watchers would see complete state transitions
- **taskHistory.json**: Can be watched for new task entries, but individual task messages may require watching per-task storage
- **Challenge**: JSON format means full re-parse on each change (not append-only like JSONL)

### Config Injection
- **`.clinerules`**: Project-level rules file for Cline
- **`.roo/rules/`**: Roo Code's rules directory with per-mode rule files
- **Hooks**: Both support task lifecycle hooks (TaskStart, TaskResume, TaskCancel) via `.clinerules/hooks/`
- **MCP config**: Both support MCP server configuration

### CLI/API Spawn
- **Cline CLI**: `npx @anthropic-ai/cline` -- runs Cline in terminal mode with React-based TUI
- **Roo Code CLI**: `npx roo-code` -- CLI version with full agent capabilities
- **Programmatic**: Both can be spawned as Node.js subprocesses
- **VS Code extension API**: Both expose extension APIs for programmatic task creation within VS Code

### MCP Support
- Yes, both Cline and Roo Code have full MCP client support. Both can also act as MCP servers. Configured in `.vscode/cline_mcp_settings.json` or equivalent.

---

## Comparison Matrix

| Feature | Claude Code | Codex CLI | Aider | Cursor | Windsurf | Cline/Roo |
|---------|-------------|-----------|-------|--------|----------|-----------|
| **Session file format** | JSONL | JSONL | Markdown + YAML | Proprietary DB | Proprietary DB | JSON |
| **Structured data** | Yes | Yes | No (markdown) | No (locked) | No (locked) | Yes |
| **Discovery path** | `~/.claude/projects/` | `~/.codex/sessions/` | `{repo}/.aider.*` | App Support dir | App Support dir | `~/.cline/data/` |
| **Agent identity** | Yes (prompt regex) | Yes (session meta) | No (single agent) | No (proprietary) | No (proprietary) | Partial (model ID) |
| **State machine** | 3-state | Event-based | None | None exposed | None exposed | Message-based |
| **Tool call tracking** | Per-block | Per-event | Inline markdown | Not exposed | Not exposed | Per-message |
| **Token/cost data** | Model field only | TokenCountEvent | Console only | UI only | UI only | Per-task totals |
| **Git context** | Branch, cwd | Branch, SHA, URL | Auto-commit | Not exposed | Not exposed | Workspace path |
| **Real-time watch** | HIGH (file) | HIGH (file) | LOW (markdown) | LOW (no files) | VERY LOW | MEDIUM (JSON) |
| **Config injection** | CLAUDE.md | codex.md | .aider.conf.yml | .cursorrules | .windsurfrules | .clinerules |
| **CLI spawn** | `claude -p` | `codex -q` | `aider --message` | None | None | `npx cline` |
| **MCP support** | Full | Full | None | Yes | Yes | Full |
| **Subagent tracking** | Yes (nested JSONL) | Yes (collab events) | No | No | No | Partial (subtasks) |
| **Open source** | Partial (protocol) | Yes (Apache-2.0) | Yes (Apache-2.0) | No | No | Yes (Apache-2.0) |
| **Append-only log** | Yes (JSONL) | Yes (JSONL) | Yes (markdown) | N/A | N/A | No (full JSON) |

---

## Adapter Implications

For each of the 12 proposed `PlatformAdapter` methods, analysis of universality:

### 1. `discoverSessionFiles()`
- **Universal**: YES -- every platform has session data somewhere
- **Claude Code**: Scan `~/.claude/projects/{dir}/*.jsonl` + recursive subagent directories
- **Codex CLI**: Scan `~/.codex/sessions/rollout-*.jsonl` (flat or nested by date)
- **Aider**: Scan known project roots for `.aider.chat.history.md`
- **Cursor**: Not feasible (proprietary database)
- **Windsurf**: Not feasible (proprietary database)
- **Cline/Roo**: Read `~/.cline/data/tasks/taskHistory.json` for task index
- **Notes**: Cursor and Windsurf would return empty or require alternative discovery (process detection). The interface is universal but some platforms will have stub implementations.

### 2. `initializeAllFileStates()`
- **Universal**: PARTIALLY -- only meaningful for file-based platforms
- **Claude Code**: Bootstrap state for each JSONL file (full parse for recent, stub for old)
- **Codex CLI**: Same pattern -- JSONL rollout files can be bootstrapped identically
- **Aider**: Could parse markdown history files, but limited structured state
- **Cursor/Windsurf**: No file states to initialize -- would be no-ops
- **Cline/Roo**: Parse taskHistory.json into state objects
- **Notes**: Should be optional in the adapter interface -- platforms without file-based state return empty.

### 3. `processFileUpdate()`
- **Universal**: PARTIALLY -- only for file-watching platforms
- **Claude Code**: Read new bytes from byte offset, feed through state machine
- **Codex CLI**: Identical pattern -- JSONL append-only, read from offset
- **Aider**: Would need markdown diff detection (harder, less reliable)
- **Cursor/Windsurf**: Not applicable
- **Cline/Roo**: Full JSON re-parse on file change (not incremental)
- **Notes**: The incremental byte-offset approach only works for append-only formats (JSONL). JSON and markdown require different strategies.

### 4. `getOrBootstrap()`
- **Universal**: YES (but trivial for some platforms)
- **Pattern**: Get existing state or cold-start initialize -- generic caching pattern
- **Notes**: Universal interface, platform-specific implementation.

### 5. `removeFileState()`
- **Universal**: YES -- cache cleanup is universal
- **Notes**: Simple map deletion, identical across platforms.

### 6. `getAllFileStates()`
- **Universal**: YES -- returns the in-memory state cache
- **Notes**: Simple getter, identical across platforms.

### 7. `toSessionActivity()`
- **Universal**: YES (with different richness)
- **Claude Code**: Rich -- tool name, detail, thinking state, model, active flag
- **Codex CLI**: Rich -- event-based activity with task/turn states
- **Aider**: Limited -- active/inactive based on process status and file mtime
- **Cursor/Windsurf**: Minimal -- process running or not
- **Cline/Roo**: Moderate -- task status, model, cost
- **Notes**: The `SessionActivity` type may need to accommodate varying richness levels. All platforms should return at minimum `{sessionId, lastSeen, active}`.

### 8. `machineStateToLastEntryType()`
- **Claude-Code-specific**: YES (mostly)
- **Claude Code**: Maps 3-state machine (working/needs_input/done) to LastEntryType
- **Codex CLI**: Could map event types (task_started/task_complete/exec_approval_request) to equivalent states
- **Aider**: No state machine -- would always return 'unknown' or infer from process state
- **Cursor/Windsurf**: Not applicable
- **Cline/Roo**: Could map ask/say message types to states
- **Notes**: Should be renamed to something more generic like `getAgentState()` returning a platform-agnostic enum. The current name is implementation-coupled.

### 9. `createSessionWatcher()`
- **Universal**: PARTIALLY
- **Claude Code**: chokidar on project directory, watches for JSONL changes
- **Codex CLI**: chokidar on `~/.codex/sessions/`, identical approach
- **Aider**: watchfiles on repo directories for `.aider.*` files (limited value)
- **Cursor/Windsurf**: No file-based watcher possible -- would need process polling
- **Cline/Roo**: chokidar on `~/.cline/data/` for JSON file changes
- **Notes**: The watcher abstraction should support both file-watching and polling strategies. Return a `Disposable` interface for cleanup.

### 10. `createClaudeWatcher()` (misnamed -- should be `createMetadataWatcher()`)
- **Claude-Code-specific**: YES (current name)
- **Claude Code**: Watches `~/.claude/teams/` and `~/.claude/tasks/` for JSON changes
- **Codex CLI**: Could watch `~/.codex/session_index.jsonl` for metadata updates
- **Aider**: No equivalent metadata files
- **Cursor/Windsurf**: Not applicable
- **Cline/Roo**: Could watch `~/.cline/data/globalState.json`
- **Notes**: Should be renamed to `createMetadataWatcher()`. Most platforms won't have a separate metadata source -- the session watcher covers it.

### 11. `discoverProjects()`
- **Universal**: YES
- **Claude Code**: Scan `~/.claude/projects/`, decode directory names, check for `.context/`
- **Codex CLI**: Scan `~/.codex/sessions/`, extract cwd from session metadata, deduplicate
- **Aider**: Scan for repos with `.aider.*` files (no central registry)
- **Cursor**: Scan `~/Library/Application Support/Cursor/User/workspaceStorage/`
- **Windsurf**: Scan `~/Library/Application Support/Windsurf/User/workspaceStorage/`
- **Cline/Roo**: Read workspace paths from `~/.cline/data/workspaces/`
- **Notes**: Every platform has some notion of "projects" -- the discovery mechanism varies but the interface is universal.

### 12. `loadConfig()`
- **Universal**: YES
- **Claude Code**: `~/.conductor/config.json` (our config) + `~/.claude/` discovery
- **Codex CLI**: `~/.codex/config.toml` (TOML format)
- **Aider**: `~/.aider.conf.yml` + `{repo}/.aider.conf.yml` (YAML)
- **Cursor**: `~/.cursor/settings.json`
- **Windsurf**: Windsurf settings (VS Code format)
- **Cline/Roo**: `~/.cline/data/globalState.json`
- **Notes**: Each platform has its own config format and location. The adapter should normalize to a common `PlatformConfig` type.

### Summary: Method Universality

| Method | Universal | Notes |
|--------|-----------|-------|
| `discoverSessionFiles` | Yes | Cursor/Windsurf return empty |
| `initializeAllFileStates` | Partial | No-op for proprietary platforms |
| `processFileUpdate` | Partial | Only for file-based platforms |
| `getOrBootstrap` | Yes | Generic caching pattern |
| `removeFileState` | Yes | Simple cache cleanup |
| `getAllFileStates` | Yes | Simple getter |
| `toSessionActivity` | Yes | Varying richness |
| `machineStateToLastEntryType` | Rename | Should be `getAgentState()` |
| `createSessionWatcher` | Partial | File-watch or polling |
| `createClaudeWatcher` | Rename | Should be `createMetadataWatcher()` |
| `discoverProjects` | Yes | Different discovery mechanisms |
| `loadConfig` | Yes | Different formats per platform |

### Recommended Adapter Interface Changes

1. **Rename `machineStateToLastEntryType`** to `getAgentState()` returning `'working' | 'needs_input' | 'done' | 'unknown'`
2. **Rename `createClaudeWatcher`** to `createMetadataWatcher()` -- make it optional (returns null for platforms without separate metadata)
3. **Add `getPlatformCapabilities()`** method returning feature flags:
   ```typescript
   {
     supportsFileWatching: boolean;
     supportsIncrementalReads: boolean;
     supportsCLISpawn: boolean;
     supportsMCP: boolean;
     supportsSubagents: boolean;
     supportsTokenTracking: boolean;
   }
   ```
4. **Make `processFileUpdate` optional** -- platforms without file-based state implement a different update mechanism (polling, API, etc.)
5. **Add `spawnSession(prompt, config)` method** -- only implemented by platforms with CLI spawn capability (Claude Code, Codex, Aider, Cline/Roo)

### Platform Priority for Implementation

| Priority | Platform | Rationale |
|----------|----------|-----------|
| P0 | Claude Code | Baseline -- already implemented |
| P1 | Codex CLI | JSONL format nearly identical to Claude Code, highest reuse potential |
| P2 | Cline/Roo Code | JSON-based, file-watchable, open source, good metadata |
| P3 | Aider | Open source, popular, but markdown format requires custom parser |
| P4 | Cursor | Proprietary, limited programmatic access, needs Background Agent API |
| P5 | Windsurf | Most closed, least programmatic access |
