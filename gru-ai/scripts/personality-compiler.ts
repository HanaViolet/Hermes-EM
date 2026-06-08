#!/usr/bin/env tsx
/**
 * Personality Compiler
 *
 * Reads agent personality files (.claude/agents/*.md) and compiles them
 * for different platforms. For Claude Code: no-op (agents already in
 * correct format). For Codex: flattens personality to plain prose.
 *
 * Usage:
 *   npx tsx scripts/personality-compiler.ts --agent devon-fullstack --platform claude-code
 *   npx tsx scripts/personality-compiler.ts --agent devon-fullstack --platform codex
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AgentRegistryEntry {
  id: string
  name: string
  title: string
  role: string
  description: string
  agentFile: string | null
  reportsTo: string | null
  domains: string[]
}

interface AgentRegistry {
  agents: AgentRegistryEntry[]
}

interface ParsedFrontmatter {
  fields: Record<string, string | string[]>
  body: string
}

// ---------------------------------------------------------------------------
// Frontmatter parsing (no yaml dependency)
// ---------------------------------------------------------------------------

function parseFrontmatter(content: string): ParsedFrontmatter {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!match) {
    return { fields: {}, body: content }
  }

  const rawYaml = match[1]
  const body = match[2]
  const fields: Record<string, string | string[]> = {}

  let currentKey: string | null = null
  let currentArray: string[] | null = null

  for (const line of rawYaml.split('\n')) {
    // Array item under current key
    if (currentKey && currentArray && /^\s+-\s+/.test(line)) {
      const value = line.replace(/^\s+-\s+/, '').trim()
      currentArray.push(value)
      continue
    }

    // Flush any accumulated array
    if (currentKey && currentArray) {
      fields[currentKey] = currentArray
      currentKey = null
      currentArray = null
    }

    // Key-value pair
    const kvMatch = line.match(/^(\w[\w-]*):\s*(.*)$/)
    if (kvMatch) {
      const key = kvMatch[1]
      const value = kvMatch[2].trim()

      if (value === '' || value === '|') {
        // Might be a multiline scalar or array — peek ahead via currentKey
        currentKey = key
        currentArray = []
      } else {
        fields[key] = value
      }
    }
  }

  // Flush trailing array
  if (currentKey && currentArray) {
    if (currentArray.length > 0) {
      fields[currentKey] = currentArray
    }
    // If currentArray is empty but we have a multiline scalar, skip — not needed for our use case
  }

  return { fields, body }
}

// ---------------------------------------------------------------------------
// Core compiler
// ---------------------------------------------------------------------------

/** Fields that are Claude Code-specific and should be stripped for other platforms */
const CLAUDE_CODE_ONLY_FIELDS = new Set([
  'permissionMode',
  'hooks',
  'skills',
  'memory',
  'model',
])

export function compilePersonality(agentId: string, platform: string): string {
  if (platform === 'claude-code') {
    return ''
  }

  // Load agent registry
  const registryPath = path.join(ROOT, '.claude', 'agent-registry.json')
  const registry: AgentRegistry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'))

  // Find agent — agentId can be the registry id or the agentFile stem (e.g., "devon-fullstack")
  let agent = registry.agents.find(a => a.id === agentId)
  if (!agent) {
    // Try matching by agentFile stem
    agent = registry.agents.find(
      a => a.agentFile && a.agentFile.replace(/\.md$/, '') === agentId
    )
  }
  if (!agent) {
    throw new Error(`Agent "${agentId}" not found in agent-registry.json`)
  }
  if (!agent.agentFile) {
    throw new Error(`Agent "${agentId}" has no agentFile defined`)
  }

  // Read the personality file
  const agentFilePath = path.join(ROOT, '.claude', 'agents', agent.agentFile)
  const rawContent = fs.readFileSync(agentFilePath, 'utf-8')
  const { fields, body } = parseFrontmatter(rawContent)

  if (platform === 'codex') {
    return compileForCodex(agent, fields, body)
  }

  throw new Error(`Unknown platform: "${platform}". Supported: claude-code, codex`)
}

function compileForCodex(
  agent: AgentRegistryEntry,
  fields: Record<string, string | string[]>,
  body: string
): string {
  const lines: string[] = []

  // Header with identity from registry
  lines.push(`# ${agent.name} -- ${agent.role}`)
  lines.push('')
  lines.push(agent.description)
  lines.push('')

  // Tools as prose (from frontmatter, stripped of Claude Code-specific ones)
  const tools = fields['tools']
  if (Array.isArray(tools) && tools.length > 0) {
    lines.push(`Available tools: ${tools.join(', ')}`)
    lines.push('')
  }

  // Retained frontmatter fields (non-Claude-Code-specific, non-tools)
  for (const [key, value] of Object.entries(fields)) {
    if (CLAUDE_CODE_ONLY_FIELDS.has(key)) continue
    if (key === 'name' || key === 'description' || key === 'tools') continue

    if (Array.isArray(value)) {
      lines.push(`${key}: ${value.join(', ')}`)
    } else {
      lines.push(`${key}: ${value}`)
    }
  }

  // Body (the prose content after frontmatter)
  const trimmedBody = body.trim()
  if (trimmedBody) {
    lines.push('')
    lines.push(trimmedBody)
  }

  return lines.join('\n') + '\n'
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): { agent: string; platform: string } {
  let agent = ''
  let platform = ''

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--agent' && argv[i + 1]) {
      agent = argv[i + 1]
      i++
    } else if (argv[i] === '--platform' && argv[i + 1]) {
      platform = argv[i + 1]
      i++
    }
  }

  if (!agent || !platform) {
    console.error('Usage: tsx scripts/personality-compiler.ts --agent <id> --platform <platform>')
    console.error('  Platforms: claude-code, codex')
    process.exit(1)
  }

  return { agent, platform }
}

// Run CLI when executed directly
const isMain = process.argv[1] && (
  process.argv[1].endsWith('personality-compiler.ts') ||
  process.argv[1].endsWith('personality-compiler.js')
)

if (isMain) {
  const { agent, platform } = parseArgs(process.argv.slice(2))
  const result = compilePersonality(agent, platform)
  process.stdout.write(result)
}
