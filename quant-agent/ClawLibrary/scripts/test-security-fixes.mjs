import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const READY_MARKER = 'Local:';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function createFixture() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'clawlibrary-security-'));
  const openclawHome = path.join(tempRoot, 'openclaw-home');
  const workspaceRoot = path.join(tempRoot, 'workspace');
  const outsideFile = path.join(tempRoot, 'outside.txt');
  await fs.mkdir(openclawHome, { recursive: true });
  await fs.mkdir(workspaceRoot, { recursive: true });
  await fs.writeFile(path.join(workspaceRoot, 'allowed.txt'), 'workspace-safe\n');
  await fs.writeFile(path.join(openclawHome, 'internal.txt'), 'openclaw-safe\n');
  await fs.writeFile(outsideFile, 'outside-root\n');
  await fs.symlink(outsideFile, path.join(workspaceRoot, 'symlink-outside.txt'));
  return { tempRoot, openclawHome, workspaceRoot, outsideFile };
}

function startDevServer(envOverrides, { stdinText, closeStdin = false } = {}) {
  const child = spawn(npmCmd, ['run', 'dev'], {
    cwd: root,
    env: {
      ...process.env,
      ...envOverrides
    },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let output = '';
  child.stdout.on('data', (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    output += chunk.toString();
  });

  if (typeof stdinText === 'string') {
    child.stdin.write(stdinText);
    child.stdin.end();
  } else if (closeStdin) {
    child.stdin.end();
  }

  const stop = async () => {
    if (child.exitCode !== null) {
      return;
    }
    child.kill('SIGTERM');
    await Promise.race([
      new Promise((resolve) => child.once('exit', resolve)),
      delay(5_000).then(() => {
        if (child.exitCode === null) {
          child.kill('SIGKILL');
        }
      })
    ]);
  };

  return {
    child,
    stop,
    getOutput: () => output
  };
}

async function waitForReady(server, timeoutMs = 20_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (server.getOutput().includes(READY_MARKER)) {
      return;
    }
    if (server.child.exitCode !== null) {
      throw new Error(`Dev server exited early.\n${server.getOutput()}`);
    }
    await delay(150);
  }
  throw new Error(`Timed out waiting for dev server readiness.\n${server.getOutput()}`);
}

async function waitForExit(server, timeoutMs = 15_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (server.child.exitCode !== null) {
      return server.child.exitCode;
    }
    await delay(150);
  }
  throw new Error(`Timed out waiting for dev server exit.\n${server.getOutput()}`);
}

async function verifyProtectedAccess(baseUrl, password) {
  const pageResponse = await fetch(`${baseUrl}/`, { redirect: 'manual' });
  assert(pageResponse.status === 303, `Expected unauthenticated page request to redirect, got ${pageResponse.status}`);
  assert(pageResponse.headers.get('location')?.startsWith('/__clawlibrary/login') === true, 'Expected redirect to login page');

  const unauthenticatedApi = await fetch(`${baseUrl}/api/openclaw/file?path=workspace/allowed.txt`, { redirect: 'manual' });
  assert(unauthenticatedApi.status === 401, `Expected unauthenticated API request to return 401, got ${unauthenticatedApi.status}`);

  const loginResponse = await fetch(`${baseUrl}/__clawlibrary/login`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      password,
      redirectTo: '/'
    })
  });
  assert(loginResponse.status === 303, `Expected successful login redirect, got ${loginResponse.status}`);

  const sessionCookie = loginResponse.headers.get('set-cookie');
  assert(sessionCookie?.includes('clawlibrary_access=') === true, 'Expected login to set access cookie');
  const cookieHeader = sessionCookie.split(';', 1)[0];

  const authedPage = await fetch(`${baseUrl}/`, {
    headers: {
      Cookie: cookieHeader
    }
  });
  assert(authedPage.status === 200, `Expected authenticated page request to succeed, got ${authedPage.status}`);

  const authedFile = await fetch(`${baseUrl}/api/openclaw/file?path=workspace/allowed.txt`, {
    headers: {
      Cookie: cookieHeader
    }
  });
  assert(authedFile.status === 200, `Expected authenticated file request to succeed, got ${authedFile.status}`);
  assert((await authedFile.text()) === 'workspace-safe\n', 'Authenticated file content mismatch');
}

async function runLocalOnlyChecks(fixture) {
  const port = '5186';
  const server = startDevServer({
    OPENCLAW_HOME: fixture.openclawHome,
    OPENCLAW_WORKSPACE: fixture.workspaceRoot,
    CLAWLIBRARY_SERVER_HOST: '127.0.0.1',
    CLAWLIBRARY_SERVER_PORT: port
  });

  try {
    await waitForReady(server);
    const baseUrl = `http://127.0.0.1:${port}`;

    const allowedResponse = await fetch(`${baseUrl}/api/openclaw/file?path=workspace/allowed.txt`);
    assert(allowedResponse.status === 200, `Expected allowed workspace file to be readable, got ${allowedResponse.status}`);
    assert((await allowedResponse.text()) === 'workspace-safe\n', 'Workspace file content mismatch');

    const openclawResponse = await fetch(`${baseUrl}/api/openclaw/file?path=.openclaw/internal.txt`);
    assert(openclawResponse.status === 200, `Expected .openclaw file to be readable, got ${openclawResponse.status}`);
    assert((await openclawResponse.text()) === 'openclaw-safe\n', '.openclaw file content mismatch');

    const traversalResponse = await fetch(`${baseUrl}/api/openclaw/file?path=workspace/../outside.txt`);
    assert(traversalResponse.status === 403, `Expected traversal to be blocked with 403, got ${traversalResponse.status}`);

    const symlinkResponse = await fetch(`${baseUrl}/api/openclaw/file?path=workspace/symlink-outside.txt`);
    assert(symlinkResponse.status === 403, `Expected symlink escape to be blocked with 403, got ${symlinkResponse.status}`);
  } finally {
    await server.stop();
  }
}

async function runExternalHostPromptedPasswordCheck(fixture) {
  const port = '5187';
  const password = 'stdin-secret';
  const server = startDevServer({
    OPENCLAW_HOME: fixture.openclawHome,
    OPENCLAW_WORKSPACE: fixture.workspaceRoot,
    CLAWLIBRARY_SERVER_HOST: '0.0.0.0',
    CLAWLIBRARY_SERVER_PORT: port
  }, {
    stdinText: `${password}\n`
  });

  try {
    await waitForReady(server);
    assert(server.getOutput().includes('Enter access password'), 'Expected LAN startup to prompt for a password');
    const baseUrl = `http://127.0.0.1:${port}`;
    await verifyProtectedAccess(baseUrl, password);
  } finally {
    await server.stop();
  }
}

async function runExternalHostAuthChecks(fixture) {
  const port = '5188';
  const password = 'swordfish';
  const server = startDevServer({
    OPENCLAW_HOME: fixture.openclawHome,
    OPENCLAW_WORKSPACE: fixture.workspaceRoot,
    CLAWLIBRARY_SERVER_HOST: '0.0.0.0',
    CLAWLIBRARY_SERVER_PORT: port,
    CLAWLIBRARY_ACCESS_PASSWORD: password
  });

  try {
    await waitForReady(server);
    const baseUrl = `http://127.0.0.1:${port}`;
    await verifyProtectedAccess(baseUrl, password);
  } finally {
    await server.stop();
  }
}

const fixture = await createFixture();

try {
  await runLocalOnlyChecks(fixture);
  await runExternalHostPromptedPasswordCheck(fixture);
  await runExternalHostAuthChecks(fixture);
  console.log('Security fixes verified.');
} finally {
  await fs.rm(fixture.tempRoot, { recursive: true, force: true });
}
