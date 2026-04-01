import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EdgeTtsNotAvailableError, EdgeTtsSetupError, ensureEdgeTtsAvailable, generateSpeech, getEdgeTtsStatus, listAvailableVoices } from './edge-tts.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

const MAX_TEXT_LENGTH = 100_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 5;

// Simple in-memory rate limiter (no external deps)
const rateLimitMap = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { windowStart: now, count: 1 });
    return false;
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX_REQUESTS;
}

// Periodically clean stale entries
const staleEntryCleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS * 2) {
      rateLimitMap.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW_MS * 2);
staleEntryCleanupInterval.unref();

function formatFilename(text) {
  const slug = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  return `${slug || 'sonic-pulse-audio'}.mp3`;
}

function sanitizeVoice(value) {
  const voice = typeof value === 'string' ? value.trim() : '';
  return /^[a-z]{2,3}-[A-Za-z0-9]{2,4}-[A-Za-z0-9-]+Neural$/.test(voice)
    ? voice
    : 'pt-BR-FranciscaNeural';
}

function sanitizeRate(value) {
  const rate = typeof value === 'string' ? value.trim() : '';
  return /^[+-]\d+%$/.test(rate) ? rate : '+0%';
}

function sanitizePitch(value) {
  const pitch = typeof value === 'string' ? value.trim() : '';
  return /^[+-]\d+Hz$/i.test(pitch) ? pitch : '+0Hz';
}

const app = express();

// CORS: restrict to known dev origins, configurable via env
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001'];

app.use((request, response, next) => {
  const origin = request.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    // Same-origin requests or non-browser clients
    response.setHeader('Access-Control-Allow-Origin', allowedOrigins[0]);
  }

  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    response.status(204).end();
    return;
  }

  next();
});

app.use(express.json({ limit: '1mb' }));

app.get('/api/tts/status', async (_request, response) => {
  try {
    const status = await getEdgeTtsStatus(rootDir);

    if (!status.available && !status.installing) {
      void ensureEdgeTtsAvailable(rootDir, { logger: console }).catch(() => {});
    }

    response.json(status);
  } catch (error) {
    response.status(500).json({
      available: false,
      command: null,
      error: error instanceof Error ? error.message : 'Não foi possível verificar o edge-tts.',
    });
  }
});

app.get('/api/tts/voices', async (_request, response) => {
  try {
    const voices = await listAvailableVoices(rootDir);
    response.json({ voices });
  } catch (error) {
    if (error instanceof EdgeTtsNotAvailableError || error instanceof EdgeTtsSetupError) {
      response.status(503).json({
        error: error.message,
        setupCommand: 'npm run setup:tts',
      });
      return;
    }

    response.status(502).json({
      error: error instanceof Error ? error.message : 'Não foi possível carregar as vozes disponíveis.',
    });
  }
});

app.post('/api/tts/generate', async (request, response) => {
  // Rate limiting
  const clientIp = request.ip || request.socket.remoteAddress || 'unknown';
  if (isRateLimited(clientIp)) {
    response.status(429).json({ error: 'Limite de requisições excedido. Aguarde um minuto antes de tentar novamente.' });
    return;
  }

  const text = typeof request.body?.text === 'string' ? request.body.text.trim() : '';

  if (!text) {
    response.status(400).json({ error: 'Informe um texto antes de gerar o áudio.' });
    return;
  }

  // Text length validation
  if (text.length > MAX_TEXT_LENGTH) {
    response.status(400).json({ error: `O texto excede o limite de ${MAX_TEXT_LENGTH.toLocaleString()} caracteres.` });
    return;
  }

  try {
    const result = await generateSpeech(rootDir, {
      text,
      voice: sanitizeVoice(request.body?.voice),
      rate: sanitizeRate(request.body?.rate),
      pitch: sanitizePitch(request.body?.pitch),
    });

    response.setHeader('Content-Type', 'audio/mpeg');
    response.setHeader('Content-Length', result.audioBuffer.length);
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Disposition', `inline; filename="${formatFilename(text)}"`);
    response.setHeader('X-Sonic-Pulse-Chunk-Count', String(result.chunkCount));
    response.setHeader('X-Sonic-Pulse-Character-Count', String(text.length));
    response.send(result.audioBuffer);
  } catch (error) {
    if (error instanceof EdgeTtsNotAvailableError || error instanceof EdgeTtsSetupError) {
      response.status(503).json({
        error: error.message,
        setupCommand: 'npm run setup:tts',
      });
      return;
    }

    response.status(502).json({
      error: error instanceof Error ? error.message : 'A geração de áudio falhou.',
    });
  }
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(distDir));

  app.get('*', (_request, response) => {
    response.sendFile(path.join(distDir, 'index.html'));
  });
}

const port = Number(process.env.PORT ?? (process.env.NODE_ENV === 'production' ? 3000 : 3001));
const host = process.env.HOST ?? '0.0.0.0';
let shuttingDown = false;

const server = app.listen(port, host, async () => {
  const publicHost = host === '0.0.0.0' ? 'localhost' : host;
  console.log(`[server] API do Sonic Pulse em execução em http://${publicHost}:${port}`);

  try {
    const status = await ensureEdgeTtsAvailable(rootDir, { logger: console });
    console.log(`[server] edge-tts disponível via ${status.command}`);
  } catch (error) {
    console.log(`[server] falha ao configurar o edge-tts: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
  }
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`[server] A porta ${port} ja esta em uso.`);
  } else {
    console.error(`[server] Falha ao iniciar a API: ${error.message}`);
  }

  process.exit(1);
});

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  clearInterval(staleEntryCleanupInterval);

  server.close(() => {
    process.exit(exitCode);
  });

  setTimeout(() => {
    process.exit(exitCode);
  }, 1000).unref();
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
