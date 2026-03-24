export interface AudioClip {
  id: string;
  title: string;
  timestamp: string;
  duration: string;
  progress: number;
  isPlaying: boolean;
  audioUrl: string | null;
  voiceCode: string;
  segmentCount: number;
  characterCount: number;
}

export interface VoicePersona {
  id: string;
  name: string;
  code: string;
  flag: string;
  type: string;
  locale: string;
  gender: string;
}

export interface AppState {
  script: string;
  pitch: number;
  rate: number;
  selectedVoice: VoicePersona;
  history: AudioClip[];
  isGenerating: boolean;
  activeClipId: string | null;
  errorMessage: string | null;
}

export type AppView = 'criar' | 'biblioteca' | 'vozes' | 'renderizacao';

export type GenerationSample = {
  durationMs: number;
  segmentCount: number;
  characterCount: number;
};

export type GenerationRuntime = {
  startedAt: number;
  estimatedTotalMs: number;
  expectedSegments: number;
  characterCount: number;
};

export interface PersistedState {
  history: Omit<AudioClip, 'audioUrl' | 'isPlaying' | 'progress'>[];
  generationSamples: GenerationSample[];
  selectedVoiceCode: string;
  pitch: number;
  rate: number;
  script: string;
}
