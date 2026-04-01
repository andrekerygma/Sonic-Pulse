import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureEdgeTtsInstalled } from './runtime-deps.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const result = await ensureEdgeTtsInstalled(rootDir, { logger: console, autoInstall: true });
console.log(`[setup] edge-tts está pronto via ${result.candidate.label}.`);
