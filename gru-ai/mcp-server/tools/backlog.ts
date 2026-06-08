import fs from 'node:fs';
import path from 'node:path';
import { getProjectPath, readJsonSafe } from './paths.js';

interface BacklogItem {
  id: string;
  title: string;
  status: string;
  priority?: string;
  trigger?: string;
  source_directive?: string;
  context?: string;
  description?: string;
  created?: string;
  updated?: string;
}

/**
 * List backlog items from .context/backlog.json.
 * Optionally filtered by priority.
 */
export function listBacklog(priority?: string): string {
  const projectPath = getProjectPath();
  const backlogPath = path.join(projectPath, '.context', 'backlog.json');

  if (!fs.existsSync(backlogPath)) {
    return 'No backlog file found. The backlog is empty.';
  }

  const raw = readJsonSafe<BacklogItem[]>(backlogPath);
  if (!Array.isArray(raw) || raw.length === 0) {
    return 'Backlog is empty.';
  }

  let items = raw;

  if (priority) {
    const normalizedPriority = priority.toUpperCase();
    items = items.filter(i => i.priority?.toUpperCase() === normalizedPriority);
  }

  // Exclude done items by default
  const pending = items.filter(i => i.status !== 'done');
  const done = items.filter(i => i.status === 'done');

  const lines: string[] = [];
  lines.push(`## Backlog${priority ? ` [${priority}]` : ''}`);
  lines.push(`${pending.length} pending, ${done.length} done`);
  lines.push('');

  if (pending.length > 0) {
    lines.push('### Pending');
    for (const item of pending) {
      const parts: string[] = [`- **${item.title}**`];
      if (item.priority) parts.push(`[${item.priority}]`);
      lines.push(parts.join(' '));
      if (item.trigger) {
        lines.push(`  - Trigger: ${item.trigger}`);
      }
    }
    lines.push('');
  }

  if (done.length > 0) {
    lines.push(`### Done (${done.length} items)`);
    for (const item of done.slice(0, 10)) {
      lines.push(`- ~~${item.title}~~`);
    }
    if (done.length > 10) {
      lines.push(`- ...and ${done.length - 10} more`);
    }
  }

  return lines.join('\n');
}

/**
 * Add a new item to .context/backlog.json.
 */
export function addBacklogItem(
  title: string,
  priorityLevel: string,
  description: string,
  triggerCondition?: string
): string {
  const projectPath = getProjectPath();
  const backlogPath = path.join(projectPath, '.context', 'backlog.json');

  // Read existing backlog or create empty array
  let items: BacklogItem[] = [];
  if (fs.existsSync(backlogPath)) {
    const raw = readJsonSafe<BacklogItem[]>(backlogPath);
    if (Array.isArray(raw)) {
      items = raw;
    }
  }

  // Generate a simple ID from the title
  const id = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);

  const now = new Date().toISOString().split('T')[0];

  const newItem: BacklogItem = {
    id,
    title,
    status: 'pending',
    priority: priorityLevel.toUpperCase(),
    description,
    created: now,
    updated: now,
  };

  if (triggerCondition) {
    newItem.trigger = triggerCondition;
  }

  items.push(newItem);

  fs.writeFileSync(backlogPath, JSON.stringify(items, null, 2), 'utf-8');

  return `Added "${title}" (${priorityLevel}) to backlog.json${triggerCondition ? ` with trigger: "${triggerCondition}"` : ''}`;
}
