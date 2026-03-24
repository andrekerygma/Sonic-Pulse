import { execFile } from 'node:child_process';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
export const EDGE_TTS_MAX_INPUT_CHARS = 4500;

export class EdgeTtsNotAvailableError extends Error {
  constructor() {
    super('O edge-tts não está instalado. Execute "npm run setup:tts" ou instale-o globalmente com "pip install edge-tts".');
    this.name = 'EdgeTtsNotAvailableError';
  }
}

function getLocalPythonPath(rootDir) {
  return path.join(
    rootDir,
    '.venv',
    process.platform === 'win32' ? 'Scripts' : 'bin',
    process.platform === 'win32' ? 'python.exe' : 'python3',
  );
}

function getLocalEdgeTtsPath(rootDir) {
  return path.join(
    rootDir,
    '.venv',
    process.platform === 'win32' ? 'Scripts' : 'bin',
    process.platform === 'win32' ? 'edge-tts.exe' : 'edge-tts',
  );
}

function getCandidates(rootDir) {
  return [
    {
      label: getLocalEdgeTtsPath(rootDir),
      command: getLocalEdgeTtsPath(rootDir),
    },
    {
      label: 'edge-tts',
      command: 'edge-tts',
    },
  ];
}

async function commandExists(command) {
  try {
    await access(command);
    return true;
  } catch {
    return false;
  }
}

async function runCommand(command, args) {
  return execFileAsync(command, args, {
    maxBuffer: 32 * 1024 * 1024,
  });
}

function normalizeInputText(text) {
  return text.replace(/\r\n?/g, '\n').trim();
}

function appendChunk(chunks, currentChunk, piece, separator, maxChars) {
  if (!piece) {
    return currentChunk;
  }

  if (!currentChunk) {
    return piece;
  }

  const candidate = `${currentChunk}${separator}${piece}`;

  if (candidate.length <= maxChars) {
    return candidate;
  }

  chunks.push(currentChunk);
  return piece;
}

function splitLongUnit(unit, maxChars) {
  const words = unit.split(/\s+/).filter(Boolean);

  if (words.length <= 1) {
    return unit.match(new RegExp(`.{1,${maxChars}}`, 'g')) ?? [unit];
  }

  const segments = [];
  let currentSegment = '';

  for (const word of words) {
    if (word.length > maxChars) {
      if (currentSegment) {
        segments.push(currentSegment);
        currentSegment = '';
      }

      segments.push(...(word.match(new RegExp(`.{1,${maxChars}}`, 'g')) ?? [word]));
      continue;
    }

    const candidate = currentSegment ? `${currentSegment} ${word}` : word;

    if (candidate.length <= maxChars) {
      currentSegment = candidate;
      continue;
    }

    if (currentSegment) {
      segments.push(currentSegment);
    }

    currentSegment = word;
  }

  if (currentSegment) {
    segments.push(currentSegment);
  }

  return segments;
}

function splitParagraphIntoUnits(paragraph) {
  const matches = paragraph.match(/[^.!?…。！？\n]+(?:[.!?…。！？]+|$)/g);
  return matches?.map((item) => item.trim()).filter(Boolean) ?? [paragraph];
}

export function splitTextIntoChunks(text, maxChars = EDGE_TTS_MAX_INPUT_CHARS) {
  const normalized = normalizeInputText(text);

  if (!normalized) {
    return [];
  }

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const chunks = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    const units = splitParagraphIntoUnits(paragraph);
    let isFirstUnitInParagraph = true;

    for (const unit of units) {
      const pieces = unit.length > maxChars ? splitLongUnit(unit, maxChars) : [unit];

      for (const piece of pieces) {
        const separator = isFirstUnitInParagraph ? '\n\n' : ' ';
        currentChunk = appendChunk(chunks, currentChunk, piece, separator, maxChars);
        isFirstUnitInParagraph = false;
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

function extractVoiceInfo(code) {
  const parts = code.split('-');
  const locale = parts.slice(0, 2).join('-');
  const rawName = parts.slice(2).join('-').replace(/Neural$/i, '');
  const name = rawName
    .replace(/([a-z])([A-Z0-9])/g, '$1 $2')
    .replace(/([0-9])([A-Za-z])/g, '$1 $2')
    .trim();

  return {
    code,
    locale,
    name: name || code,
    type: code.endsWith('Neural') ? 'Neural' : 'Standard',
  };
}

function parseVoiceTable(stdout) {
  const voices = stdout
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line && !line.startsWith('Name') && !line.startsWith('-'))
    .map((line) => {
      const match = line.match(/^(\S+)\s+(Male|Female)\s+/i);

      if (!match) {
        return null;
      }

      return {
        ...extractVoiceInfo(match[1]),
        gender: match[2],
      };
    })
    .filter(Boolean);

  return voices.sort((left, right) => (
    left.locale.localeCompare(right.locale) ||
    left.name.localeCompare(right.name) ||
    left.code.localeCompare(right.code)
  ));
}

export async function resolveEdgeTts(rootDir) {
  const candidates = getCandidates(rootDir);
  const orderedCandidates = [];

  if (await commandExists(candidates[0].command)) {
    orderedCandidates.push(candidates[0]);
  }

  orderedCandidates.push(candidates[1]);

  for (const candidate of orderedCandidates) {
    try {
      await runCommand(candidate.command, ['--version']);
      return candidate;
    } catch (error) {
      if (error?.code === 'ENOENT') {
        continue;
      }
    }
  }

  throw new EdgeTtsNotAvailableError();
}

export async function getEdgeTtsStatus(rootDir) {
  try {
    const candidate = await resolveEdgeTts(rootDir);
    return {
      available: true,
      command: candidate.label,
    };
  } catch (error) {
    if (error instanceof EdgeTtsNotAvailableError) {
      return {
        available: false,
        command: null,
      };
    }

    throw error;
  }
}

export async function listAvailableVoices(rootDir) {
  const localPython = getLocalPythonPath(rootDir);

  try {
    await access(localPython);

    const script = `
import asyncio
import json
from edge_tts import list_voices

async def main():
    voices = await list_voices()
    payload = []
    for voice in voices:
        short_name = voice.get("ShortName")
        if not short_name:
            continue
        payload.append({
            "code": short_name,
            "locale": voice.get("Locale", ""),
            "gender": voice.get("Gender", ""),
        })
    print(json.dumps(payload, ensure_ascii=False))

asyncio.run(main())
`;

    const { stdout } = await runCommand(localPython, ['-c', script]);
    const voices = JSON.parse(stdout)
      .map((voice) => ({
        ...extractVoiceInfo(voice.code),
        locale: voice.locale || extractVoiceInfo(voice.code).locale,
        gender: voice.gender || '',
      }))
      .sort((left, right) => (
        left.locale.localeCompare(right.locale) ||
        left.name.localeCompare(right.name) ||
        left.code.localeCompare(right.code)
      ));

    if (voices.length > 0) {
      return voices;
    }
  } catch (error) {
    if (!(error instanceof SyntaxError) && error?.code !== 'ENOENT') {
      const stderr = typeof error?.stderr === 'string' ? error.stderr.trim() : '';
      if (stderr) {
        throw new Error(stderr);
      }
    }
  }

  const candidate = await resolveEdgeTts(rootDir);
  const { stdout } = await runCommand(candidate.command, ['--list-voices']);
  return parseVoiceTable(stdout);
}

async function generateSpeechChunk(command, options, outputPath) {
  await runCommand(command, [
    '--text',
    options.text,
    '--voice',
    options.voice,
    `--rate=${options.rate}`,
    `--pitch=${options.pitch}`,
    '--write-media',
    outputPath,
  ]);
}

async function concatenateAudioFiles(tempDir, inputPaths, outputPath) {
  if (inputPaths.length === 1) {
    return readFile(inputPaths[0]);
  }

  const concatListPath = path.join(tempDir, 'concat.txt');
  const concatListContents = inputPaths
    .map((inputPath) => `file '${inputPath.replace(/'/g, "'\\''")}'`)
    .join('\n');

  await writeFile(concatListPath, concatListContents, 'utf8');

  try {
    await runCommand('ffmpeg', [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      concatListPath,
      '-c',
      'copy',
      outputPath,
    ]);

    return await readFile(outputPath);
  } catch {
    try {
      await runCommand('ffmpeg', [
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
        '-f',
        'concat',
        '-safe',
        '0',
        '-i',
        concatListPath,
        '-vn',
        '-acodec',
        'libmp3lame',
        '-b:a',
        '48k',
        '-ar',
        '24000',
        '-ac',
        '1',
        outputPath,
      ]);

      return await readFile(outputPath);
    } catch {
      const buffers = await Promise.all(inputPaths.map((inputPath) => readFile(inputPath)));
      const merged = Buffer.concat(buffers);
      await writeFile(outputPath, merged);
      return merged;
    }
  }
}

const PARALLEL_CONCURRENCY = 3;

async function runWithConcurrencyLimit(tasks, limit) {
  const results = new Array(tasks.length);
  let nextIndex = 0;

  async function runNext() {
    while (nextIndex < tasks.length) {
      const index = nextIndex++;
      results[index] = await tasks[index]();
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => runNext());
  await Promise.all(workers);
  return results;
}

export async function generateSpeech(rootDir, options) {
  const candidate = await resolveEdgeTts(rootDir);
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'sonic-pulse-'));
  const outputPath = path.join(tempDir, 'speech.mp3');
  const chunks = splitTextIntoChunks(options.text);

  try {
    const inputPaths = chunks.map((_chunk, index) =>
      path.join(tempDir, `speech-part-${String(index).padStart(3, '0')}.mp3`),
    );

    const tasks = chunks.map((chunk, index) => () =>
      generateSpeechChunk(candidate.command, {
        ...options,
        text: chunk,
      }, inputPaths[index]),
    );

    await runWithConcurrencyLimit(tasks, PARALLEL_CONCURRENCY);

    const audioBuffer = await concatenateAudioFiles(tempDir, inputPaths, outputPath);
    return {
      audioBuffer,
      chunkCount: chunks.length,
      chunkLengths: chunks.map((chunk) => chunk.length),
    };
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new EdgeTtsNotAvailableError();
    }

    const stderr = typeof error?.stderr === 'string' ? error.stderr.trim() : '';
    throw new Error(stderr || 'O edge-tts falhou ao gerar o áudio.');
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
