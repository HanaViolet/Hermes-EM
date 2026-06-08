import fs from 'node:fs';
import path from 'node:path';
import { getProjectPath, readJsonSafe } from './paths.js';

interface DirectiveJson {
  id: string;
  title: string;
  status: string;
}

interface ProjectJson {
  title: string;
  status: string;
  tasks?: Array<{ status?: string }>;
}

export function conductorStatus(): string {
  const projectPath = getProjectPath();
  const directivesDir = path.join(projectPath, '.context', 'directives');
  const reportsDir = path.join(projectPath, '.context', 'reports');

  const lines: string[] = [];
  const generated = new Date().toISOString();
  lines.push(`## Conductor Status (as of ${generated})`);
  lines.push('');

  // --- Count directives, projects, tasks by scanning directives/ ---
  let directiveCount = 0;
  let activeFeatureCount = 0;
  let doneFeatureCount = 0;
  let pendingTaskCount = 0;
  let completedTaskCount = 0;

  const pendingDirectives: Array<{ id: string; title: string }> = [];
  const activeDirectives: Array<{ id: string; title: string; projects: Array<{ id: string; title: string; status: string; tasksCompleted: number; tasksTotal: number }> }> = [];
  const recentDone: Array<{ id: string; title: string }> = [];

  if (fs.existsSync(directivesDir)) {
    const dirDirs = listDirs(directivesDir);
    for (const dirId of dirDirs) {
      const dirJsonPath = path.join(directivesDir, dirId, 'directive.json');
      const dirJson = readJsonSafe<DirectiveJson>(dirJsonPath);
      if (!dirJson) continue;

      directiveCount++;

      if (dirJson.status === 'pending' || dirJson.status === 'triaged') {
        pendingDirectives.push({ id: dirJson.id ?? dirId, title: dirJson.title ?? dirId });
      }
      if (dirJson.status === 'completed' || dirJson.status === 'done') {
        recentDone.push({ id: dirJson.id ?? dirId, title: dirJson.title ?? dirId });
      }

      // Read projects under this directive
      const projectsDir = path.join(directivesDir, dirId, 'projects');
      const directiveProjects: Array<{ id: string; title: string; status: string; tasksCompleted: number; tasksTotal: number }> = [];

      if (fs.existsSync(projectsDir)) {
        const projDirs = listDirs(projectsDir);
        for (const projId of projDirs) {
          const projJsonPath = path.join(projectsDir, projId, 'project.json');
          const projJson = readJsonSafe<ProjectJson>(projJsonPath);
          if (!projJson) continue;

          const tasks = projJson.tasks ?? [];
          const total = tasks.length;
          const completed = tasks.filter(t => t.status === 'completed' || t.status === 'done').length;
          pendingTaskCount += (total - completed);
          completedTaskCount += completed;

          const projStatus = projJson.status ?? 'pending';
          const isDone = projStatus === 'completed' || projStatus === 'done';
          if (isDone) {
            doneFeatureCount++;
          } else {
            activeFeatureCount++;
          }

          directiveProjects.push({
            id: projId,
            title: projJson.title ?? projId,
            status: isDone ? 'done' : projStatus === 'in_progress' ? 'in-progress' : 'pending',
            tasksCompleted: completed,
            tasksTotal: total,
          });
        }
      }

      if (dirJson.status === 'in_progress' || dirJson.status === 'active') {
        activeDirectives.push({
          id: dirJson.id ?? dirId,
          title: dirJson.title ?? dirId,
          projects: directiveProjects,
        });
      }
    }
  }

  // --- Count reports ---
  let reportCount = 0;
  if (fs.existsSync(reportsDir)) {
    reportCount = fs.readdirSync(reportsDir).filter(f => f.endsWith('.md')).length;
  }

  // --- Summary counts ---
  lines.push('### Summary');
  lines.push(`- Directives (total): ${directiveCount}`);
  lines.push(`- Active projects: ${activeFeatureCount}`);
  lines.push(`- Done projects: ${doneFeatureCount}`);
  lines.push(`- Pending tasks: ${pendingTaskCount}`);
  lines.push(`- Completed tasks: ${completedTaskCount}`);
  lines.push(`- Reports: ${reportCount}`);
  lines.push('');

  // Active directives with projects
  if (activeDirectives.length > 0) {
    lines.push('### Active Directives');
    for (const dir of activeDirectives) {
      lines.push(`- **${dir.title}** (${dir.id})`);
      for (const proj of dir.projects.filter(p => p.status !== 'done')) {
        const pct = proj.tasksTotal > 0
          ? Math.round((proj.tasksCompleted / proj.tasksTotal) * 100)
          : 0;
        lines.push(`  - ${proj.title}: ${pct}% (${proj.tasksCompleted}/${proj.tasksTotal} tasks)`);
      }
    }
    lines.push('');
  }

  // Pending directives
  if (pendingDirectives.length > 0) {
    lines.push('### Pending Directives (inbox)');
    for (const d of pendingDirectives) {
      lines.push(`- ${d.title} (${d.id})`);
    }
    lines.push('');
  }

  if (recentDone.length > 0) {
    lines.push('### Recently Completed Directives');
    for (const d of recentDone.slice(0, 5)) {
      lines.push(`- ${d.title}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// --- Helpers ---

function listDirs(dirPath: string): string[] {
  try {
    return fs.readdirSync(dirPath).filter(name => {
      if (name.startsWith('.') || name.startsWith('_')) return false;
      try { return fs.statSync(path.join(dirPath, name)).isDirectory(); } catch { return false; }
    });
  } catch {
    return [];
  }
}
