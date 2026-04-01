import { existsSync, readdirSync, statSync, watch } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureProjectDependencies } from './runtime-deps.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const serverDir = path.join(rootDir, 'server');
const serverEntry = path.join(serverDir, 'index.mjs');
const viteBin = path.join(rootDir, 'node_modules', 'vite', 'bin', 'vite.js');
const serverOnlyMode = process.argv.includes('--server-only');
const serverEnv = {
  ...process.env,
  NODE_ENV: 'development',
  PORT: '3001',
};
const watchExtensions = new Set(['.cjs', '.js', '.json', '.mjs']);
const serverWatchFiles = readdirSync(serverDir, { withFileTypes: true })
  .filter((entry) => entry.isFile() && watchExtensions.has(path.extname(entry.name)))
  .map((entry) => path.join(serverDir, entry.name));
const envWatchFiles = ['.env', '.env.local', '.env.development', '.env.development.local']
  .map((file) => path.join(rootDir, file))
  .filter((filePath) => existsSync(filePath));

await ensureProjectDependencies(rootDir, {
  serverOnly: serverOnlyMode,
  logger: console,
});

function spawnProcess(command, args, env = process.env) {
  return spawn(command, args, {
    cwd: rootDir,
    env,
    stdio: 'inherit',
  });
}

if (!serverOnlyMode && !existsSync(viteBin)) {
  throw new Error('Vite não foi encontrado em node_modules. Execute "npm install" antes de iniciar o app.');
}

let shuttingDown = false;
let restartingServer = false;
let restartTimer = null;
let serverProcess = null;
let serverRestartCooldownUntil = 0;
const watchers = [];
const clientProcess = serverOnlyMode
  ? null
  : spawnProcess(process.execPath, [viteBin, '--port=3000', '--host=0.0.0.0']);

function startServer() {
  if (shuttingDown) {
    return;
  }

  serverProcess = spawnProcess(process.execPath, [serverEntry], serverEnv);
  serverProcess.on('exit', (code, signal) => {
    const exitedDuringRestart = restartingServer;
    serverProcess = null;

    if (shuttingDown) {
      return;
    }

    if (exitedDuringRestart) {
      restartingServer = false;
      startServer();
      return;
    }

    if (signal === 'SIGINT' || signal === 'SIGTERM') {
      return;
    }

    console.error(`[dev] O servidor foi encerrado${code !== null ? ` com código ${code}` : ''}. Altere um arquivo em /server para iniciá-lo novamente.`);
  });
}

function restartServer(reason) {
  if (shuttingDown || restartingServer) {
    return;
  }

  serverRestartCooldownUntil = Date.now() + 1500;
  console.log(`[dev] Reiniciando servidor (${reason})...`);

  if (!serverProcess || serverProcess.killed || serverProcess.exitCode !== null) {
    startServer();
    return;
  }

  restartingServer = true;
  serverProcess.kill('SIGTERM');
}

function scheduleServerRestart(reason) {
  if (shuttingDown) {
    return;
  }

  if (Date.now() < serverRestartCooldownUntil) {
    return;
  }

  if (restartTimer) {
    clearTimeout(restartTimer);
  }

  restartTimer = setTimeout(() => {
    restartTimer = null;
    restartServer(reason);
  }, 120);
}

function watchPath(filePath, onChange) {
  let lastKnownMtimeMs = existsSync(filePath) ? statSync(filePath).mtimeMs : 0;
  const watcher = watch(filePath, (_eventType, filename) => {
    try {
      const nextMtimeMs = statSync(filePath).mtimeMs;

      if (nextMtimeMs === lastKnownMtimeMs) {
        return;
      }

      lastKnownMtimeMs = nextMtimeMs;
    } catch {
      lastKnownMtimeMs = Date.now();
    }

    onChange(filename);
  });

  watcher.on('error', (error) => {
    if (!shuttingDown) {
      console.error(`[dev] Falha ao observar ${filePath}: ${error.message}`);
    }
  });

  watchers.push(watcher);
}

function setupWatchers() {
  for (const serverFile of serverWatchFiles) {
    watchPath(serverFile, () => {
      scheduleServerRestart(`mudanca detectada em server/${path.basename(serverFile)}`);
    });
  }

  for (const envFile of envWatchFiles) {
    watchPath(envFile, () => {
      scheduleServerRestart(`mudanca detectada em ${path.basename(envFile)}`);
    });
  }
}

function stopAll(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  if (restartTimer) {
    clearTimeout(restartTimer);
    restartTimer = null;
  }

  for (const watcher of watchers) {
    watcher.close();
  }

  for (const child of [serverProcess, clientProcess]) {
    if (child && !child.killed) {
      child.kill('SIGTERM');
    }
  }

  setTimeout(() => {
    process.exit(exitCode);
  }, 150);
}

clientProcess?.on('exit', (code) => {
  if (shuttingDown) {
    return;
  }

  stopAll(code ?? 0);
});

setupWatchers();
startServer();

process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));
