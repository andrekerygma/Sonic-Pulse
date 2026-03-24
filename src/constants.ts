import { AudioClip, VoicePersona } from './types';

export const VOICES: VoicePersona[] = [
  { id: '1', name: 'Francisca (Neural)', code: 'pt-BR-FranciscaNeural', flag: '🇧🇷', type: 'Neural' },
  { id: '2', name: 'Antonio (Neural)', code: 'pt-BR-AntonioNeural', flag: '🇧🇷', type: 'Neural' },
  { id: '3', name: 'Guy (Neural)', code: 'en-US-GuyNeural', flag: '🇺🇸', type: 'Neural' },
  { id: '4', name: 'Jenny (Neural)', code: 'en-US-JennyNeural', flag: '🇺🇸', type: 'Neural' },
];

export const INITIAL_HISTORY: AudioClip[] = [
  {
    id: 'h1',
    title: 'Narrative introduction for documentary...',
    timestamp: 'TODAY, 10:45 AM',
    duration: '0:45',
    progress: 33,
    isPlaying: true,
  },
  {
    id: 'h2',
    title: 'Marketing copy - Cyberpunk 2077 tribute',
    timestamp: 'YESTERDAY',
    duration: '1:12',
    progress: 0,
    isPlaying: false,
  },
  {
    id: 'h3',
    title: 'Internal training audio script V2',
    timestamp: 'OCT 12',
    duration: '3:54',
    progress: 0,
    isPlaying: false,
  },
];
