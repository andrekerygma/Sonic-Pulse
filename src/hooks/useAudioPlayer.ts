import React, { useCallback, useEffect, useRef } from 'react';
import type { AudioClip, AppState } from '../types';
import { formatDuration } from '../utils/formatters';
import { buildDownloadName } from '../utils/text';

export function useAudioPlayer(
  state: AppState,
  setState: React.Dispatch<React.SetStateAction<AppState>>,
) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const generatedUrlsRef = useRef<string[]>([]);
  const lastSyncRef = useRef(0);

  useEffect(() => {
    return () => {
      for (const audioUrl of generatedUrlsRef.current) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, []);

  const syncActiveClipFromAudio = useCallback((ended = false) => {
    const audio = audioRef.current;
    if (!audio) return;

    // Throttle: max 2 syncs per second on timeupdate
    if (!ended) {
      const now = Date.now();
      if (now - lastSyncRef.current < 500) return;
      lastSyncRef.current = now;
    }

    setState((prev) => {
      if (!prev.activeClipId) return prev;

      let changed = false;
      const nextHistory = prev.history.map((clip) => {
        if (clip.id !== prev.activeClipId) return clip;

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
        return { ...clip, duration: nextDuration, progress: nextProgress, isPlaying: nextIsPlaying };
      });

      return changed ? { ...prev, history: nextHistory } : prev;
    });
  }, [setState]);

  const playClip = useCallback(async (clip: AudioClip) => {
    const audio = audioRef.current;
    if (!audio || !clip.audioUrl) {
      setState((prev) => ({ ...prev, errorMessage: 'Este clipe ainda não possui um arquivo de áudio.' }));
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
      history: prev.history.map((item) => ({ ...item, isPlaying: item.id === clip.id })),
    }));

    try {
      await audio.play();
    } catch {
      setState((prev) => ({
        ...prev,
        errorMessage: 'O áudio foi gerado, mas o navegador bloqueou a reprodução automática. Clique em ouvir ou reproduzir para iniciar.',
        history: prev.history.map((item) =>
          item.id === clip.id ? { ...item, isPlaying: false } : item,
        ),
      }));
    }
  }, [state.activeClipId, setState]);

  const handleToggleClip = useCallback(async (clipId: string) => {
    const clip = state.history.find((item) => item.id === clipId);
    const audio = audioRef.current;

    if (!clip || !clip.audioUrl) return;

    if (state.activeClipId === clip.id && audio && !audio.paused && !audio.ended) {
      audio.pause();
      return;
    }

    await playClip(clip);
  }, [state.history, state.activeClipId, playClip]);

  const downloadClip = useCallback((clip: AudioClip | null) => {
    if (!clip?.audioUrl) {
      setState((prev) => ({ ...prev, errorMessage: 'Gere seu primeiro MP3 antes de baixá-lo.' }));
      return;
    }

    const link = document.createElement('a');
    link.href = clip.audioUrl;
    link.download = buildDownloadName(clip.title);
    link.click();
  }, [setState]);

  return {
    audioRef,
    generatedUrlsRef,
    syncActiveClipFromAudio,
    playClip,
    handleToggleClip,
    downloadClip,
  };
}
