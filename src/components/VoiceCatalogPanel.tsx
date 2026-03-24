import React from 'react';
import { CheckCircle2, Search } from 'lucide-react';
import type { VoicePersona } from '../types';
import { buildVoiceDetails } from '../utils/voice';

export default function VoiceCatalogPanel({
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

      {voiceErrorMessage && (
        <div className="mb-4 p-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 text-xs text-amber-100 leading-relaxed">
          {voiceErrorMessage}
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-3 pr-1" role="listbox" aria-label="Lista de vozes disponíveis">
        {filteredVoices.map((voice) => (
          <button
            key={voice.id}
            type="button"
            role="option"
            aria-selected={selectedVoice.id === voice.id}
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
