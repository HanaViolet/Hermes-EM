/**
 * ClaudeCodeAdapter -- PlatformAdapter implementation for Claude Code.
 *
 * Wraps existing session-state and session-scanner logic behind the
 * PlatformAdapter interface (Strangler Fig pattern). Singleton state
 * (fileStates Map, parentAgentMapCache) is moved to instance properties.
 */

import type {
  PlatformAdapter,
  PlatformCapabilities,
  AggregatorHandle,
  AgentState,
  SessionWatcher as SessionWatcherInterface,
  MetadataWatcher as MetadataWatcherInterface,
} from './types.js';
import type { SessionActivity, ProjectConfig, ConductorConfig } from '../types.js';
import type { SessionFileState, DiscoveredFile } from '../parsers/session-state.js';
import {
  initializeAllFileStates,
  discoverSessionFiles,
  getAllFileStates as getAllFileStatesRaw,
  getOrBootstrap as getOrBootstrapRaw,
  removeFileState as removeFileStateRaw,
  processFileUpdate as processFileUpdateRaw,
  toSessionActivity as toSessionActivityRaw,
  machineStateToLastEntryType,
} from '../parsers/session-state.js';
import {
  extractAgentIdentityFromFile,
  resolveAgentFromMeta,
  resolveAgentFromParent,
  resolveAgentFromSetting,
} from '../parsers/session-scanner.js';
import { discoverProjects, loadConfig } from '../config.js';
import { SessionWatcher } from '../watchers/session-watcher.js';
import path from 'node:path';

export class ClaudeCodeAdapter implements PlatformAdapter {
  /** Instance-level session file state map (replaces module-level singleton). */
  readonly fileStates = new Map<string, SessionFileState>();

  /** Instance-level parent agent map cache (replaces module-level singleton). */
  readonly parentAgentMapCache = new Map<string, { mtime: number; map: Map<string, string> }>();

  private readonly claudeHome: string;

  constructor(claudeHome: string) {
    this.claudeHome = claudeHome;
  }

  // -------------------------------------------------------------------------
  // Core state methods
  // -------------------------------------------------------------------------

  discoverSessionFiles(projectFilter?: string): Map<string, DiscoveredFile> {
    return discoverSessionFiles(this.claudeHome, projectFilter);
  }

  initializeAllFileStates(projectFilter?: string): Map<string, DiscoveredFile> {
    return initializeAllFileStates(this.claudeHome, projectFilter, this.fileStates, (fp, st) => this.resolveAgentIdentity(fp, st));
  }

  processFileUpdate(filePath: string): SessionFileState | null {
    return processFileUpdateRaw(filePath, this.fileStates, (fp, st) => this.resolveAgentIdentity(fp, st));
  }

  getOrBootstrap(filePath: string): SessionFileState | null {
    return getOrBootstrapRaw(filePath, this.fileStates, (fp, st) => this.resolveAgentIdentity(fp, st));
  }

  removeFileState(filePath: string): void {
    removeFileStateRaw(filePath, this.fileStates);
  }

  getAllFileStates(): Map<string, SessionFileState> {
    return getAllFileStatesRaw(this.fileStates);
  }

  // -------------------------------------------------------------------------
  // Identity resolution
  // -------------------------------------------------------------------------

  resolveAgentIdentity(filePath: string, state: SessionFileState): { name: string; role: string } | undefined {
    // 1. Check if processEntry already resolved identity from agent-setting JSONL entry
    if (state.agentName && state.agentRole) {
      return { name: state.agentName, role: state.agentRole };
    }
    // Also check if only agentName was set via agent-setting (resolve role from registry)
    if (state.agentName) {
      const fromSetting = resolveAgentFromSetting(state.agentName);
      if (fromSetting) return fromSetting;
    }

    // 2. Try .meta.json sidecar (Claude Code specific)
    const fromMeta = resolveAgentFromMeta(filePath);
    if (fromMeta) return fromMeta;

    // 3. Try prompt pattern matching (reads file head)
    const fromPrompt = extractAgentIdentityFromFile(filePath);
    if (fromPrompt) return fromPrompt;

    // 4. Fallback: cross-reference parent session for subagent_type
    const subagentsIdx = filePath.indexOf('/subagents/');
    if (subagentsIdx !== -1) {
      const parentDir = filePath.slice(0, subagentsIdx);
      const parentSessionId = path.basename(parentDir);
      const parentJsonl = path.join(path.dirname(parentDir), `${parentSessionId}.jsonl`);
      const childFilename = path.basename(filePath);
      const childAgentId = childFilename.replace(/^agent-/, '').replace(/\.jsonl$/, '');
      return resolveAgentFromParent(parentJsonl, childAgentId, this.parentAgentMapCache);
    }

    return undefined;
  }

  // -------------------------------------------------------------------------
  // Conversion methods
  // -------------------------------------------------------------------------

  toSessionActivity(state: SessionFileState): SessionActivity | null {
    return toSessionActivityRaw(state);
  }

  getAgentState(state: SessionFileState): AgentState {
    const lastEntryType = machineStateToLastEntryType(state);
    switch (lastEntryType) {
      case 'assistant-tool':
        return 'working';
      case 'assistant-question':
        return 'needs_input';
      case 'assistant-text':
        return 'done';
      case 'user':
        return 'working';
      default:
        return 'unknown';
    }
  }

  // -------------------------------------------------------------------------
  // Factory methods
  // -------------------------------------------------------------------------

  createSessionWatcher(aggregator: AggregatorHandle, projectFilter?: string): SessionWatcherInterface {
    return new SessionWatcher(aggregator, this.claudeHome, projectFilter, this);
  }

  createMetadataWatcher(_aggregator: AggregatorHandle): MetadataWatcherInterface | null {
    return null;
  }

  // -------------------------------------------------------------------------
  // Config methods
  // -------------------------------------------------------------------------

  discoverProjects(): ProjectConfig[] {
    return discoverProjects(this.claudeHome);
  }

  loadConfig(): ConductorConfig {
    return loadConfig();
  }

  // -------------------------------------------------------------------------
  // Capability method
  // -------------------------------------------------------------------------

  getPlatformCapabilities(): PlatformCapabilities {
    return {
      supportsFileWatching: true,
      supportsIncrementalReads: true,
      supportsCLISpawn: true,
      supportsMCP: true,
      supportsSubagents: true,
      supportsTokenTracking: false,
    };
  }
}
