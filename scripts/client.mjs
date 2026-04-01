import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureProjectDependencies } from './runtime-deps.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const viteBin = path.join(rootDir, 'node_modules', 'vite', 'bin', 'vite.js');

await ensureProjectDependencies(rootDir, { logger: console });

if (!existsSync(viteBin)) {
  throw new Error('Vite não foi encontrado em node_modules depois da instalação automática.');
}

const child = spawn(process.execPath, [viteBin, '--port=3000', '--host=0.0.0.0'], {
  cwd: rootDir,
  env: process.env,
  stdio: 'inherit',
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});

child.on('error', (error) => {
  throw error;
});
