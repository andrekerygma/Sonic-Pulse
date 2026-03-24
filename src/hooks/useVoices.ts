import React, { useEffect, useState } from 'react';
import { FALLBACK_VOICES } from '../constants';
import type { AppState, VoicePersona } from '../types';
import { fetchApi, getErrorMessage } from '../utils/api';
import { normalizeVoice, translateGender } from '../utils/voice';

export function useVoices(setState: React.Dispatch<React.SetStateAction<AppState>>) {
  const [availableVoices, setAvailableVoices] = useState<VoicePersona[]>(FALLBACK_VOICES);
  const [voiceSearch, setVoiceSearch] = useState('');
  const [voiceErrorMessage, setVoiceErrorMessage] = useState<string | null>(null);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [showVoiceDropdown, setShowVoiceDropdown] = useState(false);

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

        if (isCancelled) return;

        setAvailableVoices(voices);
        setVoiceErrorMessage(null);
        setState((prev) => ({
          ...prev,
          selectedVoice: voices.find((voice: VoicePersona) => voice.code === prev.selectedVoice.code) ?? voices[0],
        }));
      } catch (error) {
        if (isCancelled) return;
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
  }, [setState]);

  const filteredVoices = availableVoices.filter((voice) => {
    const search = voiceSearch.trim().toLowerCase();
    if (!search) return true;

    return [
      voice.name,
      voice.code,
      voice.locale,
      voice.gender,
      translateGender(voice.gender),
      voice.type,
    ].some((value) => value.toLowerCase().includes(search));
  });

  return {
    availableVoices,
    voiceSearch,
    setVoiceSearch,
    filteredVoices,
    isLoadingVoices,
    voiceErrorMessage,
    showVoiceDropdown,
    setShowVoiceDropdown,
  };
}
