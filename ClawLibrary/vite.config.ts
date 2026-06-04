import type { Connect } from 'vite';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { defineConfig } from 'vite';
import { execFile } from 'node:child_process';
import { clawlibraryConfig, isLocalOnlyHost } from './scripts/clawlibrary-config.mjs';
import { createOpenClawSnapshot, findSnapshotResource, resolveOpenClawPath, resolveSafeOpenClawPath } from './scripts/openclaw-telemetry.mjs';

const TEXT_PREVIEW_LIMIT_BYTES = 180 * 1024;
const LIVE_OVERVIEW_CACHE_TTL_MS = 20 * 1000;
const LIVE_DETAIL_CACHE_TTL_MS = 5 * 60 * 1000;
const LIVE_OVERVIEW_CACHE_PATH = path.join(
  clawlibraryConfig.openclaw.home,
  'cache',
  'clawlibrary-live-overview.json'
);
const LIVE_DETAIL_CACHE_ROOT = path.join(
  clawlibraryConfig.openclaw.home,
  'cache',
  'clawlibrary-resource-details'
);
const TAIL_PREVIEW_EXTENSIONS = new Set(['.txt', '.log', '.jsonl']);
const ACCESS_COOKIE_NAME = 'clawlibrary_access';
const ACCESS_LOGIN_PATH = '/__clawlibrary/login';
const ACCESS_LOGOUT_PATH = '/__clawlibrary/logout';
const IMAGE_CONTENT_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml'
};
const TEXT_CONTENT_TYPES: Record<string, string> = {
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.log': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jsonl': 'application/x-ndjson; charset=utf-8',
  '.yaml': 'application/yaml; charset=utf-8',
  '.yml': 'application/yaml; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.toml': 'text/plain; charset=utf-8',
  '.ini': 'text/plain; charset=utf-8',
  '.cfg': 'text/plain; charset=utf-8',
  '.conf': 'text/plain; charset=utf-8',
  '.py': 'text/plain; charset=utf-8',
  '.js': 'text/plain; charset=utf-8',
  '.mjs': 'text/plain; charset=utf-8',
  '.cjs': 'text/plain; charset=utf-8',
  '.ts': 'text/plain; charset=utf-8',
  '.tsx': 'text/plain; charset=utf-8',
  '.jsx': 'text/plain; charset=utf-8',
  '.sh': 'text/plain; charset=utf-8',
  '.bash': 'text/plain; charset=utf-8',
  '.zsh': 'text/plain; charset=utf-8',
  '.css': 'text/plain; charset=utf-8',
  '.html': 'text/plain; charset=utf-8',
  '.xml': 'text/plain; charset=utf-8',
  '.sql': 'text/plain; charset=utf-8'
};

type PreviewKind = 'markdown' | 'json' | 'text';
type PreviewReadMode = 'full' | 'head' | 'tail';
type CachedSnapshot = Awaited<ReturnType<typeof createOpenClawSnapshot>>;
type AccessRuntime = {
  password: string;
  sessionTtlMs: number;
  secret: string;
  source: 'configured' | 'prompt';
};

let cachedLiveOverview: CachedSnapshot | null = null;
let cachedLiveOverviewLoaded = false;
let liveOverviewRefreshPromise: Promise<CachedSnapshot> | null = null;
const cachedLiveDetailByKey = new Map<string, CachedSnapshot>();
const cachedLiveDetailLoadedKeys = new Set<string>();
const liveDetailRefreshPromisesByKey = new Map<string, Promise<CachedSnapshot>>();

function hostRequiresAccessAuth(hostValue: string | boolean | undefined): boolean {
  if (hostValue === true) {
    return true;
  }
  return !isLocalOnlyHost(hostValue);
}

function accessHostLabel(hostValue: string | boolean | undefined): string {
  return typeof hostValue === 'string' && hostValue ? hostValue : String(hostValue || clawlibraryConfig.server.host);
}

function buildAccessRuntime(password: string, source: AccessRuntime['source']): AccessRuntime {
  const normalizedPassword = String(password || '').trim();
  return {
    password: normalizedPassword,
    sessionTtlMs: clawlibraryConfig.auth.sessionTtlHours * 60 * 60 * 1000,
    secret: createHash('sha256')
      .update(`${clawlibraryConfig.openclaw.home}|${clawlibraryConfig.openclaw.workspace}|${clawlibraryConfig.server.port}|${normalizedPassword}`)
      .digest('hex'),
    source
  };
}

async function promptForHiddenPassword(promptText: string): Promise<string> {
  return await new Promise((resolve, reject) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    let password = '';
    let finished = false;

    const cleanup = () => {
      stdin.off('data', handleData);
      stdin.off('error', handleError);
      if (stdin.isTTY) {
        stdin.setRawMode(false);
      }
      stdin.pause();
      stdout.write('\n');
    };

    const finish = (handler: () => void) => {
      if (finished) {
        return;
      }
      finished = true;
      cleanup();
      handler();
    };

    const handleError = (error: Error) => finish(() => reject(error));
    const handleData = (chunk: Buffer | string) => {
      const text = typeof chunk === 'string' ? chunk : chunk.toString('utf8');
      for (const char of text) {
        if (char === '\r' || char === '\n') {
          finish(() => resolve(password.trim()));
          return;
        }
        if (char === '\u0003') {
          finish(() => reject(new Error('Access password prompt cancelled.')));
          return;
        }
        if (char === '\u0008' || char === '\u007f') {
          password = password.slice(0, -1);
          continue;
        }
        if (char >= ' ') {
          password += char;
        }
      }
    };

    stdout.write(promptText);
    stdin.resume();
    stdin.on('data', handleData);
    stdin.on('error', handleError);
    if (stdin.isTTY) {
      stdin.setRawMode(true);
    }
  });
}

async function promptForPipedPassword(promptText: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    const answer = await Promise.race([
      rl.question(`${promptText}(stdin visible) `),
      new Promise<string>((_resolve, reject) => {
        setTimeout(() => reject(new Error('Timed out waiting for access password on stdin. Set CLAWLIBRARY_ACCESS_PASSWORD or provide a password on stdin.')), 5000);
      })
    ]);
    return String(answer || '').trim();
  } finally {
    rl.close();
  }
}

async function resolveAccessRuntime(hostValue: string | boolean | undefined): Promise<AccessRuntime> {
  const configuredPassword = String(clawlibraryConfig.auth.password || '').trim();
  if (!hostRequiresAccessAuth(hostValue)) {
    return buildAccessRuntime(configuredPassword, 'configured');
  }

  if (configuredPassword) {
    return buildAccessRuntime(configuredPassword, 'configured');
  }

  const promptText = `ClawLibrary LAN access on ${accessHostLabel(hostValue)} requires a password for this run.\nEnter access password: `;
  const promptedPassword = process.stdin.isTTY && process.stdout.isTTY
    ? await promptForHiddenPassword(promptText)
    : await promptForPipedPassword(promptText);
  if (!promptedPassword) {
    throw new Error('No access password provided for LAN startup.');
  }
  if (process.stdout.isTTY) {
    process.stdout.write('ClawLibrary LAN access password set for this process only.\n');
  }
  return buildAccessRuntime(promptedPassword, 'prompt');
}

function parseCookies(rawCookieHeader: string | undefined) {
  return String(rawCookieHeader || '')
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, entry) => {
      const separatorIndex = entry.indexOf('=');
      if (separatorIndex === -1) {
        return acc;
      }
      try {
        acc[entry.slice(0, separatorIndex)] = decodeURIComponent(entry.slice(separatorIndex + 1));
      } catch {
        acc[entry.slice(0, separatorIndex)] = entry.slice(separatorIndex + 1);
      }
      return acc;
    }, {});
}

function createAccessSignature(expiresAtMs: number, accessRuntime: AccessRuntime): string {
  return createHmac('sha256', accessRuntime.secret).update(String(expiresAtMs)).digest('hex');
}

function hasValidAccessSession(req: Connect.IncomingMessage, accessRuntime: AccessRuntime): boolean {
  const rawToken = parseCookies(req.headers.cookie)[ACCESS_COOKIE_NAME];
  if (!rawToken) {
    return false;
  }

  const [expiresAtRaw, signature] = rawToken.split('.', 2);
  const expiresAtMs = Number(expiresAtRaw || 0);
  if (!expiresAtMs || expiresAtMs <= Date.now() || !signature) {
    return false;
  }

  const expected = createAccessSignature(expiresAtMs, accessRuntime);
  const left = Buffer.from(signature, 'utf8');
  const right = Buffer.from(expected, 'utf8');
  return left.length === right.length && timingSafeEqual(left, right);
}

function serializeAccessSessionCookie(accessRuntime: AccessRuntime) {
  const expiresAtMs = Date.now() + accessRuntime.sessionTtlMs;
  const token = `${expiresAtMs}.${createAccessSignature(expiresAtMs, accessRuntime)}`;
  const expiresAt = new Date(expiresAtMs).toUTCString();
  return `${ACCESS_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Expires=${expiresAt}`;
}

function clearAccessSessionCookie() {
  return `${ACCESS_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

function sanitizeRedirectTarget(rawValue: string | null | undefined): string {
  const target = String(rawValue || '/').trim();
  if (!target.startsWith('/') || target.startsWith('//') || target.startsWith(ACCESS_LOGIN_PATH)) {
    return '/';
  }
  return target || '/';
}

function escapeHtml(rawValue: string): string {
  return rawValue
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function writeJsonResponse(res: Connect.ServerResponse, statusCode: number, payload: unknown) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

async function readRequestBody(req: Connect.IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

function renderAccessLoginPage({ hostValue, error = '', redirectTo = '/' }: {
  hostValue: string | boolean | undefined;
  error?: string;
  redirectTo?: string;
}) {
  const hostLabel = accessHostLabel(hostValue);
  const heading = 'ClawLibrary Access';
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${heading}</title>
    <style>
      :root {
        color-scheme: light;
        font-family: "SF Mono", Menlo, Monaco, monospace;
        background: #f4efe5;
        color: #1f1d19;
      }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background:
          radial-gradient(circle at top, rgba(186, 152, 109, 0.25), transparent 32%),
          linear-gradient(180deg, #f8f4ec 0%, #efe5d3 100%);
      }
      .panel {
        width: min(420px, calc(100vw - 32px));
        padding: 28px;
        border: 1px solid rgba(78, 61, 36, 0.18);
        border-radius: 18px;
        background: rgba(255, 251, 243, 0.96);
        box-shadow: 0 22px 64px rgba(73, 49, 13, 0.12);
      }
      h1 {
        margin: 0 0 10px;
        font-size: 24px;
      }
      p {
        margin: 0 0 16px;
        line-height: 1.5;
      }
      label {
        display: block;
        margin-bottom: 8px;
        font-size: 13px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #6a5a42;
      }
      input {
        width: 100%;
        box-sizing: border-box;
        padding: 12px 14px;
        border: 1px solid rgba(78, 61, 36, 0.22);
        border-radius: 12px;
        font: inherit;
        background: #fffdfa;
      }
      button {
        margin-top: 16px;
        width: 100%;
        padding: 12px 14px;
        border: 0;
        border-radius: 999px;
        font: inherit;
        background: #2f5f4f;
        color: #f8f4ec;
        cursor: pointer;
      }
      .error {
        margin-bottom: 14px;
        padding: 10px 12px;
        border-radius: 12px;
        background: rgba(173, 57, 43, 0.09);
        color: #8b2318;
      }
      .hint {
        margin-top: 18px;
        font-size: 12px;
        color: #6a5a42;
      }
    </style>
  </head>
  <body>
    <main class="panel">
      <h1>${heading}</h1>
      <p>External access is protected on <strong>${escapeHtml(hostLabel)}</strong>. Enter the configured password to continue.</p>
      ${error ? `<div class="error">${escapeHtml(error)}</div>` : ''}
      <form method="post" action="${ACCESS_LOGIN_PATH}">
        <input type="hidden" name="redirectTo" value="${escapeHtml(redirectTo)}" />
        <label for="password">Password</label>
        <input id="password" name="password" type="password" autocomplete="current-password" autofocus required />
        <button type="submit">Unlock</button>
      </form>
      <p class="hint">Use the password configured in <code>auth.password</code>, <code>CLAWLIBRARY_ACCESS_PASSWORD</code>, or entered at startup.</p>
    </main>
  </body>
</html>`;
}

function createAccessMiddleware(hostValue: string | boolean | undefined, accessRuntime: AccessRuntime): Connect.NextHandleFunction {
  if (!hostRequiresAccessAuth(hostValue)) {
    return (_req, _res, next) => next();
  }

  return async (req, res, next) => {
    const requestUrl = new URL(req.url || '/', 'http://127.0.0.1');
    const pathname = requestUrl.pathname;

    if (pathname === ACCESS_LOGIN_PATH && req.method === 'GET') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end(renderAccessLoginPage({
        hostValue,
        error: requestUrl.searchParams.get('error') || '',
        redirectTo: sanitizeRedirectTarget(requestUrl.searchParams.get('redirectTo'))
      }));
      return;
    }

    if (pathname === ACCESS_LOGIN_PATH && req.method === 'POST') {
      const rawBody = await readRequestBody(req);
      const contentType = String(req.headers['content-type'] || '');
      const parsed = contentType.includes('application/json')
        ? JSON.parse(rawBody || '{}')
        : Object.fromEntries(new URLSearchParams(rawBody));
      const redirectTo = sanitizeRedirectTarget(typeof parsed.redirectTo === 'string' ? parsed.redirectTo : '/');
      const password = String(parsed.password || '');
      if (password !== accessRuntime.password) {
        res.statusCode = 303;
        res.setHeader('Location', `${ACCESS_LOGIN_PATH}?error=${encodeURIComponent('Incorrect password')}&redirectTo=${encodeURIComponent(redirectTo)}`);
        res.setHeader('Cache-Control', 'no-store');
        res.end();
        return;
      }
      res.statusCode = 303;
      res.setHeader('Set-Cookie', serializeAccessSessionCookie(accessRuntime));
      res.setHeader('Location', redirectTo);
      res.setHeader('Cache-Control', 'no-store');
      res.end();
      return;
    }

    if (pathname === ACCESS_LOGOUT_PATH && req.method === 'POST') {
      res.statusCode = 303;
      res.setHeader('Set-Cookie', clearAccessSessionCookie());
      res.setHeader('Location', `${ACCESS_LOGIN_PATH}?redirectTo=%2F`);
      res.setHeader('Cache-Control', 'no-store');
      res.end();
      return;
    }

    if (hasValidAccessSession(req, accessRuntime)) {
      next();
      return;
    }

    if (pathname.startsWith('/api/')) {
      writeJsonResponse(res, 401, { ok: false, error: 'authentication required' });
      return;
    }

    res.statusCode = 303;
    res.setHeader('Location', `${ACCESS_LOGIN_PATH}?redirectTo=${encodeURIComponent(sanitizeRedirectTarget(`${pathname}${requestUrl.search}`))}`);
    res.setHeader('Cache-Control', 'no-store');
    res.end();
  };
}

function contentTypeForPath(target: string): string {
  const ext = path.extname(target).toLowerCase();
  return IMAGE_CONTENT_TYPES[ext] || TEXT_CONTENT_TYPES[ext] || 'application/octet-stream';
}

function previewKindForPath(target: string): PreviewKind | null {
  const ext = path.extname(target).toLowerCase();
  if (ext === '.md') {
    return 'markdown';
  }
  if (ext === '.json') {
    return 'json';
  }
  if (ext in TEXT_CONTENT_TYPES) {
    return 'text';
  }
  return null;
}

async function readTextPreview(
  target: string,
  requestedMode: Exclude<PreviewReadMode, 'full'>,
  limit = TEXT_PREVIEW_LIMIT_BYTES
): Promise<{ content: string; truncated: boolean; readMode: PreviewReadMode }> {
  const handle = await fs.open(target, 'r');
  try {
    const stat = await handle.stat();
    const bytesToRead = Math.min(limit, stat.size);
    const offset = requestedMode === 'tail'
      ? Math.max(0, stat.size - bytesToRead)
      : 0;
    const buffer = Buffer.alloc(bytesToRead);
    await handle.read(buffer, 0, bytesToRead, offset);
    return {
      content: buffer.toString('utf8'),
      truncated: stat.size > limit,
      readMode: stat.size > limit ? requestedMode : 'full'
    };
  } finally {
    await handle.close();
  }
}

function formatPreviewContent(kind: PreviewKind, raw: string): string {
  if (kind === 'json') {
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  }
  return raw;
}

async function buildDirectoryPreview(target: string, rawPath: string) {
  const entries = await fs.readdir(target, { withFileTypes: true });
  const readmeEntry = entries.find((entry) => entry.isFile() && /^readme(?:\.[A-Za-z0-9_-]+)?$/i.test(entry.name));

  if (readmeEntry) {
    const readmePath = path.join(target, readmeEntry.name);
    const kind = previewKindForPath(readmePath) ?? 'text';
    const preview = await readTextPreview(readmePath, 'head');
    return {
      ok: true,
      kind,
      path: rawPath,
      contentType: contentTypeForPath(readmePath),
      content: formatPreviewContent(kind, preview.content),
      truncated: preview.truncated,
      readMode: preview.readMode
    };
  }

  const childDirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  const childFiles = entries.filter((entry) => entry.isFile()).map((entry) => entry.name).sort();
  const runtimeHints = [
    'package.json',
    'pyproject.toml',
    'requirements.txt',
    'Cargo.toml',
    'go.mod',
    'README.md',
    'README',
    'src',
    'app.py',
    'main.py'
  ].filter((name) => childFiles.includes(name) || childDirs.includes(name));

  const summary = [
    `# ${path.basename(target)}`,
    '',
    'No README found for this directory.',
    '',
    `Path: \`${rawPath}\``,
    '',
    runtimeHints.length ? `Detected project signals: ${runtimeHints.map((entry) => `\`${entry}\``).join(', ')}` : 'Detected project signals: none',
    '',
    childDirs.length ? 'Subdirectories:' : 'Subdirectories: none',
    ...(childDirs.length ? childDirs.slice(0, 8).map((entry) => `- \`${entry}/\``) : []),
    '',
    childFiles.length ? 'Files:' : 'Files: none',
    ...(childFiles.length ? childFiles.slice(0, 10).map((entry) => `- \`${entry}\``) : [])
  ].join('\n');

  return {
    ok: true,
    kind: 'markdown' as const,
    path: rawPath,
    contentType: 'text/markdown; charset=utf-8',
    content: summary,
    truncated: false,
    readMode: 'full' as const
  };
}

async function loadCachedSnapshot(cachePath: string): Promise<CachedSnapshot | null> {
  try {
    const raw = await fs.readFile(cachePath, 'utf8');
    return JSON.parse(raw) as CachedSnapshot;
  } catch {
    return null;
  }
}

async function loadCachedLiveOverview(): Promise<void> {
  if (cachedLiveOverviewLoaded) {
    return;
  }
  cachedLiveOverviewLoaded = true;
  cachedLiveOverview = await loadCachedSnapshot(LIVE_OVERVIEW_CACHE_PATH);
}

function detailCacheKeyOf(resourceId: string): string {
  return resourceId === 'gateway' ? 'gateway+task_queues' : resourceId;
}

function detailResourceIdsFor(resourceId: string): string[] {
  return resourceId === 'gateway' ? ['gateway', 'task_queues'] : [resourceId];
}

function detailCachePathOf(cacheKey: string): string {
  return path.join(LIVE_DETAIL_CACHE_ROOT, `${cacheKey}.json`);
}

async function loadCachedLiveDetail(cacheKey: string): Promise<CachedSnapshot | null> {
  if (cachedLiveDetailLoadedKeys.has(cacheKey)) {
    return cachedLiveDetailByKey.get(cacheKey) ?? null;
  }
  cachedLiveDetailLoadedKeys.add(cacheKey);
  const snapshot = await loadCachedSnapshot(detailCachePathOf(cacheKey));
  if (snapshot) {
    cachedLiveDetailByKey.set(cacheKey, snapshot);
  }
  return snapshot;
}

async function persistLiveDetail(cacheKey: string, snapshot: CachedSnapshot): Promise<void> {
  await fs.mkdir(LIVE_DETAIL_CACHE_ROOT, { recursive: true });
  await persistCachedSnapshot(detailCachePathOf(cacheKey), snapshot);
}

async function refreshLiveDetail(cacheKey: string, resourceIds: string[]): Promise<CachedSnapshot> {
  const pending = liveDetailRefreshPromisesByKey.get(cacheKey);
  if (pending) {
    return pending;
  }
  const request = createOpenClawSnapshot({
    mock: false,
    itemResourceIds: resourceIds,
    includeExcerpt: false
  })
    .then(async (snapshot) => {
      cachedLiveDetailByKey.set(cacheKey, snapshot);
      await persistLiveDetail(cacheKey, snapshot);
      return snapshot;
    })
    .finally(() => {
      liveDetailRefreshPromisesByKey.delete(cacheKey);
    });
  liveDetailRefreshPromisesByKey.set(cacheKey, request);
  return request;
}

async function getLiveDetailSnapshot(resourceId: string): Promise<CachedSnapshot> {
  const cacheKey = detailCacheKeyOf(resourceId);
  const resourceIds = detailResourceIdsFor(resourceId);
  const cached = await loadCachedLiveDetail(cacheKey);
  if (cached && cachedSnapshotAgeMs(cached) < LIVE_DETAIL_CACHE_TTL_MS) {
    return cached;
  }
  if (cached) {
    void refreshLiveDetail(cacheKey, resourceIds);
    return cached;
  }
  return refreshLiveDetail(cacheKey, resourceIds);
}

function cachedSnapshotAgeMs(snapshot: CachedSnapshot | null): number {
  if (!snapshot?.generatedAt) {
    return Number.POSITIVE_INFINITY;
  }
  const time = new Date(snapshot.generatedAt).getTime();
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : Date.now() - time;
}

async function persistCachedSnapshot(cachePath: string, snapshot: CachedSnapshot): Promise<void> {
  await fs.mkdir(path.dirname(cachePath), { recursive: true });
  await fs.writeFile(cachePath, JSON.stringify(snapshot), 'utf8');
}

async function refreshLiveOverview(): Promise<CachedSnapshot> {
  if (liveOverviewRefreshPromise) {
    return liveOverviewRefreshPromise;
  }
  liveOverviewRefreshPromise = createOpenClawSnapshot({ mock: false, includeItems: false })
    .then(async (snapshot) => {
      cachedLiveOverview = snapshot;
      await persistCachedSnapshot(LIVE_OVERVIEW_CACHE_PATH, snapshot);
      return snapshot;
    })
    .finally(() => {
      liveOverviewRefreshPromise = null;
    });
  return liveOverviewRefreshPromise;
}

async function resolveApiTargetPath(rawPath: string) {
  const requestPath = String(rawPath || '').trim();
  if (!requestPath) {
    return { target: null, statusCode: 400, error: 'invalid path' };
  }

  const candidate = resolveOpenClawPath(requestPath);
  if (!candidate) {
    return { target: null, statusCode: 400, error: 'invalid path' };
  }

  const safeTarget = await resolveSafeOpenClawPath(requestPath);
  if (safeTarget) {
    return { target: safeTarget, statusCode: 200, error: '' };
  }

  try {
    await fs.access(candidate);
    return { target: null, statusCode: 403, error: 'path escapes allowed roots' };
  } catch {
    return { target: null, statusCode: 404, error: 'path not found' };
  }
}

void loadCachedLiveOverview()
  .then(async () => {
    if (!cachedLiveOverview || cachedSnapshotAgeMs(cachedLiveOverview) >= LIVE_OVERVIEW_CACHE_TTL_MS) {
      await refreshLiveOverview();
    }
  })
  .catch(() => {
    // ignore warmup failures; middleware will retry on demand
  });

function telemetryMiddleware() {
  return async (req: Connect.IncomingMessage, res: Connect.ServerResponse, next: Connect.NextFunction) => {
    if (req.url?.startsWith('/api/openclaw/open') && req.method === 'POST') {
      try {
        const body = JSON.parse((await readRequestBody(req)) || '{}');
        const resolved = await resolveApiTargetPath(body.openPath || body.path || '');
        if (!resolved.target) {
          writeJsonResponse(res, resolved.statusCode, { ok: false, error: resolved.error });
          return;
        }
        await new Promise<void>((resolve, reject) => {
          execFile('open', [resolved.target], (error) => {
            if (error) {
              reject(error);
              return;
            }
            resolve();
          });
        });
        writeJsonResponse(res, 200, { ok: true });
      } catch (error) {
        writeJsonResponse(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
      }
      return;
    }

    if (req.url?.startsWith('/api/openclaw/file') && req.method === 'GET') {
      try {
        const requestUrl = new URL(req.url, 'http://127.0.0.1');
        const rawPath = requestUrl.searchParams.get('path') || '';
        const resolved = await resolveApiTargetPath(rawPath);
        if (!resolved.target) {
          writeJsonResponse(res, resolved.statusCode, { ok: false, error: resolved.error });
          return;
        }
        const file = await fs.readFile(resolved.target);
        res.statusCode = 200;
        res.setHeader('Content-Type', contentTypeForPath(resolved.target));
        res.setHeader('Cache-Control', 'no-store');
        res.end(file);
      } catch (error) {
        writeJsonResponse(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
      }
      return;
    }

    if (req.url?.startsWith('/api/openclaw/preview') && req.method === 'GET') {
      try {
        const requestUrl = new URL(req.url, 'http://127.0.0.1');
        const rawPath = requestUrl.searchParams.get('path') || '';
        const resolved = await resolveApiTargetPath(rawPath);
        if (!resolved.target) {
          writeJsonResponse(res, resolved.statusCode, { ok: false, error: resolved.error });
          return;
        }

        const stat = await fs.stat(resolved.target);
        if (stat.isDirectory()) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store');
          res.end(JSON.stringify(await buildDirectoryPreview(resolved.target, rawPath)));
          return;
        }

        const ext = path.extname(resolved.target).toLowerCase();
        const kind = previewKindForPath(resolved.target) ?? 'text';
        const requestedMode = TAIL_PREVIEW_EXTENSIONS.has(ext) ? 'tail' : 'head';
        const preview = await readTextPreview(resolved.target, requestedMode);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify({
          ok: true,
          kind,
          path: rawPath,
          contentType: contentTypeForPath(resolved.target),
          content: formatPreviewContent(kind, preview.content),
          truncated: preview.truncated,
          readMode: preview.readMode
        }));
      } catch (error) {
        writeJsonResponse(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
      }
      return;
    }

    if (req.url?.startsWith('/api/openclaw/resource') && req.method === 'GET') {
      try {
        const requestUrl = new URL(req.url, 'http://127.0.0.1');
        const wantsMock = requestUrl.searchParams.get('mock') === '1';
        const resourceId = requestUrl.searchParams.get('resourceId') || '';
        if (!resourceId) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ ok: false, error: 'missing resourceId' }));
          return;
        }

        let snapshot: CachedSnapshot;
        if (wantsMock) {
          snapshot = await createOpenClawSnapshot({
            mock: true,
            itemResourceIds: resourceId === 'gateway' ? ['gateway', 'task_queues'] : [resourceId],
            includeExcerpt: false
          });
        } else {
          snapshot = await getLiveDetailSnapshot(resourceId);
        }

        const resource = findSnapshotResource(snapshot, resourceId);
        if (!resource) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ ok: false, error: 'resource not found' }));
          return;
        }

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify({ ok: true, resource }));
      } catch (error) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }));
      }
      return;
    }

    if (req.url?.startsWith('/api/openclaw/agent-focus') && req.method === 'GET') {
      try {
        // Read all focus-*.json files from ~/.openclaw/subagents/
        const subagentsDir = path.join(clawlibraryConfig.openclaw.home, 'subagents');
        type FocusEntry = { runId: string; resourceId: string; detail?: string };
        const focuses: FocusEntry[] = [];
        try {
          const entries = await fs.readdir(subagentsDir);
          const focusFiles = entries.filter((f) => f.startsWith('focus-') && f.endsWith('.json'));
          for (const file of focusFiles) {
            try {
              const raw = await fs.readFile(path.join(subagentsDir, file), 'utf8');
              const data = JSON.parse(raw) as { resourceId?: string; detail?: string; label?: string };
              if (data.resourceId) {
                const runId = file.replace(/^focus-/, '').replace(/\.json$/, '');
                const entry: FocusEntry = { runId, resourceId: data.resourceId, detail: data.detail };
                focuses.push(entry);
                // Also register under label if present (so label-based focus files match subagent ids)
                if (data.label) {
                  focuses.push({ runId: data.label, resourceId: data.resourceId, detail: data.detail });
                }
              }
            } catch { /* skip malformed */ }
          }
        } catch { /* dir doesn't exist */ }
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify({ ok: true, focuses }));
      } catch (error) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }));
      }
      return;
    }

    if (req.url?.startsWith('/api/openclaw/processes') && req.method === 'GET') {
      try {
        // Read the exec-processes registry written by ClawBot when launching background agents
        const registryPath = path.join(clawlibraryConfig.openclaw.home, 'exec-processes.json');
        type ProcessEntry = { id: string; label: string; command: string; status: string; startedAt?: string };
        let processes: ProcessEntry[] = [];
        try {
          const raw = await fs.readFile(registryPath, 'utf8');
          const all = JSON.parse(raw) as ProcessEntry[];
          processes = all.filter((p) => p.status === 'running');
        } catch {
          // file doesn't exist — return empty list
        }
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify({ ok: true, processes }));
      } catch (error) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }));
      }
      return;
    }

    if (req.url?.startsWith('/api/openclaw/chat') && req.method === 'GET') {
      try {
        const messages = await readChatMessages();
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify({ ok: true, messages }));
      } catch (error) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }));
      }
      return;
    }

    if (!req.url?.startsWith('/api/openclaw/snapshot')) {
      next();
      return;
    }

    try {
      const requestUrl = new URL(req.url, 'http://127.0.0.1');
      const wantsMock = requestUrl.searchParams.get('mock') === '1';
      let snapshot: CachedSnapshot;
      if (wantsMock) {
        snapshot = await createOpenClawSnapshot({ mock: true, includeItems: false });
      } else {
        await loadCachedLiveOverview();
        if (cachedLiveOverview && cachedSnapshotAgeMs(cachedLiveOverview) < LIVE_OVERVIEW_CACHE_TTL_MS) {
          snapshot = cachedLiveOverview;
        } else if (cachedLiveOverview) {
          void refreshLiveOverview();
          snapshot = cachedLiveOverview;
        } else {
          snapshot = await refreshLiveOverview();
        }
      }
      // Override focus with main session auto-focus if available and recent
      let overriddenSnapshot = snapshot;
      if (!wantsMock) {
        try {
          const mainFocusPath = path.join(clawlibraryConfig.openclaw.home, 'subagents', 'focus-main.json');
          const mainFocusStat = await fs.stat(mainFocusPath).catch(() => null);
          if (mainFocusStat && (Date.now() - mainFocusStat.mtimeMs) < 90_000) {
            const mainFocusRaw = await fs.readFile(mainFocusPath, 'utf8');
            const mainFocus = JSON.parse(mainFocusRaw) as { resourceId?: string; detail?: string; _isMain?: boolean };
            if (mainFocus._isMain && mainFocus.detail) {
              overriddenSnapshot = {
                ...snapshot,
                focus: {
                  ...snapshot.focus,
                  resourceId: mainFocus.resourceId || snapshot.focus.resourceId,
                  detail: mainFocus.detail,
                  reason: 'main session active'
                }
              };
            }
          }
        } catch { /* best-effort: fall through to original snapshot */ }
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify(wantsMock ? snapshot : {
        ...overriddenSnapshot,
        resources: overriddenSnapshot.resources.map(({ items, ...resource }) => resource)
      }));
    } catch (error) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
    }
  };
}

// ── Live Chat endpoint ──────────────────────────────────────────────────────

const SESSIONS_DIR = path.join(clawlibraryConfig.openclaw.home, 'agents', 'main', 'sessions');
const CHAT_MAX_MESSAGES = 30;

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  senderName: string;
  timestamp: string;
}

function extractSenderName(rawText: string): string {
  // Parse the Sender (untrusted metadata) block for "name" field
  const match = rawText.match(/Sender \(untrusted metadata\)[^`]*```json\s*(\{[^`]+\})/);
  if (match) {
    try {
      const parsed = JSON.parse(match[1]) as Record<string, string>;
      const full = parsed.name || parsed.label || '';
      // Truncate to first name only (up to first space)
      const firstName = full.split(' ')[0];
      if (firstName) return firstName;
    } catch { /* ignore */ }
  }
  return 'User';
}

function cleanUserText(rawText: string): string {
  // Remove Conversation info block
  let text = rawText.replace(/Conversation info \(untrusted metadata\)[^\n]*\n```json[\s\S]*?```\n?/g, '');
  // Remove Sender block
  text = text.replace(/Sender \(untrusted metadata\)[^\n]*\n```json[\s\S]*?```\n?/g, '');
  // Remove Replied message block
  text = text.replace(/Replied message \(untrusted, for context\)[^\n]*\n```json[\s\S]*?```\n?/g, '');
  // Remove To send an image back instructions
  text = text.replace(/To send an image back[^\n]*\n?/g, '');
  // Remove System: lines
  text = text.replace(/^System:.*$/gm, '');
  // Remove [Queued messages while agent was busy] wrapper
  text = text.replace(/\[Queued messages while agent was busy\][\s\S]*?---\s*Queued #\d+\s*/g, '');
  // Remove [media attached: ...] lines
  text = text.replace(/\[media attached:[^\]]*\]\s*/g, '');
  // Mark <media:audio> tags as placeholder (will be replaced by transcription)
  text = text.replace(/<media:[^>]+>/g, '[audio]');
  // If only media attachment line was present, mark as audio too
  if (!text && rawText.includes('media attached')) text = '[audio]';
  return text.trim();
}

function extractSonioxTranscription(toolResultText: string): string | null {
  // Try each { ... } block by finding balanced braces
  let i = 0;
  while (i < toolResultText.length) {
    const start = toolResultText.indexOf('{', i);
    if (start === -1) break;
    let depth = 0;
    let end = -1;
    for (let k = start; k < toolResultText.length; k++) {
      if (toolResultText[k] === '{') depth++;
      else if (toolResultText[k] === '}') {
        depth--;
        if (depth === 0) { end = k; break; }
      }
    }
    if (end === -1) break;
    const jsonStr = toolResultText.slice(start, end + 1);
    try {
      const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
      // Soniox transcript response has "text" (string) + "tokens" (array) + "id"
      if (
        typeof parsed.text === 'string' &&
        parsed.text.trim().length > 5 &&
        (Array.isArray(parsed.tokens) || typeof parsed.id === 'string')
      ) {
        return parsed.text.trim();
      }
    } catch { /* skip */ }
    i = end + 1;
  }
  return null;
}

async function readChatMessages(): Promise<ChatMessage[]> {
  let files: string[] = [];
  try {
    const entries = await fs.readdir(SESSIONS_DIR);
    files = entries
      .filter((f) => f.endsWith('.jsonl') && !f.includes('.reset') && !f.includes('.deleted'))
      .map((f) => path.join(SESSIONS_DIR, f));
  } catch { return []; }

  if (files.length === 0) return [];

  // Find most recently modified session file
  const stats = await Promise.all(files.map(async (f) => ({ f, mtime: (await fs.stat(f)).mtimeMs })));
  stats.sort((a, b) => b.mtime - a.mtime);
  const activeFile = stats[0].f;

  const raw = await fs.readFile(activeFile, 'utf8');
  const lines = raw.split('\n').filter(Boolean);

  // Parse all entries first so we can look ahead for transcriptions
  type Entry = {
    timestamp?: string;
    message?: { role?: string; content?: unknown; toolCallId?: string };
  };
  const entries: Entry[] = [];
  for (const line of lines) {
    try { entries.push(JSON.parse(line) as Entry); } catch { /* skip */ }
  }

  const messages: ChatMessage[] = [];

  for (let i = 0; i < entries.length; i++) {
    const obj = entries[i];
    const msg = obj.message;
    if (!msg) continue;
    const role = msg.role;
    if (role !== 'user' && role !== 'assistant') continue;

    let rawText = '';
    const content = msg.content;
    if (typeof content === 'string') {
      rawText = content;
    } else if (Array.isArray(content)) {
      for (const c of content as Array<{ type?: string; text?: string }>) {
        if (c.type === 'text' && c.text) { rawText = c.text; break; }
      }
    }
    if (!rawText.trim()) continue;

    if (role === 'user') {
      const senderName = extractSenderName(rawText);
      let text = cleanUserText(rawText);
      if (!text) continue;

      // If message had audio, look ahead for Soniox transcription in toolResults
      if (text.includes('[audio]')) {
        for (let j = i + 1; j < Math.min(i + 25, entries.length); j++) {
          const nextMsg = entries[j].message;
          if (!nextMsg) continue;
          // Stop if we hit another user message
          if (nextMsg.role === 'user') break;

          if (nextMsg.role === 'toolResult') {
            const nc = nextMsg.content;
            const toolTexts: string[] = [];
            if (Array.isArray(nc)) {
              for (const c of nc as Array<{ type?: string; text?: string }>) {
                if (c.type === 'text' && c.text) toolTexts.push(c.text);
              }
            } else if (typeof nc === 'string') {
              toolTexts.push(nc);
            }

            for (const t of toolTexts) {
              // Strategy 1: structured Soniox JSON with "text" + "tokens"/"id"
              const structured = extractSonioxTranscription(t);
              if (structured) {
                text = text.replace('[audio]', `🎙 "${structured}"`);
                break;
              }
              // Strategy 2: plain text toolResult that looks like a transcription
              // (non-empty, no shell output markers, reasonable length, not a path/error)
              const trimmed = t.trim();
              if (
                trimmed.length > 10 &&
                trimmed.length < 1000 &&
                !trimmed.startsWith('{') &&
                !trimmed.startsWith('/') &&
                !trimmed.includes('FILE_ID') &&
                !trimmed.includes('TX_ID') &&
                !trimmed.includes('Successfully') &&
                !trimmed.includes('\n') // single line = likely transcription
              ) {
                text = text.replace('[audio]', `🎙 "${trimmed}"`);
                break;
              }
            }
            if (!text.includes('[audio]')) break;
          }
        }
      }

      messages.push({ role: 'user', text, senderName, timestamp: obj.timestamp ?? '' });
    } else {
      const text = rawText.trim();
      if (!text) continue;
      messages.push({ role: 'assistant', text, senderName: 'ClawBot', timestamp: obj.timestamp ?? '' });
    }
  }

  // Return last N messages
  return messages.slice(-CHAT_MAX_MESSAGES);
}

export default defineConfig(async ({ command }) => {
  const accessRuntime = command === 'serve'
    ? await resolveAccessRuntime(clawlibraryConfig.server.host)
    : buildAccessRuntime(String(clawlibraryConfig.auth.password || ''), 'configured');

  return {
    plugins: [
      {
        name: 'trading-telemetry-bridge',
        configureServer(server) {
          server.middlewares.use(createAccessMiddleware(server.config.server.host, accessRuntime));
        },
        configurePreviewServer(server) {
          server.middlewares.use(createAccessMiddleware(server.config.preview.host, accessRuntime));
        }
      }
    ],
    build: {
      emptyOutDir: false
    },
    server: {
      host: clawlibraryConfig.server.host,
      port: clawlibraryConfig.server.port,
      strictPort: true,
      proxy: {
        '/api/trading': {
          target: 'http://127.0.0.1:5000',
          changeOrigin: true,
        },
        '/api/openclaw': {
          target: 'http://127.0.0.1:5000',
          changeOrigin: true,
        }
      }
    },
    preview: {
      host: clawlibraryConfig.server.host
    }
  };
});
