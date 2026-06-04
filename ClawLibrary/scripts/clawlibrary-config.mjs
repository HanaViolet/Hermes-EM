import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const DEFAULT_CONFIG = {
  openclaw: {
    home: '',
    workspace: ''
  },
  server: {
    host: '127.0.0.1',
    port: 5173
  },
  auth: {
    password: '',
    sessionTtlHours: 12
  },
  ui: {
    defaultLocale: 'en',
    showDebugToggle: false,
    defaultDebugVisible: false,
    showInfoToggle: true,
    defaultInfoPanelVisible: true,
    showThemeToggle: false
  },
  actor: {
    defaultVariantId: 'capy-claw-emoji'
  },
  telemetry: {
    pollMs: 2500
  }
};

function parseEnvFile(targetPath) {
  try {
    const raw = fs.readFileSync(targetPath, 'utf8');
    const result = {};
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }
      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex === -1) {
        continue;
      }
      const key = trimmed.slice(0, separatorIndex).trim();
      let value = trimmed.slice(separatorIndex + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      result[key] = value;
    }
    return result;
  } catch {
    return {};
  }
}

function mergeConfig(base, extra) {
  return {
    ...base,
    ...extra,
    openclaw: {
      ...base.openclaw,
      ...(extra.openclaw || {})
    },
    server: {
      ...base.server,
      ...(extra.server || {})
    },
    auth: {
      ...base.auth,
      ...(extra.auth || {})
    },
    ui: {
      ...base.ui,
      ...(extra.ui || {})
    },
    actor: {
      ...base.actor,
      ...(extra.actor || {})
    },
    telemetry: {
      ...base.telemetry,
      ...(extra.telemetry || {})
    }
  };
}

export function loadClawLibraryConfig() {
  const configPath = path.join(ROOT, 'clawlibrary.config.json');
  let fileConfig = {};
  try {
    fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    fileConfig = {};
  }

  const envFromFiles = {
    ...parseEnvFile(path.join(ROOT, '.env')),
    ...parseEnvFile(path.join(ROOT, '.env.local'))
  };

  const env = {
    ...envFromFiles,
    ...process.env
  };

  const merged = mergeConfig(DEFAULT_CONFIG, fileConfig);
  const openclawHome = env.OPENCLAW_HOME || merged.openclaw.home || path.join(os.homedir(), '.openclaw');
  const openclawWorkspace = env.OPENCLAW_WORKSPACE || merged.openclaw.workspace || path.join(openclawHome, 'workspace');

  return {
    ...merged,
    openclaw: {
      home: openclawHome,
      workspace: openclawWorkspace
    },
    server: {
      ...merged.server,
      host: String(env.CLAWLIBRARY_SERVER_HOST || merged.server.host || '127.0.0.1'),
      port: Number(env.CLAWLIBRARY_SERVER_PORT || merged.server.port || 5173)
    },
    auth: {
      ...merged.auth,
      password: String(env.CLAWLIBRARY_ACCESS_PASSWORD || merged.auth.password || ''),
      sessionTtlHours: Math.max(1, Number(env.CLAWLIBRARY_SESSION_TTL_HOURS || merged.auth.sessionTtlHours || 12))
    }
  };
}

export const clawlibraryConfig = loadClawLibraryConfig();

export function isLocalOnlyHost(rawHost) {
  const host = String(rawHost ?? '').trim().toLowerCase();
  return host === ''
    || host === 'localhost'
    || host === '127.0.0.1'
    || host === '::1'
    || host === '[::1]';
}
