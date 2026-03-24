export interface AudioClip {
  id: string;
  title: string;
  timestamp: string;
  duration: string;
  progress: number;
  isPlaying: boolean;
}

export interface VoicePersona {
  id: string;
  name: string;
  code: string;
  flag: string;
  type: string;
}

export interface AppState {
  script: string;
  pitch: number;
  rate: number;
  selectedVoice: VoicePersona;
  history: AudioClip[];
  isGenerating: boolean;
}
