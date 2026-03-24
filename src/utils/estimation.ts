import {
  DEFAULT_GENERATION_BASE_MS,
  DEFAULT_GENERATION_CHAR_MS,
  DEFAULT_GENERATION_SEGMENT_MS,
  EDGE_TTS_CHUNK_GUIDE_CHARS,
  MAX_GENERATION_PROGRESS,
} from '../constants';
import type { GenerationSample } from '../types';

export function estimateSegmentCount(script: string) {
  const trimmed = script.trim();

  if (!trimmed) {
    return 0;
  }

  return Math.max(1, Math.ceil(trimmed.length / EDGE_TTS_CHUNK_GUIDE_CHARS));
}

export function estimateGenerationMs(characterCount: number, segmentCount: number, samples: GenerationSample[]) {
  const safeSegmentCount = Math.max(1, segmentCount);
  const fallbackEstimate = DEFAULT_GENERATION_BASE_MS
    + safeSegmentCount * DEFAULT_GENERATION_SEGMENT_MS
    + characterCount * DEFAULT_GENERATION_CHAR_MS;

  if (samples.length === 0) {
    return Math.round(fallbackEstimate);
  }

  const totals = samples.reduce((accumulator, sample) => ({
    durationMs: accumulator.durationMs + sample.durationMs,
    segmentCount: accumulator.segmentCount + Math.max(1, sample.segmentCount),
    characterCount: accumulator.characterCount + Math.max(1, sample.characterCount),
  }), {
    durationMs: 0,
    segmentCount: 0,
    characterCount: 0,
  });

  const averageMsPerSegment = totals.durationMs / Math.max(1, totals.segmentCount);
  const averageMsPerCharacter = totals.durationMs / Math.max(1, totals.characterCount);
  const learnedEstimate = DEFAULT_GENERATION_BASE_MS
    + safeSegmentCount * Math.max(3200, averageMsPerSegment * 0.78)
    + characterCount * Math.max(0.12, averageMsPerCharacter * 0.28);

  return Math.round(Math.max(fallbackEstimate * 0.85, learnedEstimate));
}

export function calculateGenerationProgress(elapsedMs: number, estimatedTotalMs: number) {
  if (estimatedTotalMs <= 0) {
    return 8;
  }

  if (elapsedMs <= estimatedTotalMs) {
    return Math.min(
      MAX_GENERATION_PROGRESS,
      8 + (elapsedMs / estimatedTotalMs) * (MAX_GENERATION_PROGRESS - 8),
    );
  }

  const overflowRatio = Math.min(1, (elapsedMs - estimatedTotalMs) / estimatedTotalMs);
  return Math.min(99, MAX_GENERATION_PROGRESS + overflowRatio * 3);
}

export function buildGenerationStatus(elapsedMs: number, estimatedTotalMs: number, segmentCount: number) {
  const safeSegmentCount = Math.max(1, segmentCount);
  const progressRatio = estimatedTotalMs > 0 ? elapsedMs / estimatedTotalMs : 0;

  if (safeSegmentCount === 1) {
    if (progressRatio < 0.2) {
      return 'Preparando a síntese e enviando o texto para a voz selecionada.';
    }

    if (progressRatio < 0.85) {
      return 'Convertendo o texto em áudio e montando o MP3 final.';
    }

    if (progressRatio < 1.1) {
      return 'Finalizando o arquivo e preparando a reprodução.';
    }

    return 'Ainda finalizando o MP3. A resposta deve chegar em instantes.';
  }

  if (progressRatio < 0.15) {
    return `Preparando ${safeSegmentCount} trechos para síntese antes da concatenação final.`;
  }

  if (progressRatio < 0.85) {
    const approximateSegment = Math.min(
      safeSegmentCount,
      Math.max(1, Math.ceil(Math.min(progressRatio, 0.98) * safeSegmentCount)),
    );
    return `Processando aproximadamente o trecho ${approximateSegment} de ${safeSegmentCount}.`;
  }

  if (progressRatio < 1.1) {
    return 'Unindo os trechos renderizados e fechando o MP3 final.';
  }

  return 'Ainda fechando o arquivo final. Em textos longos isso pode levar alguns segundos extras.';
}
