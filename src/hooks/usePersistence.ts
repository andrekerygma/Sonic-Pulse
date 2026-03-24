import { useEffect, useRef } from 'react';
import { PERSISTENCE_DEBOUNCE_MS } from '../constants';
import type { AppState, GenerationSample } from '../types';
import {
  saveGenerationSamples,
  saveHistory,
  savePitch,
  saveRate,
  saveScript,
  saveSelectedVoiceCode,
} from '../utils/storage';

export function usePersistence(
  state: AppState,
  generationSamples: GenerationSample[],
) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      saveHistory(state.history);
      saveGenerationSamples(generationSamples);
      saveSelectedVoiceCode(state.selectedVoice.code);
      savePitch(state.pitch);
      saveRate(state.rate);
      saveScript(state.script);
    }, PERSISTENCE_DEBOUNCE_MS);

    return () => clearTimeout(timerRef.current);
  }, [
    state.history,
    state.selectedVoice.code,
    state.pitch,
    state.rate,
    state.script,
    generationSamples,
  ]);
}
