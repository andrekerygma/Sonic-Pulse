import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureProjectDependencies } from './runtime-deps.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const serverEntry = path.join(rootDir, 'server', 'index.mjs');

await ensureProjectDependencies(rootDir, {
  serverOnly: true,
  logger: console,
});

const child = spawn(process.execPath, [serverEntry], {
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
