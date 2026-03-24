import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  ChevronDown,
  Download,
  FileUp,
  HelpCircle,
  Library,
  Loader2,
  Mic2,
  MoreVertical,
  Pause,
  Play,
  PlusCircle,
  Search,
  Settings2,
  SkipBack,
  SkipForward,
  Sparkles,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { AppState, AudioClip, VoicePersona } from './types';
import { FALLBACK_VOICES, INITIAL_HISTORY } from './constants';

const EDGE_TTS_CHUNK_GUIDE_CHARS = 4500;
const DEFAULT_GENERATION_BASE_MS = 2000;
const DEFAULT_GENERATION_SEGMENT_MS = 5500;
const DEFAULT_GENERATION_CHAR_MS = 0.55;
const MAX_GENERATION_PROGRESS = 96;

type AppView = 'criar' | 'biblioteca' | 'vozes' | 'renderizacao';
type GenerationSample = {
  durationMs: number;
  segmentCount: number;
  characterCount: number;
};

type GenerationRuntime = {
  startedAt: number;
  estimatedTotalMs: number;
  expectedSegments: number;
  characterCount: number;
};

function polishScriptLocally(script: string) {
  const normalized = script
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim().replace(/\s+/g, ' '))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+([,.;:!?])/g, '$1')
    .replace(/([,.;:!?])([^\s"')\]}>\n])/g, '$1 $2')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  return normalized.replace(
    /(^|[\n.!?]\s+)([a-zà-ÿ])/giu,
    (_match, prefix, letter) => `${prefix}${letter.toUpperCase()}`,
  );
}

function formatDuration(totalSeconds: number) {
  const roundedSeconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(roundedSeconds / 3600);
  const minutes = Math.floor((roundedSeconds % 3600) / 60);
  const seconds = (roundedSeconds % 60).toString().padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds}`;
  }

  return `${minutes}:${seconds}`;
}

function formatRuntimeMilliseconds(totalMilliseconds: number) {
  return formatDuration(totalMilliseconds / 1000);
}

function formatTimestamp(date = new Date()) {
  return `HOJE, ${date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function formatSliderNumber(value: number) {
  if (Number.isInteger(value)) {
    return `${value}`;
  }

  return value.toFixed(2).replace(/0+$/g, '').replace(/\.$/, '');
}

function buildClipTitle(script: string) {
  const normalized = script.replace(/\s+/g, ' ').trim();

  if (normalized.length <= 40) {
    return normalized;
  }

  return `${normalized.slice(0, 40)}...`;
}

function buildDownloadName(title: string) {
  const slug = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  return `${slug || 'audio-sonic-pulse'}.mp3`;
}

function toEdgeRate(rate: number) {
  const normalized = Math.round((rate - 1) * 100);
  return `${normalized >= 0 ? '+' : ''}${normalized}%`;
}

function toEdgePitch(pitch: number) {
  const normalized = Math.round(pitch);
  return `${normalized >= 0 ? '+' : ''}${normalized}Hz`;
}

function createClipId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2);
}

function readAudioDuration(audioUrl: string) {
  return new Promise<number>((resolve) => {
    const probe = new Audio(audioUrl);

    const finalize = (value: number) => {
      probe.removeEventListener('loadedmetadata', onLoadedMetadata);
      probe.removeEventListener('error', onError);
      resolve(value);
    };

    const onLoadedMetadata = () => {
      finalize(Number.isFinite(probe.duration) ? probe.duration : 0);
    };

    const onError = () => {
      finalize(0);
    };

    probe.addEventListener('loadedmetadata', onLoadedMetadata);
    probe.addEventListener('error', onError);
  });
}

function getErrorMessage(error: unknown, fallback = 'Algo deu errado ao gerar o áudio.') {
  if (error instanceof TypeError && /failed to fetch|networkerror/i.test(error.message)) {
    return 'Não foi possível alcançar a API local do Sonic Pulse. Verifique se o app está rodando e tente novamente.';
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function buildApiCandidates(endpoint: string) {
  const normalizedPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const candidates = new Set<string>([normalizedPath]);

  if (typeof window === 'undefined' || window.location.protocol !== 'http:') {
    return Array.from(candidates);
  }

  const { hostname, protocol, port } = window.location;

  if (hostname && port !== '3001') {
    candidates.add(`${protocol}//${hostname}:3001${normalizedPath}`);
  }

  if (hostname !== '127.0.0.1') {
    candidates.add(`http://127.0.0.1:3001${normalizedPath}`);
  }

  if (hostname !== 'localhost') {
    candidates.add(`http://localhost:3001${normalizedPath}`);
  }

  return Array.from(candidates);
}

async function fetchApi(endpoint: string, init?: RequestInit) {
  let lastError: unknown = null;

  for (const candidate of buildApiCandidates(endpoint)) {
    try {
      return await fetch(candidate, init);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Não foi possível conectar à API local do Sonic Pulse.');
}

function extractLocaleFromCode(code: string) {
  const parts = code.split('-');
  return parts.length >= 2 ? `${parts[0]}-${parts[1]}` : code;
}

function extractNameFromCode(code: string) {
  return code
    .split('-')
    .slice(2)
    .join('-')
    .replace(/Neural$/i, '')
    .replace(/([a-z])([A-Z0-9])/g, '$1 $2')
    .replace(/([0-9])([A-Za-z])/g, '$1 $2')
    .trim() || code;
}

function localeToFlag(locale: string) {
  const region = locale.split('-')[1];

  if (!region || !/^[A-Za-z]{2}$/.test(region)) {
    return '🌐';
  }

  return region
    .toUpperCase()
    .split('')
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join('');
}

function translateGender(gender: string) {
  const normalized = gender.toLowerCase();

  if (normalized === 'male') {
    return 'Masculina';
  }

  if (normalized === 'female') {
    return 'Feminina';
  }

  return gender || 'Não informado';
}

function normalizeVoice(voice: Partial<VoicePersona> & { code: string }, index: number): VoicePersona {
  const locale = voice.locale || extractLocaleFromCode(voice.code);

  return {
    id: voice.id || `voice-${index}-${voice.code}`,
    name: voice.name || extractNameFromCode(voice.code),
    code: voice.code,
    flag: voice.flag || localeToFlag(locale),
    type: voice.type || (voice.code.endsWith('Neural') ? 'Neural' : 'Padrão'),
    locale,
    gender: voice.gender || '',
  };
}

function buildVoiceDetails(voice: VoicePersona) {
  return [voice.locale, translateGender(voice.gender), voice.type]
    .filter(Boolean)
    .join(' · ');
}

function estimateSegmentCount(script: string) {
  const trimmed = script.trim();

  if (!trimmed) {
    return 0;
  }

  return Math.max(1, Math.ceil(trimmed.length / EDGE_TTS_CHUNK_GUIDE_CHARS));
}

function estimateGenerationMs(characterCount: number, segmentCount: number, samples: GenerationSample[]) {
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

function calculateGenerationProgress(elapsedMs: number, estimatedTotalMs: number) {
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

function buildGenerationStatus(elapsedMs: number, estimatedTotalMs: number, segmentCount: number) {
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

export default function App() {
  const [state, setState] = useState<AppState>({
    script: '',
    pitch: 0,
    rate: 1,
    selectedVoice: FALLBACK_VOICES[0],
    history: INITIAL_HISTORY,
    isGenerating: false,
    activeClipId: null,
    errorMessage: null,
  });
  const [activeView, setActiveView] = useState<AppView>('criar');
  const [availableVoices, setAvailableVoices] = useState<VoicePersona[]>(FALLBACK_VOICES);
  const [voiceSearch, setVoiceSearch] = useState('');
  const [librarySearch, setLibrarySearch] = useState('');
  const [voiceErrorMessage, setVoiceErrorMessage] = useState<string | null>(null);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [showVoiceDropdown, setShowVoiceDropdown] = useState(false);
  const [generationSamples, setGenerationSamples] = useState<GenerationSample[]>([]);
  const [generationRuntime, setGenerationRuntime] = useState<GenerationRuntime | null>(null);
  const [generationElapsedMs, setGenerationElapsedMs] = useState(0);

  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scriptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const topSearchInputRef = useRef<HTMLInputElement>(null);
  const voiceSearchInputRef = useRef<HTMLInputElement>(null);
  const renderPanelRef = useRef<HTMLDivElement>(null);
  const generatedUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      for (const audioUrl of generatedUrlsRef.current) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, []);

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

  useEffect(() => {
    let isCancelled = false;

    const loadVoices = async () => {
      setIsLoadingVoices(true);

      try {
        const response = await fetchApi('/api/tts/voices');
        const contentType = response.headers.get('content-type') ?? '';

        if (!response.ok) {
          if (contentType.includes('application/json')) {
            const body = await response.json();
            throw new Error(body.error || 'Não foi possível carregar as vozes.');
          }

          throw new Error((await response.text()) || 'Não foi possível carregar as vozes.');
        }

        const body = await response.json();
        const voices = Array.isArray(body.voices)
          ? body.voices.map((voice: Partial<VoicePersona> & { code: string }, index: number) => normalizeVoice(voice, index))
          : [];

        if (voices.length === 0) {
          throw new Error('Nenhuma voz foi retornada pelo edge-tts.');
        }

        if (isCancelled) {
          return;
        }

        setAvailableVoices(voices);
        setVoiceErrorMessage(null);
        setState((prev) => ({
          ...prev,
          selectedVoice: voices.find((voice) => voice.code === prev.selectedVoice.code) ?? voices[0],
        }));
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setVoiceErrorMessage(getErrorMessage(error, 'Não foi possível carregar a lista completa de vozes.'));
      } finally {
        if (!isCancelled) {
          setIsLoadingVoices(false);
        }
      }
    };

    void loadVoices();

    return () => {
      isCancelled = true;
    };
  }, []);

  const activeClip = state.history.find((clip) => clip.id === state.activeClipId) ?? null;
  const latestGeneratedClip = state.history.find((clip) => clip.audioUrl) ?? null;
  const primaryClip = activeClip?.audioUrl ? activeClip : latestGeneratedClip;
  const estimatedSegmentCount = estimateSegmentCount(state.script);
  const scriptForEstimate = state.script.trim();
  const plannedGenerationMs = scriptForEstimate
    ? estimateGenerationMs(scriptForEstimate.length, estimatedSegmentCount, generationSamples)
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
  const filteredVoices = availableVoices.filter((voice) => {
    const search = voiceSearch.trim().toLowerCase();

    if (!search) {
      return true;
    }

    return [
      voice.name,
      voice.code,
      voice.locale,
      voice.gender,
      translateGender(voice.gender),
      voice.type,
    ].some((value) => value.toLowerCase().includes(search));
  });
  const filteredHistory = state.history.filter((clip) => {
    const search = librarySearch.trim().toLowerCase();

    if (!search) {
      return true;
    }

    return [
      clip.title,
      clip.voiceCode,
      clip.timestamp,
      String(clip.segmentCount),
    ].some((value) => value.toLowerCase().includes(search));
  });
  const totalLibraryCharacters = state.history.reduce((total, clip) => total + clip.characterCount, 0);
  const totalLibrarySegments = state.history.reduce((total, clip) => total + clip.segmentCount, 0);
  const activeViewTitle = activeView === 'biblioteca'
    ? 'Biblioteca de áudio'
    : activeView === 'vozes'
      ? 'Catálogo de vozes'
      : activeView === 'renderizacao'
        ? 'Configurações de renderização'
        : 'Geração sem título';
  const estimateSummaryLabel = generationRuntime
    ? `Estimativa total desta renderização: ~${formatRuntimeMilliseconds(generationRuntime.estimatedTotalMs)}`
    : scriptForEstimate
      ? `Estimativa atual: ~${formatRuntimeMilliseconds(plannedGenerationMs)}`
      : 'Adicione um texto para ver a estimativa de renderização.';

  const syncActiveClipFromAudio = (ended = false) => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    setState((prev) => {
      if (!prev.activeClipId) {
        return prev;
      }

      let changed = false;
      const nextHistory = prev.history.map((clip) => {
        if (clip.id !== prev.activeClipId) {
          return clip;
        }

        const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
        const nextDuration = duration > 0 ? formatDuration(duration) : clip.duration;
        const nextProgress = ended
          ? 100
          : duration > 0
            ? Math.min(100, (audio.currentTime / duration) * 100)
            : clip.progress;
        const nextIsPlaying = ended ? false : !audio.paused && !audio.ended;

        if (
          clip.duration === nextDuration &&
          Math.abs(clip.progress - nextProgress) < 0.5 &&
          clip.isPlaying === nextIsPlaying
        ) {
          return clip;
        }

        changed = true;
        return {
          ...clip,
          duration: nextDuration,
          progress: nextProgress,
          isPlaying: nextIsPlaying,
        };
      });

      if (!changed) {
        return prev;
      }

      return {
        ...prev,
        history: nextHistory,
      };
    });
  };

  const handleSelectView = (view: AppView) => {
    setActiveView(view);

    if (view === 'criar') {
      setShowVoiceDropdown(false);
      requestAnimationFrame(() => {
        scriptTextareaRef.current?.focus();
      });
      return;
    }

    if (view === 'biblioteca') {
      setShowVoiceDropdown(false);
      requestAnimationFrame(() => {
        topSearchInputRef.current?.focus();
      });
      return;
    }

    if (view === 'vozes') {
      setShowVoiceDropdown(false);
      requestAnimationFrame(() => {
        voiceSearchInputRef.current?.focus();
      });
      return;
    }

    setShowVoiceDropdown(false);
    requestAnimationFrame(() => {
      renderPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handlePolish = async () => {
    if (!state.script.trim()) {
      return;
    }

    setIsPolishing(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 250));
      const polishedText = polishScriptLocally(state.script);
      setState((prev) => ({
        ...prev,
        script: polishedText,
        errorMessage: null,
      }));
    } finally {
      setIsPolishing(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      setState((prev) => ({
        ...prev,
        script: text,
        errorMessage: null,
      }));
      setActiveView('criar');
    } catch {
      setState((prev) => ({
        ...prev,
        errorMessage: 'Não foi possível ler o arquivo selecionado.',
      }));
    } finally {
      event.target.value = '';
    }
  };

  const downloadClip = (clip: AudioClip | null) => {
    if (!clip?.audioUrl) {
      setState((prev) => ({
        ...prev,
        errorMessage: 'Gere seu primeiro MP3 antes de baixá-lo.',
      }));
      return;
    }

    const link = document.createElement('a');
    link.href = clip.audioUrl;
    link.download = buildDownloadName(clip.title);
    link.click();
  };

  const playClip = async (clip: AudioClip) => {
    const audio = audioRef.current;

    if (!audio || !clip.audioUrl) {
      setState((prev) => ({
        ...prev,
        errorMessage: 'Este clipe ainda não possui um arquivo de áudio.',
      }));
      return;
    }

    const shouldReload = state.activeClipId !== clip.id || audio.ended;

    if (shouldReload) {
      audio.src = clip.audioUrl;
      audio.currentTime = 0;
    }

    setState((prev) => ({
      ...prev,
      activeClipId: clip.id,
      errorMessage: null,
      history: prev.history.map((item) => ({
        ...item,
        isPlaying: item.id === clip.id,
      })),
    }));

    try {
      await audio.play();
    } catch {
      setState((prev) => ({
        ...prev,
        errorMessage: 'O áudio foi gerado, mas o navegador bloqueou a reprodução automática. Clique em ouvir ou reproduzir para iniciar.',
        history: prev.history.map((item) => (
          item.id === clip.id
            ? { ...item, isPlaying: false }
            : item
        )),
      }));
    }
  };

  const handleToggleClip = async (clipId: string) => {
    const clip = state.history.find((item) => item.id === clipId);
    const audio = audioRef.current;

    if (!clip || !clip.audioUrl) {
      return;
    }

    if (state.activeClipId === clip.id && audio && !audio.paused && !audio.ended) {
      audio.pause();
      return;
    }

    await playClip(clip);
  };

  const handleGenerate = async () => {
    const script = state.script.trim();

    if (!script) {
      return;
    }

    const startedAt = Date.now();
    const estimatedTotalMs = estimateGenerationMs(script.length, estimateSegmentCount(script), generationSamples);

    setState((prev) => ({
      ...prev,
      isGenerating: true,
      errorMessage: null,
    }));
    setGenerationRuntime({
      startedAt,
      estimatedTotalMs,
      expectedSegments: estimateSegmentCount(script),
      characterCount: script.length,
    });

    try {
      const response = await fetchApi('/api/tts/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: script,
          voice: state.selectedVoice.code,
          rate: toEdgeRate(state.rate),
          pitch: toEdgePitch(state.pitch),
        }),
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
      const safeSegmentCount = Number.isFinite(segmentCount) ? segmentCount : estimateSegmentCount(script);
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
        ...prev.slice(-5),
        {
          durationMs: generationDurationMs,
          segmentCount: safeSegmentCount,
          characterCount: safeCharacterCount,
        },
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
        history: [
          nextClip,
          ...prev.history.map((clip) => ({
            ...clip,
            isPlaying: false,
          })),
        ],
      }));

      if (audio) {
        try {
          await audio.play();
        } catch {
          setState((prev) => ({
            ...prev,
            errorMessage: 'O áudio foi gerado, mas a reprodução automática foi bloqueada. Use o botão ouvir para iniciar.',
            history: prev.history.map((clip) => (
              clip.id === nextClip.id
                ? { ...clip, isPlaying: false }
                : clip
            )),
          }));
        }
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isGenerating: false,
        errorMessage: getErrorMessage(error),
      }));
    } finally {
      setGenerationRuntime(null);
    }
  };

  const handlePreview = async () => {
    if (!primaryClip) {
      setState((prev) => ({
        ...prev,
        errorMessage: 'Gere seu primeiro MP3 antes de ouvi-lo.',
      }));
      return;
    }

    await handleToggleClip(primaryClip.id);
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface text-on-surface overflow-x-hidden font-sans xl:h-screen xl:flex-row xl:overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.rtf"
        className="hidden"
        onChange={handleImportFile}
      />

      <audio
        ref={audioRef}
        preload="metadata"
        onLoadedMetadata={() => syncActiveClipFromAudio(false)}
        onTimeUpdate={() => syncActiveClipFromAudio(false)}
        onPlay={() => syncActiveClipFromAudio(false)}
        onPause={() => syncActiveClipFromAudio(false)}
        onEnded={() => syncActiveClipFromAudio(true)}
      />

      <aside className="w-full shrink-0 border-b border-white/5 px-4 py-4 xl:w-64 xl:border-b-0 xl:border-r xl:px-4 xl:py-8">
        <div className="mb-5 px-1 xl:mb-10 xl:px-2">
          <h1 className="text-xl font-extrabold tracking-tight text-primary-container font-headline">Sonic Pulse</h1>
          <p className="text-xs text-on-surface-variant font-medium mt-1">Estúdio de voz local</p>
        </div>

        <nav className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-1 xl:gap-2">
          <SidebarLink icon={<PlusCircle size={20} />} label="Criar" active={activeView === 'criar'} onClick={() => handleSelectView('criar')} />
          <SidebarLink icon={<Library size={20} />} label="Biblioteca" active={activeView === 'biblioteca'} onClick={() => handleSelectView('biblioteca')} />
          <SidebarLink icon={<Mic2 size={20} />} label="Vozes" active={activeView === 'vozes'} onClick={() => handleSelectView('vozes')} />
          <SidebarLink icon={<Settings2 size={20} />} label="Renderização" active={activeView === 'renderizacao'} onClick={() => handleSelectView('renderizacao')} />
        </nav>

        <div className="mt-4 xl:mt-auto xl:pt-6">
          <div className="p-4 rounded-2xl bg-surface-low border border-white/5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Status local</p>
            <p className="text-sm font-bold text-on-surface">
              {state.isGenerating ? 'Renderização em andamento' : 'Pronto para gerar'}
            </p>
            <p className="mt-2 text-[11px] text-on-surface-variant leading-relaxed">
              {estimateSummaryLabel}
            </p>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="border-b border-white/5 bg-surface/80 px-4 py-4 backdrop-blur-md z-10 sm:px-6 xl:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 text-sm min-w-0">
            <span className="text-on-surface-variant">Projeto /</span>
            <span className="font-medium truncate">{activeViewTitle}</span>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between lg:justify-end lg:gap-6">
            {activeView === 'biblioteca' ? (
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={16} />
                <input
                  ref={topSearchInputRef}
                  type="text"
                  value={librarySearch}
                  onChange={(event) => setLibrarySearch(event.target.value)}
                  placeholder="Buscar clipes por título, voz ou data..."
                  className="bg-surface-low border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary-container w-full sm:w-72 transition-all"
                />
              </div>
            ) : activeView === 'vozes' ? (
              <HeaderChip label={`${availableVoices.length.toLocaleString('pt-BR')} vozes disponíveis`} />
            ) : activeView === 'renderizacao' ? (
              <HeaderChip label={estimatedSegmentCount > 0 ? `${estimatedSegmentCount} trecho(s) previstos` : 'Ajuste a voz e a renderização'} />
            ) : (
              <HeaderChip label={scriptForEstimate ? `Estimativa ~${formatRuntimeMilliseconds(generationRuntime?.estimatedTotalMs ?? plannedGenerationMs)}` : 'Pronto para criar um novo áudio'} />
            )}
            <div className="flex items-center justify-between gap-4 text-on-surface-variant sm:justify-end">
              <button type="button" className="hover:text-primary transition-colors"><Bell size={20} /></button>
              <button type="button" className="hover:text-primary transition-colors"><HelpCircle size={20} /></button>
              <div className="h-8 w-8 rounded-full overflow-hidden border border-white/10">
                <img
                  src="https://picsum.photos/seed/sonic/100/100"
                  alt="Usuário"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto xl:overflow-hidden">
          {activeView === 'criar' ? (
            <div className="grid grid-cols-1 xl:grid-cols-12 xl:h-full xl:overflow-hidden">
              <section className="order-3 border-t border-white/5 p-4 sm:p-6 xl:order-1 xl:col-span-3 xl:border-t-0 xl:border-r xl:overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-headline text-lg font-bold">Histórico recente</h3>
                    <p className="text-xs text-on-surface-variant mt-1">Seus clipes gerados aparecem aqui</p>
                  </div>
                  <span className="text-[10px] font-bold text-on-surface-variant bg-surface-high px-2 py-1 rounded uppercase tracking-wider">
                    {state.history.length} clipes
                  </span>
                </div>

                {state.history.length === 0 ? (
                  <div className="p-5 rounded-2xl bg-surface-low border border-white/5 text-sm text-on-surface-variant leading-relaxed">
                    Os MP3s gerados aparecem aqui. O clipe mais recente vira a prévia ativa automaticamente.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {state.history.map((clip) => (
                      <React.Fragment key={clip.id}>
                        <HistoryItem
                          clip={clip}
                          onToggle={handleToggleClip}
                          onDownload={() => downloadClip(clip)}
                        />
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </section>

              <section className="order-1 border-b border-white/5 p-4 sm:p-6 xl:order-2 xl:col-span-6 xl:border-b-0 xl:border-r xl:p-10 xl:overflow-y-auto flex flex-col">
                <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="font-headline text-2xl font-extrabold tracking-tight">Escreva o roteiro</h2>
                    <p className="text-sm text-on-surface-variant mt-2">
                      Sem limite rígido de 5.000 caracteres. Se o texto for longo, o app divide em partes e monta um único MP3 final automaticamente.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <button
                      onClick={handlePolish}
                      disabled={isPolishing || !state.script.trim()}
                      className="text-sm text-on-surface-variant hover:text-primary transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      {isPolishing ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                      <span>Refinar texto</span>
                    </button>
                    <button type="button" onClick={handleImportClick} className="text-sm text-on-surface-variant hover:text-primary transition-colors flex items-center gap-2">
                      <FileUp size={18} />
                      <span>Importar</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
                  <InfoCard
                    title="Caracteres"
                    value={state.script.length.toLocaleString('pt-BR')}
                    description="O texto pode ultrapassar 5.000 caracteres sem problema."
                    highlight={state.script.length > EDGE_TTS_CHUNK_GUIDE_CHARS}
                  />
                  <InfoCard
                    title="Segmentação"
                    value={estimatedSegmentCount > 0 ? `${estimatedSegmentCount} trecho(s)` : '0 trecho'}
                    description={estimatedSegmentCount > 1 ? 'O backend fará várias requisições e juntará tudo em um único MP3.' : 'O texto atual cabe em uma única requisição.'}
                    highlight={estimatedSegmentCount > 1}
                  />
                  <InfoCard
                    title="Estimativa"
                    value={scriptForEstimate ? `~${formatRuntimeMilliseconds(generationRuntime?.estimatedTotalMs ?? plannedGenerationMs)}` : '--:--'}
                    description={
                      generationRuntime
                        ? 'Estimativa da renderização em andamento, com cronômetro ativo durante o processamento.'
                        : generationSamples.length > 0
                          ? 'Baseada no tamanho do texto e no ritmo das últimas renderizações locais.'
                          : 'Baseada no tamanho do texto e na quantidade prevista de trechos.'
                    }
                    highlight={state.isGenerating}
                  />
                </div>

                {state.errorMessage ? (
                  <div className="mb-6 p-4 rounded-2xl border border-red-400/20 bg-red-500/10 text-sm text-red-100">
                    {state.errorMessage}
                  </div>
                ) : null}

                {generationRuntime ? (
                  <GenerationProgressPanel
                    elapsedMs={generationElapsedMs}
                    estimatedTotalMs={generationRuntime.estimatedTotalMs}
                    remainingMs={generationRemainingMs}
                    characterCount={generationRuntime.characterCount}
                    segmentCount={generationRuntime.expectedSegments}
                    progressPercent={generationProgressPercent}
                    status={generationStatus}
                    usesLearnedEstimate={generationSamples.length > 0}
                  />
                ) : null}

                <div className="relative min-h-[18rem] flex-1 sm:min-h-[22rem]">
                  <textarea
                    ref={scriptTextareaRef}
                    value={state.script}
                    onChange={(event) => setState((prev) => ({
                      ...prev,
                      script: event.target.value,
                    }))}
                    placeholder="Digite ou cole seu texto aqui para começar a gerar a locução..."
                    className="w-full h-full bg-surface-low p-5 sm:p-6 xl:p-8 rounded-2xl border-none focus:ring-1 focus:ring-primary-container/30 text-base sm:text-lg leading-relaxed text-on-surface placeholder:text-on-surface-variant/20 resize-none font-sans transition-all"
                  />
                  <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 xl:right-8">
                    <div className="text-[10px] font-bold text-on-surface-variant bg-surface/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5">
                      <span className={estimatedSegmentCount > 1 ? 'text-secondary-container' : 'text-on-surface'}>
                        {state.script.length.toLocaleString('pt-BR')}
                      </span> CARACTERES
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
                  <div className="max-w-xl text-sm text-on-surface-variant leading-relaxed">
                    {estimatedSegmentCount > 1
                      ? `O texto será dividido automaticamente em aproximadamente ${estimatedSegmentCount} partes antes da concatenação final.`
                      : 'O texto atual será enviado em uma única requisição de síntese.'}
                  </div>
                  <GenerateActionGroup
                    onGenerate={handleGenerate}
                    onDownload={() => downloadClip(primaryClip)}
                    isGenerating={state.isGenerating}
                    canGenerate={Boolean(state.script.trim())}
                    canDownload={Boolean(primaryClip?.audioUrl)}
                    generationElapsedMs={generationElapsedMs}
                    estimateLabel={estimateSummaryLabel}
                  />
                </div>
              </section>

              <section className="order-2 p-4 sm:p-6 xl:order-3 xl:col-span-3 xl:p-8 xl:overflow-y-auto">
                <div ref={renderPanelRef} className="space-y-10">
                  <CompactVoiceSelector
                    showVoiceDropdown={showVoiceDropdown}
                    setShowVoiceDropdown={setShowVoiceDropdown}
                    selectedVoice={state.selectedVoice}
                    voiceSearch={voiceSearch}
                    onVoiceSearchChange={setVoiceSearch}
                    filteredVoices={filteredVoices}
                    onSelectVoice={(voice) => setState((prev) => ({ ...prev, selectedVoice: voice }))}
                    voiceSearchInputRef={voiceSearchInputRef}
                  />

                  {voiceErrorMessage ? (
                    <div className="p-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 text-xs text-amber-100 leading-relaxed">
                      {voiceErrorMessage}
                    </div>
                  ) : null}

                  <div className="space-y-8">
                    <Slider
                      label="Tom"
                      value={state.pitch}
                      onChange={(value) => setState((prev) => ({ ...prev, pitch: value }))}
                      min={-50}
                      max={50}
                      unit="Hz"
                      showSign
                    />
                    <Slider
                      label="Velocidade"
                      value={state.rate}
                      onChange={(value) => setState((prev) => ({ ...prev, rate: value }))}
                      min={0.5}
                      max={2}
                      step={0.05}
                      unit="x"
                    />
                  </div>

                  <div className="p-6 rounded-2xl bg-surface-low border border-white/5 relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
                    <h4 className="text-sm font-bold mb-2">Dica técnica</h4>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      O edge-tts aplica o tom em Hz e a velocidade como porcentagem sobre a voz base. Ajustes sutis costumam soar mais naturais do que extremos.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          ) : activeView === 'biblioteca' ? (
            <div className="h-full overflow-y-auto p-4 sm:p-6 xl:p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                <InfoCard
                  title="Clipes"
                  value={state.history.length.toLocaleString('pt-BR')}
                  description="Todos os arquivos gerados ficam concentrados aqui."
                />
                <InfoCard
                  title="Segmentos"
                  value={totalLibrarySegments.toLocaleString('pt-BR')}
                  description="Total de trechos já processados e concatenados na biblioteca."
                />
                <InfoCard
                  title="Caracteres"
                  value={totalLibraryCharacters.toLocaleString('pt-BR')}
                  description="Volume total de texto já transformado em áudio nesta sessão."
                />
              </div>

              <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.85fr)] gap-6">
                <div className="rounded-3xl border border-white/5 bg-surface-low/40 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="font-headline text-lg font-bold">Biblioteca de áudios</h3>
                      <p className="text-xs text-on-surface-variant mt-1">
                        {librarySearch.trim() ? `${filteredHistory.length} resultado(s) encontrados` : 'Todos os clipes gerados ficam reunidos nesta tela.'}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-on-surface-variant bg-surface-high px-2 py-1 rounded uppercase tracking-wider">
                      {state.history.length} clipes
                    </span>
                  </div>

                  {filteredHistory.length === 0 ? (
                    <div className="p-5 rounded-2xl bg-surface-low border border-white/5 text-sm text-on-surface-variant leading-relaxed">
                      {state.history.length === 0
                        ? 'Os MP3s gerados aparecem aqui. O clipe mais recente vira a prévia ativa automaticamente.'
                        : 'Nenhum clipe corresponde à busca atual.'}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredHistory.map((clip) => (
                        <React.Fragment key={clip.id}>
                          <HistoryItem
                            clip={clip}
                            onToggle={handleToggleClip}
                            onDownload={() => downloadClip(clip)}
                            expanded
                          />
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-3xl border border-white/5 bg-surface-low p-6 h-fit">
                  <LibrarySummaryPanel
                    clip={primaryClip}
                    onPreview={handlePreview}
                    onDownload={() => downloadClip(primaryClip)}
                  />
                </div>
              </div>
            </div>
          ) : activeView === 'vozes' ? (
            <div className="h-full overflow-y-auto p-4 sm:p-6 xl:p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                <InfoCard
                  title="Vozes carregadas"
                  value={availableVoices.length.toLocaleString('pt-BR')}
                  description="Lista completa retornada pelo edge-tts local."
                />
                <InfoCard
                  title="Voz ativa"
                  value={state.selectedVoice.name}
                  description={buildVoiceDetails(state.selectedVoice)}
                />
                <InfoCard
                  title="Busca atual"
                  value={voiceSearch.trim() ? `${filteredVoices.length} resultado(s)` : 'Catálogo completo'}
                  description={voiceSearch.trim() ? `Filtro aplicado: ${voiceSearch}` : 'Use a busca para filtrar por idioma, gênero ou código.'}
                />
              </div>

              <div className="rounded-3xl border border-white/5 bg-surface-low p-4 sm:p-6 h-full min-h-[28rem] lg:min-h-[38rem]">
                <VoiceCatalogPanel
                  voiceSearch={voiceSearch}
                  onVoiceSearchChange={setVoiceSearch}
                  voiceSearchInputRef={voiceSearchInputRef}
                  filteredVoices={filteredVoices}
                  selectedVoice={state.selectedVoice}
                  onSelectVoice={(voice) => setState((prev) => ({ ...prev, selectedVoice: voice }))}
                  isLoadingVoices={isLoadingVoices}
                  voiceErrorMessage={voiceErrorMessage}
                />
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto p-4 sm:p-6 xl:p-8">
              <div ref={renderPanelRef} className="max-w-5xl mx-auto space-y-6">
                <div>
                  <h2 className="font-headline text-2xl font-extrabold tracking-tight">Preparar renderização</h2>
                  <p className="text-sm text-on-surface-variant mt-2">
                    Ajuste voz, tom e velocidade em uma tela focada na saída final. Quando estiver pronto, gere e exporte o MP3 aqui mesmo.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  <InfoCard
                    title="Voz atual"
                    value={state.selectedVoice.name}
                    description={buildVoiceDetails(state.selectedVoice)}
                  />
                  <InfoCard
                    title="Saída final"
                    value={estimatedSegmentCount > 1 ? 'MP3 concatenado' : 'MP3 único'}
                    description={estimatedSegmentCount > 1 ? 'Os trechos gerados são unidos automaticamente antes do download.' : 'Nenhuma concatenação adicional será necessária.'}
                    highlight={estimatedSegmentCount > 1}
                  />
                  <InfoCard
                    title="Estimativa"
                    value={scriptForEstimate ? `~${formatRuntimeMilliseconds(generationRuntime?.estimatedTotalMs ?? plannedGenerationMs)}` : '--:--'}
                    description={generationRuntime ? 'Tempo estimado da renderização atual.' : 'A estimativa aparece conforme o roteiro cresce.'}
                    highlight={state.isGenerating}
                  />
                </div>

                {state.errorMessage ? (
                  <div className="p-4 rounded-2xl border border-red-400/20 bg-red-500/10 text-sm text-red-100">
                    {state.errorMessage}
                  </div>
                ) : null}

                {generationRuntime ? (
                  <GenerationProgressPanel
                    elapsedMs={generationElapsedMs}
                    estimatedTotalMs={generationRuntime.estimatedTotalMs}
                    remainingMs={generationRemainingMs}
                    characterCount={generationRuntime.characterCount}
                    segmentCount={generationRuntime.expectedSegments}
                    progressPercent={generationProgressPercent}
                    status={generationStatus}
                    usesLearnedEstimate={generationSamples.length > 0}
                  />
                ) : null}

                <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
                  <div className="p-4 sm:p-6 rounded-3xl bg-surface-low border border-white/5">
                    <CompactVoiceSelector
                      showVoiceDropdown={showVoiceDropdown}
                      setShowVoiceDropdown={setShowVoiceDropdown}
                      selectedVoice={state.selectedVoice}
                      voiceSearch={voiceSearch}
                      onVoiceSearchChange={setVoiceSearch}
                      filteredVoices={filteredVoices}
                      onSelectVoice={(voice) => setState((prev) => ({ ...prev, selectedVoice: voice }))}
                      voiceSearchInputRef={voiceSearchInputRef}
                    />
                  </div>

                  <div className="p-4 sm:p-6 rounded-3xl bg-surface-low border border-white/5">
                    <div className="space-y-8">
                      <Slider
                        label="Tom"
                        value={state.pitch}
                        onChange={(value) => setState((prev) => ({ ...prev, pitch: value }))}
                        min={-50}
                        max={50}
                        unit="Hz"
                        showSign
                      />
                      <Slider
                        label="Velocidade"
                        value={state.rate}
                        onChange={(value) => setState((prev) => ({ ...prev, rate: value }))}
                        min={0.5}
                        max={2}
                        step={0.05}
                        unit="x"
                      />
                    </div>
                  </div>
                </div>

                {voiceErrorMessage ? (
                  <div className="p-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 text-xs text-amber-100 leading-relaxed">
                    {voiceErrorMessage}
                  </div>
                ) : null}

                <div className="p-6 rounded-3xl bg-surface-low border border-white/5 relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
                  <h4 className="text-sm font-bold mb-2">Estratégia de renderização</h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Textos longos são quebrados em múltiplas sínteses, depois unidos em um único arquivo final. Isso permite entregar um MP3 completo sem cortar o conteúdo.
                  </p>
                </div>

                <div className="flex justify-stretch sm:justify-end">
                  <GenerateActionGroup
                    onGenerate={handleGenerate}
                    onDownload={() => downloadClip(primaryClip)}
                    isGenerating={state.isGenerating}
                    canGenerate={Boolean(state.script.trim())}
                    canDownload={Boolean(primaryClip?.audioUrl)}
                    generationElapsedMs={generationElapsedMs}
                    estimateLabel={estimateSummaryLabel}
                  />
                </div>
              </div>
            </div>
          )}
        </main>

        <footer className="border-t border-primary-container/10 bg-surface-low px-4 py-4 shadow-2xl sm:px-6 xl:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4 lg:w-1/3">
            <div className="h-10 w-10 bg-surface-high rounded-lg flex items-center justify-center">
              <div className="flex items-end gap-0.5 h-4">
                <motion.div animate={{ height: [4, 12, 6, 14, 4] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1 bg-primary rounded-full" />
                <motion.div animate={{ height: [8, 4, 14, 6, 8] }} transition={{ repeat: Infinity, duration: 1.2 }} className="w-1 bg-primary rounded-full" />
                <motion.div animate={{ height: [12, 6, 4, 10, 12] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-1 bg-primary rounded-full" />
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold truncate">{primaryClip?.title || 'Nenhum áudio gerado ainda'}</p>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">
                {primaryClip ? `${primaryClip.voiceCode} · ${primaryClip.duration} · ${primaryClip.segmentCount} parte(s)` : 'Pronto para gerar'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-8">
            <button
              type="button"
              disabled
              className="text-on-surface-variant/40 transition-colors disabled:cursor-not-allowed"
            >
              <SkipBack size={20} />
            </button>
            <button
              type="button"
              onClick={handlePreview}
              disabled={!primaryClip?.audioUrl}
              className="h-12 w-12 flex items-center justify-center rounded-full bg-primary-container text-white shadow-lg shadow-primary-container/30 hover:scale-105 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {primaryClip?.isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
            </button>
            <button
              type="button"
              disabled
              className="text-on-surface-variant/40 transition-colors disabled:cursor-not-allowed"
            >
              <SkipForward size={20} />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:gap-6 lg:w-1/3 lg:justify-end">
            <button
              type="button"
              onClick={handlePreview}
              disabled={!primaryClip?.audioUrl}
              className="flex items-center gap-2 px-4 py-2 text-secondary-container hover:bg-white/5 rounded-lg transition-all font-bold text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play size={14} />
              Ouvir
            </button>
            <button
              type="button"
              onClick={() => downloadClip(primaryClip)}
              disabled={!primaryClip?.audioUrl}
              className="flex items-center gap-2 px-4 py-2 text-on-surface-variant hover:bg-white/5 rounded-lg transition-all font-bold text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={14} />
              Baixar
            </button>
          </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function SidebarLink({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-center transition-all duration-200 group xl:justify-start xl:gap-3 xl:px-4 ${active ? 'text-primary-container font-bold bg-surface-high/50 border-b-2 border-primary-container xl:border-b-0 xl:border-r-2' : 'text-on-surface-variant/60 hover:bg-surface-high'}`}
    >
      <span className={`${active ? 'text-primary-container' : 'group-hover:text-on-surface'}`}>{icon}</span>
      <span className="text-xs sm:text-sm">{label}</span>
    </button>
  );
}

function HeaderChip({ label }: { label: string }) {
  return (
    <div className="w-full rounded-full bg-surface-low border border-white/5 px-4 py-2 text-center text-[11px] font-bold uppercase tracking-widest text-on-surface-variant sm:w-auto sm:text-xs">
      {label}
    </div>
  );
}

function InfoCard({
  title,
  value,
  description,
  highlight = false,
}: {
  title: string;
  value: string;
  description: string;
  highlight?: boolean;
}) {
  return (
    <div className={`p-5 rounded-2xl border ${highlight ? 'border-secondary-container/30 bg-secondary-container/10' : 'border-white/5 bg-surface-low'}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">{title}</p>
      <p className="text-lg font-bold text-on-surface mb-2">{value}</p>
      <p className="text-xs text-on-surface-variant leading-relaxed">{description}</p>
    </div>
  );
}

function GenerateActionGroup({
  onGenerate,
  onDownload,
  isGenerating,
  canGenerate,
  canDownload,
  generationElapsedMs,
  estimateLabel,
}: {
  onGenerate: () => void;
  onDownload: () => void;
  isGenerating: boolean;
  canGenerate: boolean;
  canDownload: boolean;
  generationElapsedMs: number;
  estimateLabel: string;
}) {
  return (
    <div className="flex w-full flex-col gap-3 sm:w-auto sm:items-end">
      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating || !canGenerate}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-primary-container to-primary px-6 py-4 font-bold text-white shadow-lg shadow-primary-container/20 transition-all active:scale-95 hover:shadow-primary-container/40 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-8"
        >
          {isGenerating ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              <span>Gerando {formatRuntimeMilliseconds(generationElapsedMs)}</span>
            </>
          ) : (
            <>
              <Sparkles size={20} />
              <span>Gerar áudio</span>
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onDownload}
          disabled={!canDownload}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-secondary/20 bg-surface-highest px-6 py-4 font-bold text-secondary transition-all active:scale-95 hover:bg-secondary/10 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-8"
        >
          <Download size={20} />
          Exportar MP3
        </button>
      </div>
      <p className="max-w-md text-[11px] leading-relaxed text-on-surface-variant text-left sm:text-right">
        {estimateLabel}
      </p>
    </div>
  );
}

function GenerationProgressPanel({
  elapsedMs,
  estimatedTotalMs,
  remainingMs,
  characterCount,
  segmentCount,
  progressPercent,
  status,
  usesLearnedEstimate,
}: {
  elapsedMs: number;
  estimatedTotalMs: number;
  remainingMs: number;
  characterCount: number;
  segmentCount: number;
  progressPercent: number;
  status: string;
  usesLearnedEstimate: boolean;
}) {
  return (
    <div className="mb-6 rounded-3xl border border-primary-container/20 bg-gradient-to-br from-primary-container/12 via-surface-low to-secondary-container/10 p-4 shadow-lg shadow-primary-container/10 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary-container">Renderização em andamento</p>
          <h3 className="text-lg font-bold mt-2">Seu áudio está sendo preparado</h3>
          <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">{status}</p>
        </div>
        <div className="h-12 w-12 rounded-2xl bg-surface/60 border border-white/10 flex items-center justify-center shrink-0">
          <Loader2 className="animate-spin text-primary-container" size={22} />
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
          <span>Processamento</span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
        <div className="h-2 rounded-full bg-surface-high overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary-container via-primary to-secondary-container transition-[width] duration-700"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="p-4 rounded-2xl bg-surface/70 border border-white/5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Tempo decorrido</p>
          <p className="text-lg font-bold">{formatRuntimeMilliseconds(elapsedMs)}</p>
        </div>
        <div className="p-4 rounded-2xl bg-surface/70 border border-white/5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Estimativa total</p>
          <p className="text-lg font-bold">~{formatRuntimeMilliseconds(estimatedTotalMs)}</p>
        </div>
        <div className="p-4 rounded-2xl bg-surface/70 border border-white/5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Restante aprox.</p>
          <p className="text-lg font-bold">{remainingMs > 0 ? `~${formatRuntimeMilliseconds(remainingMs)}` : 'Finalizando'}</p>
        </div>
        <div className="p-4 rounded-2xl bg-surface/70 border border-white/5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Carga atual</p>
          <p className="text-lg font-bold">{segmentCount} trecho(s)</p>
          <p className="text-[11px] text-on-surface-variant mt-1">{characterCount.toLocaleString('pt-BR')} caracteres</p>
        </div>
      </div>

      <p className="mt-4 text-[11px] text-on-surface-variant leading-relaxed">
        {usesLearnedEstimate
          ? 'A estimativa considera o tamanho do texto e também o ritmo das últimas renderizações feitas nesta sessão.'
          : 'A estimativa considera o tamanho do texto e a quantidade prevista de trechos antes da concatenação final.'}
      </p>
    </div>
  );
}

function CompactVoiceSelector({
  showVoiceDropdown,
  setShowVoiceDropdown,
  selectedVoice,
  voiceSearch,
  onVoiceSearchChange,
  filteredVoices,
  onSelectVoice,
  voiceSearchInputRef,
}: {
  showVoiceDropdown: boolean;
  setShowVoiceDropdown: (value: boolean) => void;
  selectedVoice: VoicePersona;
  voiceSearch: string;
  onVoiceSearchChange: (value: string) => void;
  filteredVoices: VoicePersona[];
  onSelectVoice: (voice: VoicePersona) => void;
  voiceSearchInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div>
      <h3 className="font-headline text-lg font-bold mb-6">Voz e renderização</h3>
      <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em] mb-3 block">Voz selecionada</label>

      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setShowVoiceDropdown(!showVoiceDropdown);
            if (!showVoiceDropdown) {
              requestAnimationFrame(() => {
                voiceSearchInputRef.current?.focus();
              });
            }
          }}
          className="w-full bg-surface-high p-4 rounded-xl flex items-center justify-between hover:bg-surface-highest transition-colors group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl">{selectedVoice.flag}</span>
            <div className="text-left min-w-0">
              <p className="text-sm font-bold group-hover:text-primary transition-colors truncate">{selectedVoice.name}</p>
              <p className="text-[10px] text-on-surface-variant truncate">{buildVoiceDetails(selectedVoice)}</p>
              <p className="text-[10px] text-on-surface-variant truncate">{selectedVoice.code}</p>
            </div>
          </div>
          <ChevronDown size={20} className={`text-on-surface-variant transition-transform shrink-0 ${showVoiceDropdown ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {showVoiceDropdown ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-full left-0 right-0 mt-2 bg-surface-high border border-white/10 rounded-xl overflow-hidden z-20 shadow-2xl"
            >
              <div className="p-3 border-b border-white/5">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={14} />
                  <input
                    ref={voiceSearchInputRef}
                    type="text"
                    value={voiceSearch}
                    onChange={(event) => onVoiceSearchChange(event.target.value)}
                    placeholder="Buscar voz, idioma ou código..."
                    className="w-full bg-surface-low rounded-lg py-2.5 pl-9 pr-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-1 focus:ring-primary-container"
                  />
                </div>
                <p className="text-[10px] text-on-surface-variant mt-2 uppercase tracking-widest">
                  {filteredVoices.length} resultado(s)
                </p>
              </div>

              <div className="max-h-[18rem] overflow-y-auto sm:max-h-[24rem]">
                {filteredVoices.length > 0 ? (
                  filteredVoices.map((voice) => (
                    <button
                      key={voice.id}
                      type="button"
                      onClick={() => {
                        onSelectVoice(voice);
                        onVoiceSearchChange('');
                        setShowVoiceDropdown(false);
                      }}
                      className="w-full p-4 flex items-center gap-3 hover:bg-surface-highest transition-colors text-left border-b border-white/5 last:border-none"
                    >
                      <span className="text-xl">{voice.flag}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">{voice.name}</p>
                        <p className="text-[10px] text-on-surface-variant truncate">{buildVoiceDetails(voice)}</p>
                        <p className="text-[10px] text-on-surface-variant truncate">{voice.code}</p>
                      </div>
                      {selectedVoice.id === voice.id ? <CheckCircle2 size={16} className="ml-auto shrink-0 text-primary" /> : null}
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-sm text-on-surface-variant">
                    Nenhuma voz corresponde à busca atual.
                  </div>
                )}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

function VoiceCatalogPanel({
  voiceSearch,
  onVoiceSearchChange,
  voiceSearchInputRef,
  filteredVoices,
  selectedVoice,
  onSelectVoice,
  isLoadingVoices,
  voiceErrorMessage,
}: {
  voiceSearch: string;
  onVoiceSearchChange: (value: string) => void;
  voiceSearchInputRef: React.RefObject<HTMLInputElement | null>;
  filteredVoices: VoicePersona[];
  selectedVoice: VoicePersona;
  onSelectVoice: (voice: VoicePersona) => void;
  isLoadingVoices: boolean;
  voiceErrorMessage: string | null;
}) {
  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h3 className="font-headline text-lg font-bold">Catálogo de vozes</h3>
        <p className="text-xs text-on-surface-variant mt-1">
          {isLoadingVoices ? 'Carregando vozes do edge-tts...' : `${filteredVoices.length} voz(es) encontradas`}
        </p>
      </div>

      <div className="mb-6 p-5 rounded-2xl bg-surface-low border border-white/5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Voz ativa</p>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{selectedVoice.flag}</span>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate">{selectedVoice.name}</p>
            <p className="text-[10px] text-on-surface-variant truncate">{buildVoiceDetails(selectedVoice)}</p>
            <p className="text-[10px] text-on-surface-variant truncate">{selectedVoice.code}</p>
          </div>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={14} />
        <input
          ref={voiceSearchInputRef}
          type="text"
          value={voiceSearch}
          onChange={(event) => onVoiceSearchChange(event.target.value)}
          placeholder="Buscar voz, idioma, gênero ou código..."
          className="w-full bg-surface-low rounded-xl py-3 pl-9 pr-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-1 focus:ring-primary-container"
        />
      </div>

      {voiceErrorMessage ? (
        <div className="mb-4 p-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 text-xs text-amber-100 leading-relaxed">
          {voiceErrorMessage}
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {filteredVoices.map((voice) => (
          <button
            key={voice.id}
            type="button"
            onClick={() => onSelectVoice(voice)}
            className={`w-full p-4 rounded-2xl border text-left transition-all ${selectedVoice.id === voice.id ? 'border-primary-container bg-primary-container/10 shadow-lg shadow-primary-container/10' : 'border-white/5 bg-surface-low hover:bg-surface-high'}`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{voice.flag}</span>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">{voice.name}</p>
                <p className="text-[10px] text-on-surface-variant truncate">{buildVoiceDetails(voice)}</p>
                <p className="text-[10px] text-on-surface-variant truncate">{voice.code}</p>
              </div>
              {selectedVoice.id === voice.id ? <CheckCircle2 size={16} className="ml-auto shrink-0 text-primary" /> : null}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function LibrarySummaryPanel({
  clip,
  onPreview,
  onDownload,
}: {
  clip: AudioClip | null;
  onPreview: () => void;
  onDownload: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-headline text-lg font-bold mb-2">Detalhes do clipe</h3>
        <p className="text-xs text-on-surface-variant">
          {clip ? 'Use esta área para ouvir, revisar metadados e baixar o arquivo final.' : 'Selecione ou gere um clipe para ver os detalhes aqui.'}
        </p>
      </div>

      <div className="p-6 rounded-2xl bg-surface-low border border-white/5">
        <p className="text-sm font-bold mb-2">{clip?.title || 'Nenhum clipe selecionado'}</p>
        <div className="space-y-2 text-xs text-on-surface-variant">
          <p>Voz: {clip?.voiceCode || 'Ainda não definida'}</p>
          <p>Duração: {clip?.duration || '--:--'}</p>
          <p>Segmentos: {clip ? `${clip.segmentCount} parte(s)` : '--'}</p>
          <p>Caracteres: {clip ? clip.characterCount.toLocaleString('pt-BR') : '--'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={onPreview}
          disabled={!clip?.audioUrl}
          className="px-4 py-3 rounded-xl bg-primary-container text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Ouvir
        </button>
        <button
          type="button"
          onClick={onDownload}
          disabled={!clip?.audioUrl}
          className="px-4 py-3 rounded-xl bg-surface-high border border-white/10 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Baixar
        </button>
      </div>

      <div className="p-6 rounded-2xl bg-surface-low border border-white/5">
        <h4 className="text-sm font-bold mb-2">Biblioteca funcional</h4>
        <p className="text-xs text-on-surface-variant leading-relaxed">
          O menu lateral agora amplia esta área para navegação da biblioteca, enquanto a busca do topo filtra os clipes por título, voz e data.
        </p>
      </div>
    </div>
  );
}

function HistoryItem({
  clip,
  onToggle,
  onDownload,
  expanded = false,
}: {
  clip: AudioClip;
  onToggle: (clipId: string) => void;
  onDownload: () => void;
  expanded?: boolean;
}) {
  const canPlay = Boolean(clip.audioUrl);

  return (
    <div
      onClick={() => {
        if (canPlay) {
          void onToggle(clip.id);
        }
      }}
      className={`p-4 bg-surface-low rounded-xl group transition-all border border-transparent hover:border-white/5 ${canPlay ? 'hover:bg-surface-high cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
    >
      <div className="flex justify-between items-start mb-2">
        <span className={`text-[10px] font-bold uppercase tracking-widest ${clip.isPlaying ? 'text-primary' : 'text-on-surface-variant'}`}>
          {clip.timestamp}
        </span>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onDownload();
          }}
          className="text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <MoreVertical size={14} />
        </button>
      </div>
      <p className="text-sm font-medium mb-2 line-clamp-1 group-hover:text-primary transition-colors">{clip.title}</p>
      <p className="text-[10px] text-on-surface-variant mb-3">
        {clip.voiceCode} · {clip.segmentCount} parte(s) · {clip.characterCount.toLocaleString('pt-BR')} caracteres
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            if (canPlay) {
              void onToggle(clip.id);
            }
          }}
          disabled={!canPlay}
          className={`h-8 w-8 flex items-center justify-center rounded-full transition-all active:scale-90 ${clip.isPlaying ? 'bg-secondary-container text-surface shadow-lg' : 'bg-surface-highest text-on-surface'} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {clip.isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
        </button>
        <div className="flex-1 h-1 bg-surface-highest rounded-full overflow-hidden">
          <div className="h-full bg-secondary-container transition-all" style={{ width: `${clip.progress}%` }} />
        </div>
        <span className="text-[10px] font-bold text-on-surface-variant">{clip.duration}</span>
      </div>
      {expanded ? (
        <div className="mt-3 text-[10px] text-on-surface-variant">
          Biblioteca expandida: clique no clipe para reproduzir e use o painel à direita para baixar.
        </div>
      ) : null}
    </div>
  );
}

function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  showSign = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit: string;
  showSign?: boolean;
}) {
  const percentage = ((value - min) / (max - min)) * 100;
  const values = [min, min + (max - min) / 2, max];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em]">{label}</label>
        <span className="text-xs font-bold text-secondary-container">
          {showSign && value > 0 ? '+' : ''}
          {formatSliderNumber(value)}
          {unit}
        </span>
      </div>
      <div className="relative w-full h-1.5 bg-surface-highest rounded-full group cursor-pointer">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(parseFloat(event.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-secondary/50 to-secondary-container rounded-full" style={{ width: `${percentage}%` }} />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-4 w-4 bg-secondary-container rounded-full shadow-[0_0_10px_rgba(0,218,243,0.4)] transition-transform group-hover:scale-110"
          style={{ left: `calc(${percentage}% - 8px)` }}
        />
      </div>
      <div className="flex justify-between text-[10px] font-bold text-on-surface-variant/30">
        {values.map((item) => (
          <span key={`${label}-${item}`}>
            {showSign && item > 0 ? '+' : ''}
            {formatSliderNumber(item)}
            {unit}
          </span>
        ))}
      </div>
    </div>
  );
}
