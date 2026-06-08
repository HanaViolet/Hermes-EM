#!/usr/bin/env tsx
/**
 * Universal Agent Spawn Entry Point
 *
 * Reads platform from gruai.config.json (defaults to claude-code),
 * instantiates the correct SpawnAdapter, and spawns an agent process
 * in either tracked or detached mode.
 *
 * Usage:
 *   npx tsx scripts/spawn-agent.ts --prompt 'do something' --mode tracked
 *   npx tsx scripts/spawn-agent.ts --agent devon-fullstack --prompt 'build X' --mode tracked
 *   npx tsx scripts/spawn-agent.ts --prompt '/directive test' --mode detached
 *   npx tsx scripts/spawn-agent.ts --agent devon-fullstack --prompt 'test' --mode tracked --model sonnet --cwd /path --output /tmp/log.txt
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { ClaudeCodeSpawnAdapter } from '../server/platform/claude-code-spawn.js'
import { compilePersonality } from './personality-compiler.js'

import type { SpawnConfig, SpawnMode } from '../server/platform/spawn-adapter.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

interface CliArgs {
  agent?: string
  prompt: string
  mode: SpawnMode
  model: string
  cwd: string
  output?: string
}

function parseArgs(argv: string[]): CliArgs {
  let agent: string | undefined
  let prompt = ''
  let mode = ''
  let model = 'sonnet'
  let cwd = process.cwd()
  let output: string | undefined

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const next = argv[i + 1]

    if (arg === '--agent' && next) {
      agent = next
      i++
    } else if (arg === '--prompt' && next) {
      prompt = next
      i++
    } else if (arg === '--mode' && next) {
      mode = next
      i++
    } else if (arg === '--model' && next) {
      model = next
      i++
    } else if (arg === '--cwd' && next) {
      cwd = next
      i++
    } else if (arg === '--output' && next) {
      output = next
      i++
    }
  }

  if (!prompt) {
    console.error('Error: --prompt is required')
    console.error('')
    console.error('Usage: tsx scripts/spawn-agent.ts --prompt <text> --mode tracked|detached [options]')
    console.error('')
    console.error('Options:')
    console.error('  --agent <id>         Agent definition ID (e.g. devon-fullstack)')
    console.error('  --prompt <text>      Prompt to send to the agent (required)')
    console.error('  --mode <mode>        tracked or detached (required)')
    console.error('  --model <model>      Model override (default: sonnet)')
    console.error('  --cwd <path>         Working directory (default: cwd)')
    console.error('  --output <path>      Path to write output log')
    process.exit(1)
  }

  if (mode !== 'tracked' && mode !== 'detached') {
    console.error(`Error: --mode must be "tracked" or "detached", got "${mode || '(empty)'}"`)
    process.exit(1)
  }

  return { agent, prompt, mode, model, cwd, output }
}

// ---------------------------------------------------------------------------
// Platform detection
// ---------------------------------------------------------------------------

function detectPlatform(cwd: string): string {
  const configPath = path.join(cwd, 'gruai.config.json')

  try {
    const raw = fs.readFileSync(configPath, 'utf-8')
    const config = JSON.parse(raw) as { platform?: string }
    if (config.platform) {
      return config.platform
    }
  } catch {
    // File not found or invalid JSON -- fall through to default.
  }

  return 'claude-code'
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const platform = detectPlatform(args.cwd)

  // Compile personality for non-Claude-Code platforms
  if (platform !== 'claude-code' && args.agent) {
    compilePersonality(args.agent, platform)
  }

  // Instantiate adapter
  if (platform !== 'claude-code') {
    console.error(`Error: platform "${platform}" is not yet supported. Only "claude-code" is available.`)
    process.exit(1)
  }

  const adapter = new ClaudeCodeSpawnAdapter()

  // Build spawn config
  const config: SpawnConfig = {
    prompt: args.prompt,
    cwd: args.cwd,
    agentId: args.agent,
    model: args.model,
    skipPermissions: true,
    sessionPersistence: args.mode === 'tracked' ? false : undefined,
    outputPath: args.output,
  }

  // Spawn
  const handle = adapter.spawnAgent(config, args.mode)

  if (args.mode === 'detached') {
    console.log(handle.pid)
    process.exit(0)
  }

  // Tracked mode: await completion and exit with child's exit code
  if (handle.promise) {
    try {
      const exitCode = await handle.promise
      process.exit(exitCode)
    } catch (err) {
      console.error('Spawn error:', err)
      process.exit(1)
    }
  } else {
    // Should not happen for tracked mode, but handle gracefully
    console.error('Error: tracked mode returned no completion promise')
    process.exit(1)
  }
}

main()
