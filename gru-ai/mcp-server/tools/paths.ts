import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

interface ConductorConfig {
  projects: Array<{ name: string; path: string; contextPath?: string }>;
}

function isValidConductorConfig(value: unknown): value is ConductorConfig {
  if (!value || typeof value !== 'object') return false;
  const config = value as Record<string, unknown>;
  if (!Array.isArray(config.projects)) return false;
  const first = config.projects[0];
  if (!first || typeof first !== 'object') return false;
  return typeof (first as Record<string, unknown>).path === 'string';
}

let resolvedProjectPath: string | null = null;

/**
 * Resolves the project path from env var or ~/.conductor/config.json.
 * Caches the result after first resolution.
 */
export function getProjectPath(): string {
  if (resolvedProjectPath) return resolvedProjectPath;

  // 1. Check env var
  const envPath = process.env['CONDUCTOR_PROJECT_PATH'];
  if (envPath && fs.existsSync(envPath)) {
    resolvedProjectPath = envPath;
    return resolvedProjectPath;
  }

  // 2. Read from ~/.conductor/config.json
  const configPath = path.join(os.homedir(), '.conductor', 'config.json');
  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (isValidConductorConfig(parsed)) {
        const p = parsed.projects[0].path;
        const resolved = p.startsWith('~/') ? path.join(os.homedir(), p.slice(2)) : p;
        if (fs.existsSync(resolved)) {
          resolvedProjectPath = resolved;
          return resolvedProjectPath;
        }
      }
    } catch {
      // Fall through to error below if config is missing or malformed
    }
  }

  throw new Error(
    'Cannot resolve project path. Set CONDUCTOR_PROJECT_PATH env var or configure ~/.conductor/config.json'
  );
}
/** Path to .context/directives/ directory */
export function directivesPath(...segments: string[]): string {
  return path.join(getProjectPath(), '.context', 'directives', ...segments);
}

/** Path to .context/ conductor directory */
export function conductorPath(...segments: string[]): string {
  return path.join(getProjectPath(), '.context', ...segments);
}

/** Safely read a JSON file, returning null on any error */
export function readJsonSafe<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Safely read a text file, returning null on any error */
export function readTextSafe(filePath: string): string | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}
