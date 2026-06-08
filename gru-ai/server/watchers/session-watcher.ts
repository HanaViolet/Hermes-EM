import path from 'node:path';
import fs from 'node:fs';
import { watch, type FSWatcher } from 'chokidar';
import type { AggregatorHandle } from '../platform/types.js';
import type { PlatformAdapter } from '../platform/types.js';
import {
  processFileUpdate as processFileUpdateRaw,
  getOrBootstrap as getOrBootstrapRaw,
  removeFileState as removeFileStateRaw,
  toSessionActivity as toSessionActivityRaw,
} from '../parsers/session-state.js';

export class SessionWatcher {
  private watcher: FSWatcher | null = null;
  private aggregator: AggregatorHandle;
  private claudeHome: string;
  private projectFilter?: string;
  private adapter: PlatformAdapter | null;
  private activityTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private sessionRefreshTimer: ReturnType<typeof setTimeout> | null = null;
  private _ready = false;

  constructor(aggregator: AggregatorHandle, claudeHome: string, projectFilter?: string, adapter?: PlatformAdapter) {
    this.aggregator = aggregator;
    this.claudeHome = claudeHome;
    this.projectFilter = projectFilter;
    this.adapter = adapter ?? null;
  }

  start(): void {
    // When a project filter is set, watch only that specific project directory
    const projectsDir = this.projectFilter
      ? path.join(this.claudeHome, 'projects', this.projectFilter)
      : path.join(this.claudeHome, 'projects');

    if (!fs.existsSync(projectsDir)) {
      console.log(`[session-watcher] Projects directory not found: ${projectsDir}, skipping watch`);
      this._ready = true;
      return;
    }

    console.log(`[session-watcher] Watching ${projectsDir}`);

    this.watcher = watch(projectsDir, {
      ignoreInitial: true,
      persistent: true,
    });

    this.watcher.on('all', (event: string, filePath: string) => {
      // Only care about JSONL files
      if (!filePath.endsWith('.jsonl')) return;

      if (event === 'add' || event === 'unlink') {
        // Session file added or deleted — refresh session list (1s debounce)
        if (event === 'unlink') {
          if (this.adapter) {
            this.adapter.removeFileState(filePath);
          } else {
            removeFileStateRaw(filePath);
          }
        }
        this.scheduleSessionRefresh();
      }

      if (event === 'change' || event === 'add') {
        // Activity update (500ms debounce per file)
        this.handleActivityChange(filePath);
      }
    });

    this.watcher.on('ready', () => {
      this._ready = true;
      console.log(`[session-watcher] Ready`);
    });

    this.watcher.on('error', (err: unknown) => {
      console.error(`[session-watcher] Error:`, err);
    });
  }

  get ready(): boolean {
    return this._ready;
  }

  async stop(): Promise<void> {
    for (const timer of this.activityTimers.values()) {
      clearTimeout(timer);
    }
    this.activityTimers.clear();
    if (this.sessionRefreshTimer) {
      clearTimeout(this.sessionRefreshTimer);
      this.sessionRefreshTimer = null;
    }
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
  }

  private scheduleSessionRefresh(): void {
    if (this.sessionRefreshTimer) {
      clearTimeout(this.sessionRefreshTimer);
    }
    this.sessionRefreshTimer = setTimeout(() => {
      this.sessionRefreshTimer = null;
      console.log('[session-watcher] Refreshing sessions (new/deleted file detected)');
      this.aggregator.refreshSessions();
    }, 1000);
  }

  private handleActivityChange(filePath: string): void {
    const existing = this.activityTimers.get(filePath);
    if (existing) {
      clearTimeout(existing);
    }

    this.activityTimers.set(filePath, setTimeout(() => {
      this.activityTimers.delete(filePath);

      // Incremental update: reads only new bytes since last offset
      const state = this.adapter
        ? this.adapter.processFileUpdate(filePath)
        : processFileUpdateRaw(filePath);
      if (state) {
        const activity = this.adapter
          ? this.adapter.toSessionActivity(state)
          : toSessionActivityRaw(state);
        if (activity && activity.active) {
          console.log(`[session-watcher] Activity for session ${activity.sessionId}: ${activity.tool ?? (activity.thinking ? 'thinking' : 'idle')}`);
          this.aggregator.updateSessionFromFileState(filePath, state);
        } else {
          // File changed but activity not active — still update state
          this.aggregator.updateSessionFromFileState(filePath, state);
        }
      } else {
        // No new data or bootstrap failed — try bootstrap for new files
        const bootstrapped = this.adapter
          ? this.adapter.getOrBootstrap(filePath)
          : getOrBootstrapRaw(filePath);
        if (bootstrapped) {
          this.aggregator.updateSessionFromFileState(filePath, bootstrapped);
        }
      }
    }, 500));
  }
}
