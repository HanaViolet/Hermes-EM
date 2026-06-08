/**
 * validate-init — Verify that a scaffolded project has correct config content.
 *
 * Checks that gruai.config.json exists and contains the expected preset,
 * platform, and name fields matching the input configuration.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Platform, PresetName } from '../lib/types.js';

export interface ValidateInitOptions {
  projectPath: string;
  expectedName: string;
  expectedPreset: PresetName;
  expectedPlatform: Platform;
}

export interface ValidateInitResult {
  passed: boolean;
  errors: string[];
}

export function validateInit(options: ValidateInitOptions): ValidateInitResult {
  const errors: string[] = [];
  const configPath = path.join(options.projectPath, 'gruai.config.json');

  // Check file exists
  if (!fs.existsSync(configPath)) {
    return { passed: false, errors: [`gruai.config.json not found at ${configPath}`] };
  }

  // Parse and validate content
  let config: Record<string, unknown>;
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    config = JSON.parse(raw) as Record<string, unknown>;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { passed: false, errors: [`Failed to parse gruai.config.json: ${msg}`] };
  }

  // Assert name field
  if (typeof config['name'] !== 'string' || config['name'] !== options.expectedName) {
    errors.push(
      `Expected name "${options.expectedName}", got ${JSON.stringify(config['name'])}`,
    );
  }

  // Assert preset field
  if (typeof config['preset'] !== 'string' || config['preset'] !== options.expectedPreset) {
    errors.push(
      `Expected preset "${options.expectedPreset}", got ${JSON.stringify(config['preset'])}`,
    );
  }

  // Assert platform field
  if (typeof config['platform'] !== 'string' || config['platform'] !== options.expectedPlatform) {
    errors.push(
      `Expected platform "${options.expectedPlatform}", got ${JSON.stringify(config['platform'])}`,
    );
  }

  return { passed: errors.length === 0, errors };
}
