import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const isWindows = process.platform === 'win32';
const npmCommand = isWindows ? 'npm.cmd' : 'npm';
const pythonCandidates = [
  { command: 'python3', args: [] },
  { command: 'python', args: [] },
  ...(isWindows ? [{ command: 'py', args: ['-3'] }] : []),
];
const userScriptsDirSnippet = `
import os
import site

print(os.path.join(site.getuserbase(), 'Scripts' if os.name == 'nt' else 'bin'))
`;

function isAutoInstallEnabled() {
  return process.env.SONIC_PULSE_DISABLE_AUTO_INSTALL !== '1';
}

function formatErrorMessage(error, fallback = 'erro desconhecido') {
  return error instanceof Error && error.message ? error.message : fallback;
}

function logInfo(logger, message) {
  if (typeof logger?.log === 'function') {
    logger.log(message);
  }
}

function logWarn(logger, message) {
  if (typeof logger?.warn === 'function') {
    logger.warn(message);
    return;
  }

  logInfo(logger, message);
}

function getProcessOutputSummary(output) {
  const trimmed = typeof output === 'string' ? output.trim() : '';

  if (!trimmed) {
    return '';
  }

  const lines = trimmed.split(/\r?\n/).filter(Boolean);
  return lines.at(-1) ?? '';
}

async function runCommand(command, args, options = {}) {
  const { cwd, env = process.env, stdio = 'pipe' } = options;

  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: stdio === 'inherit' ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.on('error', reject);

    if (child.stdout) {
      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });
    }

    child.on('close', (code) => {
      resolve({
        code,
        stdout,
        stderr,
      });
    });
  });
}

async function runOrThrow(command, args, options, description) {
  try {
    const result = await runCommand(command, args, options);

    if (result.code === 0) {
      return result;
    }

    const summary = getProcessOutputSummary(result.stderr) || getProcessOutputSummary(result.stdout);
    const detail = summary ? ` ${summary}` : '';
    throw new Error(`${description} falhou com código ${result.code}.${detail}`);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new Error(`Não foi possível executar "${command}". Verifique se ele está instalado no sistema.`);
    }

    throw error;
  }
}

export function getLocalPythonCandidates(rootDir) {
  return [
    path.join(rootDir, '.venv', isWindows ? 'Scripts' : 'bin', isWindows ? 'python.exe' : 'python3'),
    path.join(rootDir, '.venv', isWindows ? 'Scripts' : 'bin', isWindows ? 'python.exe' : 'python'),
  ];
}

export function getLocalPythonPath(rootDir) {
  return getLocalPythonCandidates(rootDir)[0];
}

export function getLocalEdgeTtsPath(rootDir) {
  return path.join(
    rootDir,
    '.venv',
    isWindows ? 'Scripts' : 'bin',
    isWindows ? 'edge-tts.exe' : 'edge-tts',
  );
}

function resolveLocalVenvPython(rootDir) {
  for (const candidate of getLocalPythonCandidates(rootDir)) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error('Não foi possível localizar o executável do Python dentro da .venv.');
}

async function resolveUserScriptsDir(rootDir, python) {
  const result = await runOrThrow(
    python.command,
    [...python.args, '-c', userScriptsDirSnippet],
    { cwd: rootDir },
    'Descoberta da pasta de scripts do Python',
  );

  return result.stdout.trim();
}

async function ensurePipAvailable(rootDir, python, logger) {
  try {
    const result = await runCommand(python.command, [...python.args, '-m', 'pip', '--version'], { cwd: rootDir });

    if (result.code === 0) {
      return;
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }

  logInfo(logger, '[setup] pip não foi encontrado. Executando ensurepip...');
  await runOrThrow(
    python.command,
    [...python.args, '-m', 'ensurepip', '--upgrade'],
    { cwd: rootDir, stdio: 'inherit' },
    'Instalação do pip',
  );
}

export async function resolvePython(rootDir) {
  for (const candidate of pythonCandidates) {
    try {
      const result = await runCommand(candidate.command, [...candidate.args, '--version'], { cwd: rootDir });

      if (result.code === 0) {
        return candidate;
      }
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  throw new Error('Python 3 não foi encontrado. Instale o Python 3 para configurar o edge-tts automaticamente.');
}

export function getProjectDependencyMarkers(rootDir, options = {}) {
  const { serverOnly = false } = options;
  const markers = [path.join(rootDir, 'node_modules', 'express', 'package.json')];

  if (!serverOnly) {
    markers.push(path.join(rootDir, 'node_modules', 'vite', 'bin', 'vite.js'));
  }

  return markers;
}

export async function ensureProjectDependencies(rootDir, options = {}) {
  const {
    serverOnly = false,
    logger = console,
    autoInstall = isAutoInstallEnabled(),
  } = options;
  const markers = getProjectDependencyMarkers(rootDir, { serverOnly });

  if (markers.every((marker) => existsSync(marker))) {
    return { installed: false };
  }

  if (!autoInstall) {
    throw new Error('As dependências do projeto não foram encontradas em node_modules. Execute "npm install".');
  }

  logInfo(logger, '[setup] Dependências do projeto não encontradas. Executando "npm install"...');

  await runOrThrow(
    npmCommand,
    ['install'],
    {
      cwd: rootDir,
      env: {
        ...process.env,
        npm_config_audit: 'false',
        npm_config_fund: 'false',
      },
      stdio: 'inherit',
    },
    'Instalação automática das dependências do projeto',
  );

  const missingMarkers = markers.filter((marker) => !existsSync(marker));

  if (missingMarkers.length > 0) {
    throw new Error('A instalação automática terminou, mas arquivos essenciais ainda não apareceram em node_modules.');
  }

  logInfo(logger, '[setup] Dependências do projeto prontas.');
  return { installed: true };
}

export async function getEdgeTtsCandidates(rootDir) {
  const candidates = [];
  const localEdgeTts = getLocalEdgeTtsPath(rootDir);

  if (existsSync(localEdgeTts)) {
    candidates.push({
      label: localEdgeTts,
      command: localEdgeTts,
      source: 'local',
    });
  }

  try {
    const python = await resolvePython(rootDir);
    const userScriptsDir = await resolveUserScriptsDir(rootDir, python);
    const userEdgeTts = path.join(userScriptsDir, isWindows ? 'edge-tts.exe' : 'edge-tts');

    if (existsSync(userEdgeTts)) {
      candidates.push({
        label: userEdgeTts,
        command: userEdgeTts,
        source: 'user',
      });
    }
  } catch {
    // The app can still rely on a global edge-tts present in PATH.
  }

  candidates.push({
    label: 'edge-tts',
    command: 'edge-tts',
    source: 'path',
  });

  const seen = new Set();

  return candidates.filter((candidate) => {
    if (seen.has(candidate.command)) {
      return false;
    }

    seen.add(candidate.command);
    return true;
  });
}

export async function resolveInstalledEdgeTts(rootDir) {
  const candidates = await getEdgeTtsCandidates(rootDir);

  for (const candidate of candidates) {
    try {
      const result = await runCommand(candidate.command, ['--version'], { cwd: rootDir });

      if (result.code === 0) {
        return candidate;
      }
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        continue;
      }
    }
  }

  return null;
}

async function installEdgeTtsInUserSite(rootDir, python, logger) {
  logInfo(logger, '[setup] edge-tts não encontrado. Tentando instalar no ambiente do usuário...');
  await ensurePipAvailable(rootDir, python, logger);

  await runOrThrow(
    python.command,
    [...python.args, '-m', 'pip', 'install', '--user', '--upgrade', 'edge-tts'],
    { cwd: rootDir, stdio: 'inherit' },
    'Instalação automática do edge-tts no ambiente do usuário',
  );
}

async function installEdgeTtsInLocalVenv(rootDir, python, logger) {
  if (!existsSync(path.join(rootDir, '.venv'))) {
    logInfo(logger, '[setup] Criando a .venv local para o edge-tts...');
    await runOrThrow(
      python.command,
      [...python.args, '-m', 'venv', '.venv'],
      { cwd: rootDir, stdio: 'inherit' },
      'Criação da .venv local',
    );
  }

  const venvPython = resolveLocalVenvPython(rootDir);

  logInfo(logger, '[setup] Instalando edge-tts na .venv local...');

  await runOrThrow(
    venvPython,
    ['-m', 'pip', 'install', '--upgrade', 'pip'],
    { cwd: rootDir, stdio: 'inherit' },
    'Atualização do pip da .venv',
  );

  await runOrThrow(
    venvPython,
    ['-m', 'pip', 'install', '--upgrade', 'edge-tts'],
    { cwd: rootDir, stdio: 'inherit' },
    'Instalação do edge-tts na .venv',
  );
}

export async function ensureEdgeTtsInstalled(rootDir, options = {}) {
  const {
    logger = console,
    autoInstall = isAutoInstallEnabled(),
  } = options;

  const existingCandidate = await resolveInstalledEdgeTts(rootDir);

  if (existingCandidate) {
    return {
      installed: false,
      candidate: existingCandidate,
      method: existingCandidate.source,
    };
  }

  if (!autoInstall) {
    throw new Error('O edge-tts não está instalado. Execute "npm run setup:tts" para configurá-lo.');
  }

  const python = await resolvePython(rootDir);
  let userInstallError = null;

  try {
    await installEdgeTtsInUserSite(rootDir, python, logger);
    const userCandidate = await resolveInstalledEdgeTts(rootDir);

    if (userCandidate) {
      logInfo(logger, `[setup] edge-tts pronto via ${userCandidate.label}.`);
      return {
        installed: true,
        candidate: userCandidate,
        method: userCandidate.source,
      };
    }
  } catch (error) {
    userInstallError = error;
    logWarn(logger, `[setup] Falha ao instalar edge-tts no ambiente do usuário: ${formatErrorMessage(error)}`);
    logInfo(logger, '[setup] Vou tentar configurar uma .venv local como fallback...');
  }

  await installEdgeTtsInLocalVenv(rootDir, python, logger);
  const localCandidate = await resolveInstalledEdgeTts(rootDir);

  if (localCandidate) {
    logInfo(logger, `[setup] edge-tts pronto via ${localCandidate.label}.`);
    return {
      installed: true,
      candidate: localCandidate,
      method: localCandidate.source,
      userInstallError,
    };
  }

  if (userInstallError) {
    throw new Error(`A instalação automática do edge-tts falhou no sistema e na .venv local. ${formatErrorMessage(userInstallError)}`);
  }

  throw new Error('A instalação automática do edge-tts terminou sem disponibilizar um comando executável.');
}
