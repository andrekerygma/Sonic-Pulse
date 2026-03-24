import {
  STORAGE_KEY_HISTORY,
  STORAGE_KEY_PITCH,
  STORAGE_KEY_RATE,
  STORAGE_KEY_SAMPLES,
  STORAGE_KEY_SCRIPT,
  STORAGE_KEY_VOICE,
} from '../constants';
import type { AudioClip, GenerationSample } from '../types';

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable – silently ignore
  }
}

export type PersistedClip = Omit<AudioClip, 'audioUrl' | 'isPlaying' | 'progress'>;

export function loadHistory(): AudioClip[] {
  const clips = safeGet<PersistedClip[]>(STORAGE_KEY_HISTORY, []);
  return clips.map((clip) => ({
    ...clip,
    audioUrl: null,
    isPlaying: false,
    progress: 0,
  }));
}

export function saveHistory(history: AudioClip[]) {
  const stripped: PersistedClip[] = history.map(({ audioUrl: _, isPlaying: __, progress: ___, ...rest }) => rest);
  safeSet(STORAGE_KEY_HISTORY, stripped);
}

export function loadGenerationSamples(): GenerationSample[] {
  return safeGet<GenerationSample[]>(STORAGE_KEY_SAMPLES, []);
}

export function saveGenerationSamples(samples: GenerationSample[]) {
  safeSet(STORAGE_KEY_SAMPLES, samples);
}

export function loadSelectedVoiceCode(): string | null {
  return safeGet<string | null>(STORAGE_KEY_VOICE, null);
}

export function saveSelectedVoiceCode(code: string) {
  safeSet(STORAGE_KEY_VOICE, code);
}

export function loadPitch(): number | null {
  return safeGet<number | null>(STORAGE_KEY_PITCH, null);
}

export function savePitch(pitch: number) {
  safeSet(STORAGE_KEY_PITCH, pitch);
}

export function loadRate(): number | null {
  return safeGet<number | null>(STORAGE_KEY_RATE, null);
}

export function saveRate(rate: number) {
  safeSet(STORAGE_KEY_RATE, rate);
}

export function loadScript(): string {
  return safeGet<string>(STORAGE_KEY_SCRIPT, '');
}

export function saveScript(script: string) {
  safeSet(STORAGE_KEY_SCRIPT, script);
}
