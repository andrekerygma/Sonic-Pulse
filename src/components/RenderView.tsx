import React from 'react';
import type { AppState, AudioClip, GenerationRuntime, VoicePersona } from '../types';
import { formatRuntimeMilliseconds } from '../utils/formatters';
import { buildVoiceDetails } from '../utils/voice';
import InfoCard from './InfoCard';
import GenerationProgressPanel from './GenerationProgressPanel';
import GenerateActionGroup from './GenerateActionGroup';
import CompactVoiceSelector from './CompactVoiceSelector';
import Slider from './Slider';

export default function RenderView({
  state,
  setState,
  estimatedSegmentCount,
  scriptForEstimate,
  plannedGenerationMs,
  generationRuntime,
  generationElapsedMs,
  generationRemainingMs,
  generationProgressPercent,
  generationStatus,
  generationSamplesCount,
  estimateSummaryLabel,
  primaryClip,
  handleGenerate,
  cancelGeneration,
  downloadClip,
  showVoiceDropdown,
  setShowVoiceDropdown,
  voiceSearch,
  onVoiceSearchChange,
  filteredVoices,
  voiceErrorMessage,
  voiceSearchInputRef,
  renderPanelRef,
}: {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  estimatedSegmentCount: number;
  scriptForEstimate: string;
  plannedGenerationMs: number;
  generationRuntime: GenerationRuntime | null;
  generationElapsedMs: number;
  generationRemainingMs: number;
  generationProgressPercent: number;
  generationStatus: string;
  generationSamplesCount: number;
  estimateSummaryLabel: string;
  primaryClip: AudioClip | null;
  handleGenerate: () => void;
  cancelGeneration: () => void;
  downloadClip: (clip: AudioClip | null) => void;
  showVoiceDropdown: boolean;
  setShowVoiceDropdown: (value: boolean) => void;
  voiceSearch: string;
  onVoiceSearchChange: (value: string) => void;
  filteredVoices: VoicePersona[];
  voiceErrorMessage: string | null;
  voiceSearchInputRef: React.RefObject<HTMLInputElement | null>;
  renderPanelRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
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

        {state.errorMessage && (
          <div className="p-4 rounded-2xl border border-red-400/20 bg-red-500/10 text-sm text-red-100">
            {state.errorMessage}
          </div>
        )}

        {generationRuntime && (
          <GenerationProgressPanel
            elapsedMs={generationElapsedMs}
            estimatedTotalMs={generationRuntime.estimatedTotalMs}
            remainingMs={generationRemainingMs}
            characterCount={generationRuntime.characterCount}
            segmentCount={generationRuntime.expectedSegments}
            progressPercent={generationProgressPercent}
            status={generationStatus}
            usesLearnedEstimate={generationSamplesCount > 0}
            onCancel={cancelGeneration}
          />
        )}

        <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
          <div className="p-4 sm:p-6 rounded-3xl bg-surface-low border border-white/5">
            <CompactVoiceSelector
              showVoiceDropdown={showVoiceDropdown}
              setShowVoiceDropdown={setShowVoiceDropdown}
              selectedVoice={state.selectedVoice}
              voiceSearch={voiceSearch}
              onVoiceSearchChange={onVoiceSearchChange}
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

        {voiceErrorMessage && (
          <div className="p-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 text-xs text-amber-100 leading-relaxed">
            {voiceErrorMessage}
          </div>
        )}

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
            onCancel={state.isGenerating ? cancelGeneration : undefined}
            isGenerating={state.isGenerating}
            canGenerate={Boolean(state.script.trim())}
            canDownload={Boolean(primaryClip?.audioUrl)}
            generationElapsedMs={generationElapsedMs}
            estimateLabel={estimateSummaryLabel}
          />
        </div>
      </div>
    </div>
  );
}
