/**
 * Scaffolding engine — creates all project files from templates.
 *
 * SAFE BY DEFAULT: Never overwrites existing user files. Only writes new files.
 * gruai-owned files (agents, skills, registry) are always updated.
 *
 * Takes an InitConfig and produces:
 *  - .gruai/ canonical home directory
 *  - Platform symlink (.claude/, .aider/, etc.)
 *  - .context/ tree (vision, lessons, preferences, backlog, directives, reports)
 *  - Agent personality files for selected roles
 *  - agent-registry.json for selected preset
 *  - CLAUDE.md
 *  - gruai.config.json
 *  - Welcome directive
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { c } from '../lib/color.js';
import { TEMPLATES_DIR, ROLE_TEMPLATES_DIR, SKILLS_SRC_DIR } from '../lib/paths.js';
import { ROLE_DEFINITIONS } from '../lib/roles.js';
import type { InitConfig, AgentEntry, Platform } from '../lib/types.js';

const ALL_SKILLS = ['directive', 'scout', 'healthcheck', 'report'];

// ─── File helpers ────────────────────────────────────────────────────────────

function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeFile(filePath: string, content: string): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf-8');
}

/** Write only if file does not exist. Returns true if written, false if skipped. */
function writeFileIfNew(filePath: string, content: string): boolean {
  if (fs.existsSync(filePath)) return false;
  writeFile(filePath, content);
  return true;
}

function copyFile(src: string, dest: string): void {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function copyDirRecursive(src: string, dest: string): void {
  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      copyFile(srcPath, destPath);
    }
  }
}

function readTemplate(name: string): string {
  const filePath = path.join(TEMPLATES_DIR, name);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Template not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf-8');
}

// ─── Platform directory mapping ──────────────────────────────────────────────

function platformDir(platform: Platform): string | null {
  switch (platform) {
    case 'claude-code': return '.claude';
    case 'aider':       return '.aider';
    case 'gemini-cli':  return '.gemini';
    case 'codex':       return '.codex';
    case 'other':       return null;
  }
}

// ─── Scaffold functions ──────────────────────────────────────────────────────

function scaffoldGruaiHome(projectPath: string, platform: Platform): { merged: string[] } {
  const gruaiDir = path.join(projectPath, '.gruai');
  ensureDir(gruaiDir);

  const merged: string[] = [];
  const platDir = platformDir(platform);
  if (platDir) {
    const platPath = path.join(projectPath, platDir);
    if (fs.existsSync(platPath)) {
      const stat = fs.lstatSync(platPath);
      if (stat.isSymbolicLink()) {
        // Already a symlink — check if it points to .gruai
        const target = fs.readlinkSync(platPath);
        if (target === '.gruai' || target === path.join(projectPath, '.gruai')) {
          // Already correct, nothing to do
          return { merged };
        }
        fs.unlinkSync(platPath);
      } else {
        // Real directory — merge contents into .gruai preserving existing files
        const entries = fs.readdirSync(platPath, { withFileTypes: true });
        for (const entry of entries) {
          const src = path.join(platPath, entry.name);
          const dest = path.join(gruaiDir, entry.name);
          if (fs.existsSync(dest)) {
            // Destination exists — merge directories, skip files
            if (entry.isDirectory() && fs.statSync(dest).isDirectory()) {
              // Merge directory contents (existing files in .gruai win)
              mergeDir(src, dest);
              merged.push(entry.name + '/');
            }
            // Skip files that already exist in .gruai
          } else {
            fs.renameSync(src, dest);
            merged.push(entry.name);
          }
        }
        fs.rmSync(platPath, { recursive: true, force: true });
      }
    }
    // Create symlink: .claude -> .gruai
    fs.symlinkSync('.gruai', platPath);
  }
  return { merged };
}

/** Recursively merge src into dest, never overwriting existing files in dest. */
function mergeDir(src: string, dest: string): void {
  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      mergeDir(srcPath, destPath);
    } else if (!fs.existsSync(destPath)) {
      fs.renameSync(srcPath, destPath);
    }
    // If destPath exists, user's file wins — do nothing
  }
}

function scaffoldAgents(projectPath: string, agents: AgentEntry[]): { written: number; skipped: string[] } {
  const destDir = path.join(projectPath, '.gruai', 'agents');
  let written = 0;
  const skipped: string[] = [];

  for (const agent of agents) {
    const roleId = ROLE_DEFINITIONS.find(r => r.title === agent.title)?.id;
    const templatePath = path.join(ROLE_TEMPLATES_DIR, `${roleId}.md`);
    const destPath = path.join(destDir, agent.agentFile);

    // Agent personality files are gruai-owned — always write
    let content: string;
    if (fs.existsSync(templatePath)) {
      content = fs.readFileSync(templatePath, 'utf-8');
      content = content.replace(/\{\{NAME\}\}/g, agent.name);
      content = content.replace(/\{\{FIRST_NAME\}\}/g, agent.firstName);
      content = content.replace(/\{\{FIRST_NAME_LOWER\}\}/g, agent.firstName.toLowerCase());
    } else {
      content = `# ${agent.name} -- ${agent.role}\n\nRole template not found.\n`;
    }

    writeFile(destPath, content);
    written++;
  }

  return { written, skipped };
}

function scaffoldRegistry(projectPath: string, agents: AgentEntry[], preset: string): void {
  const ceoEntry = {
    id: 'ceo',
    name: 'CEO',
    title: 'CEO',
    role: 'Chief Executive Officer',
    description: 'Sets direction, reviews proposals, approves work',
    agentFile: null,
    reportsTo: null,
    domains: ['Strategy', 'Direction', 'Approval'],
    color: 'text-foreground',
    bgColor: 'bg-foreground/10',
    borderColor: 'border-foreground/30',
    dotColor: 'bg-foreground',
    isCsuite: true,
    game: { palette: 0, seatId: 'seat-1', position: { row: 3, col: 5 }, color: 'gold', isPlayer: true },
  };

  const agentEntries = agents.map(a => ({
    id: a.id,
    name: a.name,
    firstName: a.firstName,
    title: a.title,
    role: a.role,
    description: a.description,
    agentFile: a.agentFile,
    reportsTo: a.reportsTo,
    domains: a.domains,
    color: a.color,
    bgColor: a.bgColor,
    borderColor: a.borderColor,
    dotColor: a.dotColor,
    isCsuite: a.isCsuite,
    game: a.game,
  }));

  const teams = buildTeams(agents);
  const registry = { teamSize: preset, agents: [ceoEntry, ...agentEntries], teams };
  // Registry is gruai-owned — always overwrite
  writeFile(path.join(projectPath, '.gruai', 'agent-registry.json'), JSON.stringify(registry, null, 2));
}

function buildTeams(agents: AgentEntry[]): object[] {
  const ctoAgent = agents.find(a => a.title === 'CTO');
  const cpoAgent = agents.find(a => a.title === 'CPO');
  const cmoAgent = agents.find(a => a.title === 'CMO');
  const cooAgent = agents.find(a => a.title === 'COO');

  const teams: object[] = [];

  if (ctoAgent) {
    const members = agents
      .filter(a => a.reportsTo === ctoAgent.id || a.id === ctoAgent.id)
      .map(a => a.id);
    teams.push({
      id: 'engineering', name: 'Engineering',
      description: 'Architecture, backend, data, full-stack engineering',
      leadAgentId: ctoAgent.id, memberAgentIds: members,
      color: 'text-violet-400', bgColor: 'bg-violet-500/10', borderColor: 'border-violet-500/30',
    });
  }

  if (cpoAgent) {
    const members = agents
      .filter(a => a.reportsTo === cpoAgent.id || a.id === cpoAgent.id)
      .map(a => a.id);
    teams.push({
      id: 'product', name: 'Product',
      description: 'Frontend, UX, quality assurance',
      leadAgentId: cpoAgent.id, memberAgentIds: members,
      color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30',
    });
  }

  if (cmoAgent) {
    const members = agents
      .filter(a => a.reportsTo === cmoAgent.id || a.id === cmoAgent.id)
      .map(a => a.id);
    teams.push({
      id: 'growth', name: 'Growth',
      description: 'Content, SEO, marketing, positioning',
      leadAgentId: cmoAgent.id, memberAgentIds: members,
      color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30',
    });
  }

  if (cooAgent) {
    teams.push({
      id: 'operations', name: 'Operations',
      description: 'Planning, orchestration, execution',
      leadAgentId: cooAgent.id, memberAgentIds: [cooAgent.id],
      color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30',
    });
  }

  return teams;
}

function scaffoldSkills(projectPath: string): { written: number; updated: number } {
  const destDir = path.join(projectPath, '.gruai', 'skills');
  let written = 0;
  let updated = 0;

  for (const skill of ALL_SKILLS) {
    const skillDir = path.join(SKILLS_SRC_DIR, skill);
    const skillMd = path.join(skillDir, 'SKILL.md');
    if (!fs.existsSync(skillMd)) {
      console.warn(c.yellow(`  Warning: Skill file not found: ${skill}/SKILL.md (skipped)`));
      continue;
    }

    const destSkillMd = path.join(destDir, skill, 'SKILL.md');
    const existed = fs.existsSync(destSkillMd);

    // Skills are gruai-owned — always update to latest version
    copyFile(skillMd, destSkillMd);

    const docsDir = path.join(skillDir, 'docs');
    if (fs.existsSync(docsDir) && fs.statSync(docsDir).isDirectory()) {
      copyDirRecursive(docsDir, path.join(destDir, skill, 'docs'));
    }

    if (existed) updated++;
    else written++;
  }

  return { written, updated };
}

function scaffoldContext(projectPath: string, config: InitConfig): { created: string[]; preserved: string[] } {
  const contextDir = path.join(projectPath, '.context');
  const created: string[] = [];
  const preserved: string[] = [];

  // vision.md — user-owned, skip if exists
  const visionPath = path.join(contextDir, 'vision.md');
  const vision = readTemplate('vision.md').replace(/\{\{PROJECT_NAME\}\}/g, config.projectName);
  if (writeFileIfNew(visionPath, vision)) created.push('vision.md');
  else preserved.push('vision.md');

  // lessons/index.md — user-owned, skip if exists
  const lessonsPath = path.join(contextDir, 'lessons', 'index.md');
  const lessons = readTemplate('lessons.md').replace(/\{\{PROJECT_NAME\}\}/g, config.projectName);
  if (writeFileIfNew(lessonsPath, lessons)) created.push('lessons/index.md');
  else preserved.push('lessons/index.md');

  // preferences.md — user-owned, skip if exists
  const prefsPath = path.join(contextDir, 'preferences.md');
  if (writeFileIfNew(prefsPath,
    `# CEO Preferences\n\n> Standing orders for the team. Agents read this before every task.\n\n## Standing Orders\n\n- (Add your preferences here)\n`,
  )) created.push('preferences.md');
  else preserved.push('preferences.md');

  // backlog.json — user-owned, skip if exists
  const backlogPath = path.join(contextDir, 'backlog.json');
  const backlog = readTemplate('backlog.json.template');
  if (writeFileIfNew(backlogPath, backlog)) created.push('backlog.json');
  else preserved.push('backlog.json');

  // Empty directories with .gitkeep
  for (const dir of ['directives', 'reports']) {
    const dirPath = path.join(contextDir, dir);
    ensureDir(dirPath);
    const gitkeep = path.join(dirPath, '.gitkeep');
    if (!fs.existsSync(gitkeep)) {
      fs.writeFileSync(gitkeep, '', 'utf-8');
    }
  }

  return { created, preserved };
}

function scaffoldClaudeMd(projectPath: string, config: InitConfig): 'created' | 'preserved' {
  const claudeMdPath = path.join(projectPath, 'CLAUDE.md');

  // User-owned file — never overwrite
  if (fs.existsSync(claudeMdPath)) {
    return 'preserved';
  }

  const template = readTemplate('CLAUDE.md.template');

  const rosterLines = ['| Name | Title | Role |', '|------|-------|------|'];
  rosterLines.push('| (You) | CEO | Chief Executive Officer |');
  for (const agent of config.agents) {
    rosterLines.push(`| ${agent.name} | ${agent.title} | ${agent.role} |`);
  }

  const content = template
    .replace(/\{\{PROJECT_NAME\}\}/g, config.projectName)
    .replace(/\{\{AGENT_ROSTER\}\}/g, rosterLines.join('\n'));

  writeFile(claudeMdPath, content);
  return 'created';
}

function scaffoldGruaiConfig(projectPath: string, config: InitConfig): 'created' | 'updated' {
  const configPath = path.join(projectPath, 'gruai.config.json');
  const existed = fs.existsSync(configPath);

  const template = readTemplate('gruai.config.json.template');
  const agentsJson = JSON.stringify(
    config.agents.map(a => ({ id: a.id, name: a.name, role: a.title })),
    null, 4,
  );
  const indentedAgentsJson = agentsJson
    .split('\n')
    .map((line, i) => (i === 0 ? line : '  ' + line))
    .join('\n');

  const content = template
    .replace(/\{\{PROJECT_NAME\}\}/g, config.projectName)
    .replace(/\{\{PRESET\}\}/g, config.preset)
    .replace(/\{\{PLATFORM\}\}/g, config.platform)
    .replace(/\{\{AGENTS_JSON\}\}/g, indentedAgentsJson);

  // gruai config is gruai-owned — always update
  writeFile(configPath, content);
  return existed ? 'updated' : 'created';
}

function scaffoldWelcomeDirective(projectPath: string): boolean {
  const srcDir = path.join(TEMPLATES_DIR, 'welcome-directive');
  if (!fs.existsSync(srcDir)) return false;

  const destDir = path.join(projectPath, '.context', 'directives', 'welcome');

  // User-owned content — skip if directive already exists
  if (fs.existsSync(path.join(destDir, 'directive.json'))) return false;

  ensureDir(destDir);

  // directive.json
  const djson = fs.readFileSync(path.join(srcDir, 'directive.json'), 'utf-8');
  writeFile(
    path.join(destDir, 'directive.json'),
    djson.replace(/\{\{CREATED_AT\}\}/g, new Date().toISOString()),
  );

  // directive.md
  copyFile(path.join(srcDir, 'directive.md'), path.join(destDir, 'directive.md'));
  return true;
}

// ─── Main scaffold function ─────────────────────────────────────────────────

export async function runScaffold(config: InitConfig): Promise<void> {
  if (!fs.existsSync(config.projectPath)) {
    console.error(c.red(`  Error: Project path does not exist: ${config.projectPath}`));
    process.exit(1);
  }

  console.log(`\n  ${c.bold('Scaffolding gruai...')}\n`);

  // 1. .gruai/ home + platform symlink
  const { merged } = scaffoldGruaiHome(config.projectPath, config.platform);
  const platDir = platformDir(config.platform);
  if (platDir) {
    console.log(c.green(`  [+] Home:        .gruai/ with ${platDir}/ -> .gruai/ symlink`));
    if (merged.length > 0) {
      console.log(c.dim(`                   merged ${merged.length} existing entries from ${platDir}/`));
    }
  } else {
    console.log(c.green(`  [+] Home:        .gruai/`));
  }

  // 2. Agent registry (gruai-owned — always update)
  scaffoldRegistry(config.projectPath, config.agents, config.preset);
  console.log(c.green(`  [+] Registry:    agent-registry.json (${config.agents.length} agents + CEO, ${config.preset} preset)`));

  // 3. Agent personality files (gruai-owned — always update)
  const agentResult = scaffoldAgents(config.projectPath, config.agents);
  console.log(c.green(`  [+] Agents:      ${agentResult.written} personality files`));

  // 4. Skills (gruai-owned — always update to latest)
  const skillResult = scaffoldSkills(config.projectPath);
  const skillParts: string[] = [];
  if (skillResult.written > 0) skillParts.push(`${skillResult.written} new`);
  if (skillResult.updated > 0) skillParts.push(`${skillResult.updated} updated`);
  console.log(c.green(`  [+] Skills:      ${skillParts.join(', ') || 'up to date'}`));

  // 5. Context tree (user-owned — never overwrite)
  const ctxResult = scaffoldContext(config.projectPath, config);
  if (ctxResult.created.length > 0) {
    console.log(c.green(`  [+] Context:     ${ctxResult.created.join(', ')}`));
  }
  if (ctxResult.preserved.length > 0) {
    console.log(c.dim(`  [=] Context:     ${ctxResult.preserved.join(', ')} (preserved)`));
  }

  // 6. CLAUDE.md (user-owned — never overwrite)
  const claudeResult = scaffoldClaudeMd(config.projectPath, config);
  if (claudeResult === 'created') {
    console.log(c.green(`  [+] CLAUDE.md:   project rules with agent roster`));
  } else {
    console.log(c.dim(`  [=] CLAUDE.md:   preserved (existing file kept)`));
  }

  // 7. gruai.config.json (gruai-owned — always update)
  const configResult = scaffoldGruaiConfig(config.projectPath, config);
  console.log(c.green(`  [+] Config:      gruai.config.json (${configResult})`));

  // 8. Welcome directive (user-owned — skip if exists)
  const welcomeCreated = scaffoldWelcomeDirective(config.projectPath);
  if (welcomeCreated) {
    console.log(c.green(`  [+] Directive:   welcome directive scaffolded`));
  }

  // Output team summary
  console.log(`\n  ${c.bold('Done!')} gruai scaffolded into: ${c.cyan(config.projectPath)}\n`);
  console.log(`  ${c.bold('Your team:')}\n`);
  for (const agent of config.agents) {
    const csuite = agent.isCsuite ? c.dim(' (C-suite)') : '';
    console.log(`    ${agent.name.padEnd(22)} ${c.cyan(agent.title.padEnd(5))} ${agent.role}${csuite}`);
  }

  console.log(`
  ${c.bold('Next steps:')}

  1. Edit your project vision:
     ${c.dim(path.join(config.projectPath, '.context', 'vision.md'))}

  2. Set your preferences (standing orders for the team):
     ${c.dim(path.join(config.projectPath, '.context', 'preferences.md'))}

  3. Start the dashboard:
     ${c.cyan('npx gru-ai start')}

  4. Give your first directive:
     ${c.cyan('claude -p "/directive add dark mode to the dashboard"')}

  ${c.dim('Happy orchestrating!')}
`);
}
