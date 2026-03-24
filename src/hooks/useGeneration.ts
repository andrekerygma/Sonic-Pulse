import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MAX_GENERATION_SAMPLES } from '../constants';
import type { AppState, AudioClip, GenerationRuntime, GenerationSample } from '../types';
import { fetchApi, getErrorMessage } from '../utils/api';
import { createClipId, readAudioDuration, toEdgePitch, toEdgeRate } from '../utils/audio';
import { buildGenerationStatus, calculateGenerationProgress, estimateGenerationMs, estimateSegmentCount } from '../utils/estimation';
import { formatDuration, formatRuntimeMilliseconds, formatTimestamp } from '../utils/formatters';
import { buildClipTitle } from '../utils/text';

export function useGeneration(
  state: AppState,
  setState: React.Dispatch<React.SetStateAction<AppState>>,
  audioRef: React.RefObject<HTMLAudioElement | null>,
  generatedUrlsRef: React.RefObject<string[]>,
  initialSamples: GenerationSample[],
) {
  const [generationSamples, setGenerationSamples] = useState<GenerationSample[]>(initialSamples);
  const [generationRuntime, setGenerationRuntime] = useState<GenerationRuntime | null>(null);
  const [generationElapsedMs, setGenerationElapsedMs] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!generationRuntime) {
      setGenerationElapsedMs(0);
      return;
    }

    const updateElapsed = () => {
      setGenerationElapsedMs(Date.now() - generationRuntime.startedAt);
    };

    updateElapsed();
    const intervalId = window.setInterval(updateElapsed, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [generationRuntime]);

  const scriptForEstimate = state.script.trim();
  const estimatedSegments = estimateSegmentCount(state.script);
  const plannedGenerationMs = scriptForEstimate
    ? estimateGenerationMs(scriptForEstimate.length, estimatedSegments, generationSamples)
    : 0;

  const generationProgressPercent = generationRuntime
    ? calculateGenerationProgress(generationElapsedMs, generationRuntime.estimatedTotalMs)
    : 0;

  const generationStatus = generationRuntime
    ? buildGenerationStatus(generationElapsedMs, generationRuntime.estimatedTotalMs, generationRuntime.expectedSegments)
    : '';

  const generationRemainingMs = generationRuntime
    ? Math.max(0, generationRuntime.estimatedTotalMs - generationElapsedMs)
    : 0;

  const estimateSummaryLabel = generationRuntime
    ? `Estimativa total desta renderização: ~${formatRuntimeMilliseconds(generationRuntime.estimatedTotalMs)}`
    : scriptForEstimate
      ? `Estimativa atual: ~${formatRuntimeMilliseconds(plannedGenerationMs)}`
      : 'Adicione um texto para ver a estimativa de renderização.';

  const handleGenerate = useCallback(async () => {
    const script = state.script.trim();
    if (!script) return;

    const startedAt = Date.now();
    const segments = estimateSegmentCount(script);
    const estimatedTotalMs = estimateGenerationMs(script.length, segments, generationSamples);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setState((prev) => ({ ...prev, isGenerating: true, errorMessage: null }));
    setGenerationRuntime({ startedAt, estimatedTotalMs, expectedSegments: segments, characterCount: script.length });

    try {
      const response = await fetchApi('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: script,
          voice: state.selectedVoice.code,
          rate: toEdgeRate(state.rate),
          pitch: toEdgePitch(state.pitch),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type') ?? '';
        if (contentType.includes('application/json')) {
          const body = await response.json();
          throw new Error(body.error || 'A geração de áudio falhou.');
        }
        throw new Error((await response.text()) || 'A geração de áudio falhou.');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      generatedUrlsRef.current.push(audioUrl);

      const durationInSeconds = await readAudioDuration(audioUrl);
      const segmentCount = Number(response.headers.get('X-Sonic-Pulse-Chunk-Count') ?? '1');
      const characterCount = Number(response.headers.get('X-Sonic-Pulse-Character-Count') ?? String(script.length));
      const safeSegmentCount = Number.isFinite(segmentCount) ? segmentCount : segments;
      const safeCharacterCount = Number.isFinite(characterCount) ? characterCount : script.length;
      const generationDurationMs = Date.now() - startedAt;

      const nextClip: AudioClip = {
        id: createClipId(),
        title: buildClipTitle(script),
        timestamp: formatTimestamp(),
        duration: formatDuration(durationInSeconds),
        progress: 0,
        isPlaying: true,
        audioUrl,
        voiceCode: state.selectedVoice.code,
        segmentCount: safeSegmentCount,
        characterCount: safeCharacterCount,
      };

      setGenerationSamples((prev) => [
        ...prev.slice(-(MAX_GENERATION_SAMPLES - 1)),
        { durationMs: generationDurationMs, segmentCount: safeSegmentCount, characterCount: safeCharacterCount },
      ]);

      const audio = audioRef.current;
      if (audio) {
        audio.src = audioUrl;
        audio.currentTime = 0;
      }

      setState((prev) => ({
        ...prev,
        isGenerating: false,
        activeClipId: nextClip.id,
        errorMessage: null,
        history: [nextClip, ...prev.history.map((clip) => ({ ...clip, isPlaying: false }))],
      }));

      if (audio) {
        try {
          await audio.play();
        } catch {
          setState((prev) => ({
            ...prev,
            errorMessage: 'O áudio foi gerado, mas a reprodução automática foi bloqueada. Use o botão ouvir para iniciar.',
            history: prev.history.map((clip) =>
              clip.id === nextClip.id ? { ...clip, isPlaying: false } : clip,
            ),
          }));
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setState((prev) => ({ ...prev, isGenerating: false, errorMessage: 'Geração cancelada.' }));
      } else {
        setState((prev) => ({ ...prev, isGenerating: false, errorMessage: getErrorMessage(error) }));
      }
    } finally {
      setGenerationRuntime(null);
      abortControllerRef.current = null;
    }
  }, [state.script, state.selectedVoice.code, state.rate, state.pitch, generationSamples, setState, audioRef, generatedUrlsRef]);

  const cancelGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return {
    generationSamples,
    generationRuntime,
    generationElapsedMs,
    estimatedSegments,
    plannedGenerationMs,
    generationProgressPercent,
    generationStatus,
    generationRemainingMs,
    estimateSummaryLabel,
    handleGenerate,
    cancelGeneration,
  };
}
