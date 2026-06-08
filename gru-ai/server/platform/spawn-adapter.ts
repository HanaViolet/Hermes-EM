/**
 * Spawn adapter interface for agent process lifecycle management.
 *
 * This module defines the contract for spawning and managing agent processes
 * across different platforms. SpawnAdapter is intentionally separate from
 * PlatformAdapter -- monitoring (PlatformAdapter) and execution (SpawnAdapter)
 * are different concerns with different lifecycles.
 *
 * Gate: consumers should check `PlatformCapabilities.supportsCLISpawn` before
 * attempting to use a SpawnAdapter.
 */

// ---------------------------------------------------------------------------
// Spawn mode
// ---------------------------------------------------------------------------

/**
 * How the spawned agent process is managed:
 *
 * - `tracked`  -- the caller retains a handle with a completion promise.
 *                 Used for pipeline steps where the caller awaits results.
 * - `detached` -- the process runs independently and outlives the caller.
 *                 Used for fire-and-forget background agents (e.g. foreman).
 */
export type SpawnMode = 'tracked' | 'detached';

// ---------------------------------------------------------------------------
// Spawn configuration
// ---------------------------------------------------------------------------

/**
 * Configuration for spawning an agent process.
 *
 * All fields that are platform-specific (model names, permission flags) are
 * optional so that the interface works across heterogeneous platforms.
 */
export interface SpawnConfig {
  /**
   * The prompt / instruction to send to the agent.
   * This is the primary payload -- always required.
   */
  prompt: string;

  /**
   * Working directory for the spawned process.
   */
  cwd: string;

  /**
   * Agent definition ID (maps to `.claude/agents/{agentId}.md` in Claude Code).
   * When omitted, the platform spawns with its default agent configuration.
   * Foreman spawns typically omit this.
   */
  agentId?: string;

  /**
   * Model override (e.g. `"claude-sonnet-4-20250514"`).
   * When omitted, the platform uses its default model.
   */
  model?: string;

  /**
   * Skip interactive permission prompts. Maps to `--dangerously-skip-permissions`
   * in Claude Code. Platforms that don't support this flag ignore it.
   */
  skipPermissions?: boolean;

  /**
   * Whether to persist the session for later resumption.
   * When true, the platform writes session logs that can be reattached.
   * When false or omitted, the session is ephemeral.
   */
  sessionPersistence?: boolean;

  /**
   * Path to write structured output (e.g. `--output-format json`).
   * When omitted, output is not captured to a file.
   */
  outputPath?: string;

  /**
   * Additional environment variables to inject into the spawned process.
   * Merged with the current process environment; these values take precedence.
   */
  env?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Spawn handle
// ---------------------------------------------------------------------------

/**
 * Handle returned after spawning an agent process.
 *
 * For `tracked` mode, `promise` resolves with the exit code when the process
 * completes. For `detached` mode, `promise` is absent -- the process is
 * fire-and-forget.
 */
export interface SpawnHandle {
  /** OS process ID of the spawned agent. */
  pid: number;

  /**
   * Resolves with the process exit code.
   * Present only when `SpawnMode` is `'tracked'`.
   */
  promise?: Promise<number>;
}

// ---------------------------------------------------------------------------
// SpawnAdapter interface
// ---------------------------------------------------------------------------

/**
 * Interface for spawning and managing agent processes.
 *
 * Each platform provides its own implementation. Claude Code uses
 * `claude -p` / `claude --agent` CLI commands; other platforms may use
 * different mechanisms (HTTP APIs, SDK calls, etc.).
 *
 * This is intentionally separate from {@link PlatformAdapter} -- monitoring
 * sessions and spawning new ones are orthogonal concerns that change for
 * different reasons.
 */
export interface SpawnAdapter {
  /**
   * Spawn a new agent process with the given configuration and mode.
   *
   * @param config - What to spawn (prompt, agent, working directory, etc.)
   * @param mode   - How to manage the process lifetime (`tracked` or `detached`)
   * @returns A handle with the process PID and optional completion promise.
   */
  spawnAgent(config: SpawnConfig, mode: SpawnMode): SpawnHandle;

  /**
   * Kill a previously spawned agent process.
   *
   * Sends SIGTERM (or platform equivalent) to the process. Callers should
   * treat errors (e.g. process already exited) as non-fatal.
   *
   * @param pid - The OS process ID returned in {@link SpawnHandle}.
   */
  killAgent(pid: number): void;
}
