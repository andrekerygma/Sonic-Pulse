import { VoicePersona } from './types';

export const FALLBACK_VOICES: VoicePersona[] = [
  { id: '1', name: 'Francisca', code: 'pt-BR-FranciscaNeural', flag: '🇧🇷', type: 'Neural', locale: 'pt-BR', gender: 'Female' },
  { id: '2', name: 'Antonio', code: 'pt-BR-AntonioNeural', flag: '🇧🇷', type: 'Neural', locale: 'pt-BR', gender: 'Male' },
  { id: '3', name: 'Guy', code: 'en-US-GuyNeural', flag: '🇺🇸', type: 'Neural', locale: 'en-US', gender: 'Male' },
  { id: '4', name: 'Jenny', code: 'en-US-JennyNeural', flag: '🇺🇸', type: 'Neural', locale: 'en-US', gender: 'Female' },
];

export const EDGE_TTS_CHUNK_GUIDE_CHARS = 4500;
export const DEFAULT_GENERATION_BASE_MS = 2000;
export const DEFAULT_GENERATION_SEGMENT_MS = 5500;
export const DEFAULT_GENERATION_CHAR_MS = 0.55;
export const MAX_GENERATION_PROGRESS = 96;

export const STORAGE_KEY_HISTORY = 'sonic-pulse:history';
export const STORAGE_KEY_SAMPLES = 'sonic-pulse:generation-samples';
export const STORAGE_KEY_VOICE = 'sonic-pulse:selected-voice';
export const STORAGE_KEY_PITCH = 'sonic-pulse:pitch';
export const STORAGE_KEY_RATE = 'sonic-pulse:rate';
export const STORAGE_KEY_SCRIPT = 'sonic-pulse:script';

export const PERSISTENCE_DEBOUNCE_MS = 500;
export const MAX_GENERATION_SAMPLES = 6;
export const MAX_TEXT_LENGTH = 100_000;
