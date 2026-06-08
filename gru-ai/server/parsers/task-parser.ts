import fs from 'node:fs';
import path from 'node:path';
import type { TeamTask } from '../types.js';

const UUID_DIR_REGEX = /^[0-9a-f]{8}-/;

interface RawTask {
  id?: string;
  subject?: string;
  description?: string;
  activeForm?: string;
  status?: string;
  owner?: string;
  blocks?: string[];
  blockedBy?: string[];
}

function normalizeStatus(raw: string | undefined): TeamTask['status'] {
  if (!raw) return 'pending';
  const lower = raw.toLowerCase().trim();
  if (lower === 'completed' || lower === 'done') return 'completed';
  if (lower === 'in_progress' || lower === 'in-progress') return 'in_progress';
  return 'pending';
}

function parseRawTask(raw: RawTask): TeamTask {
  return {
    id: raw.id ?? '',
    subject: raw.subject ?? '',
    description: raw.description ?? '',
    activeForm: raw.activeForm ?? '',
    status: normalizeStatus(raw.status),
    owner: raw.owner ?? '',
    blocks: raw.blocks ?? [],
    blockedBy: raw.blockedBy ?? [],
  };
}

function parseTasksDir(claudeHome: string, dirName: string): TeamTask[] {
  const tasksDir = path.join(claudeHome, 'tasks', dirName);

  try {
    if (!fs.existsSync(tasksDir)) return [];

    const entries = fs.readdirSync(tasksDir, { withFileTypes: true });
    const tasks: TeamTask[] = [];

    for (const entry of entries) {
      // Skip non-JSON files
      if (!entry.isFile() || !entry.name.endsWith('.json')) continue;

      const filePath = path.join(tasksDir, entry.name);
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const raw = JSON.parse(content) as RawTask;
        tasks.push(parseRawTask(raw));
      } catch {
        // Skip malformed files
      }
    }

    return tasks;
  } catch {
    return [];
  }
}

/**
 * Parse all task directories, returning UUID-named (session) dirs only.
 */
export function parseAllTasks(claudeHome: string, _knownTeamNames: Set<string>): {
  bySession: Record<string, TeamTask[]>;
} {
  const tasksRoot = path.join(claudeHome, 'tasks');
  const bySession: Record<string, TeamTask[]> = {};

  let dirs: string[];
  try {
    dirs = fs.readdirSync(tasksRoot).filter((d) => {
      try {
        return fs.statSync(path.join(tasksRoot, d)).isDirectory();
      } catch {
        return false;
      }
    });
  } catch {
    return { bySession };
  }

  for (const dirName of dirs) {
    if (!UUID_DIR_REGEX.test(dirName)) continue;

    const tasks = parseTasksDir(claudeHome, dirName);
    if (tasks.length === 0) continue;

    bySession[dirName] = tasks;
  }

  return { bySession };
}
