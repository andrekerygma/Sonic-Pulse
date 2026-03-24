import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const viteBin = path.join(rootDir, 'node_modules', 'vite', 'bin', 'vite.js');

function spawnProcess(command, args, env = process.env) {
  return spawn(command, args, {
    cwd: rootDir,
    env,
    stdio: 'inherit',
  });
}

if (!existsSync(viteBin)) {
  throw new Error('Vite não foi encontrado em node_modules. Execute "npm install" antes de iniciar o app.');
}

const processes = [
  spawnProcess(process.execPath, ['--watch', path.join(rootDir, 'server', 'index.mjs')], {
    ...process.env,
    NODE_ENV: 'development',
    PORT: '3001',
  }),
  spawnProcess(process.execPath, [viteBin, '--port=3000', '--host=0.0.0.0']),
];

let shuttingDown = false;

function stopAll(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of processes) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }

  setTimeout(() => {
    process.exit(exitCode);
  }, 150);
}

for (const child of processes) {
  child.on('exit', (code) => {
    if (shuttingDown) {
      return;
    }

    stopAll(code ?? 0);
  });
}

process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));
