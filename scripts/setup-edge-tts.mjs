import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const isWindows = process.platform === 'win32';

const pythonCandidates = [
  { command: 'python3', args: [] },
  { command: 'python', args: [] },
  ...(isWindows ? [{ command: 'py', args: ['-3'] }] : []),
];

function runOrThrow(command, args, description) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${description} failed with exit code ${result.status}.`);
  }
}

function resolvePython() {
  for (const candidate of pythonCandidates) {
    const result = spawnSync(candidate.command, [...candidate.args, '--version'], {
      cwd: rootDir,
      stdio: 'ignore',
    });

    if (!result.error && result.status === 0) {
      return candidate;
    }
  }

  throw new Error('Python 3 was not found. Install Python 3 and try again.');
}

function resolveVenvPython() {
  const candidates = [
    path.join(rootDir, '.venv', isWindows ? 'Scripts/python.exe' : 'bin/python3'),
    path.join(rootDir, '.venv', isWindows ? 'Scripts/python.exe' : 'bin/python'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error('Could not locate the Python executable inside .venv.');
}

const python = resolvePython();

if (!existsSync(path.join(rootDir, '.venv'))) {
  console.log('[setup] Creating local virtual environment...');
  runOrThrow(python.command, [...python.args, '-m', 'venv', '.venv'], 'Creating .venv');
}

const venvPython = resolveVenvPython();

console.log('[setup] Installing edge-tts...');
runOrThrow(venvPython, ['-m', 'pip', 'install', '--upgrade', 'pip'], 'Upgrading pip');
runOrThrow(venvPython, ['-m', 'pip', 'install', '--upgrade', 'edge-tts'], 'Installing edge-tts');

console.log('[setup] edge-tts is ready. Start the app with "npm run dev".');
