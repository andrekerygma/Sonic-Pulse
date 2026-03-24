import React, { useRef, useState } from 'react';
import { FileUp, Loader2, Sparkles } from 'lucide-react';
import { EDGE_TTS_CHUNK_GUIDE_CHARS } from '../constants';
import type { AppState, AudioClip, GenerationRuntime, VoicePersona } from '../types';
import { formatRuntimeMilliseconds } from '../utils/formatters';
import { polishScriptLocally } from '../utils/text';
import InfoCard from './InfoCard';
import GenerationProgressPanel from './GenerationProgressPanel';
import GenerateActionGroup from './GenerateActionGroup';
import CompactVoiceSelector from './CompactVoiceSelector';
import Slider from './Slider';
import HistoryItem from './HistoryItem';

export default function CreateView({
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
  handleToggleClip,
  deleteClip,
  showVoiceDropdown,
  setShowVoiceDropdown,
  voiceSearch,
  onVoiceSearchChange,
  filteredVoices,
  voiceErrorMessage,
  voiceSearchInputRef,
  scriptTextareaRef,
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
  handleToggleClip: (clipId: string) => void;
  deleteClip: (clipId: string) => void;
  showVoiceDropdown: boolean;
  setShowVoiceDropdown: (value: boolean) => void;
  voiceSearch: string;
  onVoiceSearchChange: (value: string) => void;
  filteredVoices: VoicePersona[];
  voiceErrorMessage: string | null;
  voiceSearchInputRef: React.RefObject<HTMLInputElement | null>;
  scriptTextareaRef: React.RefObject<HTMLTextAreaElement | null>;
  renderPanelRef: React.RefObject<HTMLDivElement | null>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPolishing, setIsPolishing] = useState(false);

  const handlePolish = () => {
    if (!state.script.trim()) return;
    setIsPolishing(true);
    const polishedText = polishScriptLocally(state.script);
    setState((prev) => ({ ...prev, script: polishedText, errorMessage: null }));
    setIsPolishing(false);
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setState((prev) => ({ ...prev, script: text, errorMessage: null }));
    } catch {
      setState((prev) => ({ ...prev, errorMessage: 'Não foi possível ler o arquivo selecionado.' }));
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 xl:h-full xl:overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.rtf"
        className="hidden"
        onChange={handleImportFile}
      />

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
              <HistoryItem
                key={clip.id}
                clip={clip}
                onToggle={handleToggleClip}
                onDownload={() => downloadClip(clip)}
                onDelete={deleteClip}
              />
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
                : generationSamplesCount > 0
                  ? 'Baseada no tamanho do texto e no ritmo das últimas renderizações locais.'
                  : 'Baseada no tamanho do texto e na quantidade prevista de trechos.'
            }
            highlight={state.isGenerating}
          />
        </div>

        {state.errorMessage && (
          <div className="mb-6 p-4 rounded-2xl border border-red-400/20 bg-red-500/10 text-sm text-red-100">
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

        <div className="relative min-h-[18rem] flex-1 sm:min-h-[22rem]">
          <textarea
            ref={scriptTextareaRef}
            value={state.script}
            onChange={(event) => setState((prev) => ({ ...prev, script: event.target.value }))}
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
            onCancel={state.isGenerating ? cancelGeneration : undefined}
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
            onVoiceSearchChange={onVoiceSearchChange}
            filteredVoices={filteredVoices}
            onSelectVoice={(voice) => setState((prev) => ({ ...prev, selectedVoice: voice }))}
            voiceSearchInputRef={voiceSearchInputRef}
          />

          {voiceErrorMessage && (
            <div className="p-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 text-xs text-amber-100 leading-relaxed">
              {voiceErrorMessage}
            </div>
          )}

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
  );
}
