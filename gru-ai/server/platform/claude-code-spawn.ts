/**
 * ClaudeCodeSpawnAdapter -- SpawnAdapter implementation for Claude Code CLI.
 *
 * Encapsulates the exact `claude -p` CLI invocation with support for both
 * detached (fire-and-forget) and tracked (await completion) spawn modes.
 *
 * Detached mode replicates the foreman.ts pattern: stdio redirected to a log
 * file, process detached from parent, child.unref() called so the parent can
 * exit independently.
 *
 * Tracked mode wraps the child process in a promise that resolves with the
 * exit code, suitable for pipeline steps that need to await completion.
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';

import type {
  SpawnAdapter,
  SpawnConfig,
  SpawnHandle,
  SpawnMode,
} from './spawn-adapter.js';

// ---------------------------------------------------------------------------
// Default PATH augmentation
// ---------------------------------------------------------------------------

/**
 * Sensible PATH prefix ensuring common binary locations are available.
 * Claude Code CLI (`claude`) is typically installed via npm global or in
 * `~/.local/bin`. Without this, detached processes may fail to find it.
 */
const DEFAULT_PATH_PREFIX = [
  '/usr/local/bin',
  '/usr/bin',
  '/bin',
].join(':');

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export class ClaudeCodeSpawnAdapter implements SpawnAdapter {
  /**
   * Spawn a Claude Code agent process.
   *
   * @param config - What to spawn (prompt, agent, working directory, etc.)
   * @param mode   - `'tracked'` to await completion, `'detached'` for fire-and-forget
   * @returns A handle with the process PID and optional completion promise.
   */
  spawnAgent(config: SpawnConfig, mode: SpawnMode): SpawnHandle {
    const args = this.buildArgs(config);
    const env = this.buildEnv(config);

    if (mode === 'detached') {
      return this.spawnDetached(args, config, env);
    }
    return this.spawnTracked(args, config, env);
  }

  /**
   * Kill a previously spawned agent process.
   *
   * Sends SIGTERM to the process. Errors (e.g. process already exited) are
   * silently ignored -- callers should treat kill failures as non-fatal.
   *
   * @param pid - The OS process ID returned in {@link SpawnHandle}.
   */
  killAgent(pid: number): void {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      // Process already exited or PID invalid -- non-fatal.
    }
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * Build the CLI argument array from a SpawnConfig.
   *
   * Argument order: `-p`, optional `--agent`, optional `--model`,
   * optional `--dangerously-skip-permissions`, optional
   * `--no-session-persistence`, then the prompt as the final positional arg.
   */
  private buildArgs(config: SpawnConfig): string[] {
    const args: string[] = ['-p'];

    if (config.agentId != null) {
      args.push('--agent', config.agentId);
    }

    if (config.model != null) {
      args.push('--model', config.model);
    }

    if (config.skipPermissions) {
      args.push('--dangerously-skip-permissions');
    }

    if (config.sessionPersistence === false) {
      args.push('--no-session-persistence');
    }

    // Prompt is always the final positional argument.
    args.push(config.prompt);

    return args;
  }

  /**
   * Build the environment for the child process.
   *
   * Merges `process.env` with the PATH augmentation and any additional
   * env vars from the SpawnConfig. Config env values take highest precedence.
   */
  private buildEnv(config: SpawnConfig): NodeJS.ProcessEnv {
    const currentPath = process.env['PATH'] ?? '';
    const augmentedPath = `${DEFAULT_PATH_PREFIX}:${currentPath}`;

    return {
      ...process.env,
      PATH: augmentedPath,
      // Allow nested spawns from within a Claude Code session
      CLAUDECODE: undefined,
      ...config.env,
    };
  }

  /**
   * Spawn in detached mode: stdio redirected to `outputPath`, process
   * detached and unref'd so the parent can exit independently.
   */
  private spawnDetached(
    args: string[],
    config: SpawnConfig,
    env: NodeJS.ProcessEnv,
  ): SpawnHandle {
    // Open output file for stdio redirection. If no outputPath is provided,
    // discard all output (same as /dev/null).
    const stdio: [
      'ignore',
      number | 'ignore',
      number | 'ignore',
    ] = config.outputPath
      ? (() => {
          const fd = fs.openSync(config.outputPath, 'w');
          return ['ignore', fd, fd] as ['ignore', number, number];
        })()
      : ['ignore', 'ignore', 'ignore'];

    const child = spawn('claude', args, {
      cwd: config.cwd,
      stdio,
      detached: true,
      env,
    });

    child.unref();

    return { pid: child.pid! };
  }

  /**
   * Spawn in tracked mode: returns a promise that resolves with the exit
   * code when the process completes. If `outputPath` is set, stdio is
   * also redirected to that file.
   */
  private spawnTracked(
    args: string[],
    config: SpawnConfig,
    env: NodeJS.ProcessEnv,
  ): SpawnHandle {
    let outFd: number | undefined;

    const stdio: [
      'ignore',
      number | 'ignore',
      number | 'ignore',
    ] = config.outputPath
      ? (() => {
          outFd = fs.openSync(config.outputPath, 'w');
          return ['ignore', outFd, outFd] as ['ignore', number, number];
        })()
      : ['ignore', 'ignore', 'ignore'];

    const child = spawn('claude', args, {
      cwd: config.cwd,
      stdio,
      env,
    });

    const promise = new Promise<number>((resolve, reject) => {
      child.on('close', (code) => {
        // Close the output file descriptor if we opened one.
        if (outFd != null) {
          try {
            fs.closeSync(outFd);
          } catch {
            // Non-fatal -- fd may already be closed.
          }
        }
        resolve(code ?? 1);
      });

      child.on('error', (err) => {
        if (outFd != null) {
          try {
            fs.closeSync(outFd);
          } catch {
            // Non-fatal.
          }
        }
        reject(err);
      });
    });

    return { pid: child.pid!, promise };
  }
}
