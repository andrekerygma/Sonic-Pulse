import React from 'react';
import { CheckCircle2, ChevronDown, Search } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { VoicePersona } from '../types';
import { buildVoiceDetails } from '../utils/voice';

export default function CompactVoiceSelector({
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
          aria-expanded={showVoiceDropdown}
          aria-haspopup="listbox"
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
          {showVoiceDropdown && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              role="listbox"
              aria-label="Lista de vozes"
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
                      role="option"
                      aria-selected={selectedVoice.id === voice.id}
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
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
