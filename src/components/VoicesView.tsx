import React from 'react';
import type { AppState, VoicePersona } from '../types';
import { buildVoiceDetails } from '../utils/voice';
import InfoCard from './InfoCard';
import VoiceCatalogPanel from './VoiceCatalogPanel';

export default function VoicesView({
  state,
  setState,
  availableVoices,
  voiceSearch,
  onVoiceSearchChange,
  voiceSearchInputRef,
  filteredVoices,
  isLoadingVoices,
  voiceErrorMessage,
}: {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  availableVoices: VoicePersona[];
  voiceSearch: string;
  onVoiceSearchChange: (value: string) => void;
  voiceSearchInputRef: React.RefObject<HTMLInputElement | null>;
  filteredVoices: VoicePersona[];
  isLoadingVoices: boolean;
  voiceErrorMessage: string | null;
}) {
  return (
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
          onVoiceSearchChange={onVoiceSearchChange}
          voiceSearchInputRef={voiceSearchInputRef}
          filteredVoices={filteredVoices}
          selectedVoice={state.selectedVoice}
          onSelectVoice={(voice) => setState((prev) => ({ ...prev, selectedVoice: voice }))}
          isLoadingVoices={isLoadingVoices}
          voiceErrorMessage={voiceErrorMessage}
        />
      </div>
    </div>
  );
}
