import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { CodexCLISpawnAdapter } from '../codex-cli-spawn.js';
import { compilePersonality } from '../../../scripts/personality-compiler.js';
import type { SpawnConfig } from '../spawn-adapter.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let tmpDir: string;

before(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-spawn-test-'));
});

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ===========================================================================
// 1. compilePersonality for Codex
// ===========================================================================

describe('compilePersonality (codex platform)', () => {
  it('returns a non-empty string for a known agent', () => {
    const result = compilePersonality('devon', 'codex');
    assert.ok(typeof result === 'string', 'should return a string');
    assert.ok(result.length > 0, 'should not be empty');
  });

  it('contains agent identity prose from the agent definition', () => {
    const result = compilePersonality('devon', 'codex');
    assert.ok(result.includes('Devon Lee'), 'should contain agent name "Devon Lee"');
    assert.ok(result.includes('Full-Stack'), 'should contain role "Full-Stack"');
  });

  it('returns empty string for claude-code platform (no-op)', () => {
    const result = compilePersonality('devon', 'claude-code');
    assert.equal(result, '', 'claude-code platform should return empty string');
  });

  it('throws for an unknown agent ID', () => {
    assert.throws(
      () => compilePersonality('nonexistent-agent-xyz', 'codex'),
      /not found/i,
      'should throw for unknown agent',
    );
  });
});

// ===========================================================================
// 2. CodexCLISpawnAdapter writes codex.md before spawn
// ===========================================================================

describe('CodexCLISpawnAdapter codex.md writing', () => {
  it('writes codex.md to cwd when agentId is set', () => {
    const cwd = fs.mkdtempSync(path.join(tmpDir, 'codex-md-write-'));
    const adapter = new CodexCLISpawnAdapter();

    const config: SpawnConfig = {
      prompt: 'echo hello',
      cwd,
      agentId: 'devon',
    };

    // spawnAgent will write codex.md then try to spawn `codex` which is not
    // installed. We catch the error and verify the file was written.
    try {
      const handle = adapter.spawnAgent(config, 'tracked');
      // If codex happened to be installed, still clean up.
      if (handle.promise) {
        handle.promise.catch(() => { /* expected */ });
      }
    } catch {
      // ENOENT from spawn is expected when codex is not installed.
    }

    const codexMdPath = path.join(cwd, 'codex.md');
    assert.ok(fs.existsSync(codexMdPath), 'codex.md should be written to cwd');

    const content = fs.readFileSync(codexMdPath, 'utf-8');
    assert.ok(content.includes('Devon Lee'), 'codex.md should contain agent personality');
    assert.ok(content.length > 50, 'codex.md should have substantial content');
  });

  it('does not write codex.md when agentId is omitted', () => {
    const cwd = fs.mkdtempSync(path.join(tmpDir, 'codex-md-no-agent-'));
    const adapter = new CodexCLISpawnAdapter();

    const config: SpawnConfig = {
      prompt: 'echo hello',
      cwd,
    };

    try {
      const handle = adapter.spawnAgent(config, 'tracked');
      if (handle.promise) {
        handle.promise.catch(() => { /* expected */ });
      }
    } catch {
      // ENOENT expected.
    }

    const codexMdPath = path.join(cwd, 'codex.md');
    assert.ok(!fs.existsSync(codexMdPath), 'codex.md should NOT be written when no agentId');
  });
});

// ===========================================================================
// 3. ENOENT graceful handling (codex not installed)
// ===========================================================================

describe('CodexCLISpawnAdapter ENOENT handling', () => {
  it('rejects tracked promise with ENOENT when codex is not installed', async () => {
    const cwd = fs.mkdtempSync(path.join(tmpDir, 'codex-enoent-'));
    const adapter = new CodexCLISpawnAdapter();

    const config: SpawnConfig = {
      prompt: 'test prompt',
      cwd,
    };

    const handle = adapter.spawnAgent(config, 'tracked');
    assert.ok(handle.promise, 'tracked mode should have a promise');

    try {
      await handle.promise;
      // If codex is somehow installed, this test is still valid --
      // it just resolves with an exit code instead of rejecting.
    } catch (err: unknown) {
      assert.ok(err instanceof Error, 'should reject with an Error');
      const nodeErr = err as NodeJS.ErrnoException;
      assert.equal(nodeErr.code, 'ENOENT', 'error code should be ENOENT');
    }
  });
});

// ===========================================================================
// 4. killAgent is non-fatal for invalid PIDs
// ===========================================================================

describe('CodexCLISpawnAdapter killAgent', () => {
  it('does not throw for an invalid PID', () => {
    const adapter = new CodexCLISpawnAdapter();
    // PID -1 is guaranteed invalid. killAgent should swallow the error.
    assert.doesNotThrow(() => adapter.killAgent(-1));
  });
});
