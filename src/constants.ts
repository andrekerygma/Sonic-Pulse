import { AudioClip, VoicePersona } from './types';

export const FALLBACK_VOICES: VoicePersona[] = [
  { id: '1', name: 'Francisca', code: 'pt-BR-FranciscaNeural', flag: '🇧🇷', type: 'Neural', locale: 'pt-BR', gender: 'Female' },
  { id: '2', name: 'Antonio', code: 'pt-BR-AntonioNeural', flag: '🇧🇷', type: 'Neural', locale: 'pt-BR', gender: 'Male' },
  { id: '3', name: 'Guy', code: 'en-US-GuyNeural', flag: '🇺🇸', type: 'Neural', locale: 'en-US', gender: 'Male' },
  { id: '4', name: 'Jenny', code: 'en-US-JennyNeural', flag: '🇺🇸', type: 'Neural', locale: 'en-US', gender: 'Female' },
];

export const INITIAL_HISTORY: AudioClip[] = [];
