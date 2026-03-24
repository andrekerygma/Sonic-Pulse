import { useCallback, useRef, useState } from 'react';
import { FALLBACK_VOICES } from './constants';
import type { AppState, AppView } from './types';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { useVoices } from './hooks/useVoices';
import { useGeneration } from './hooks/useGeneration';
import { usePersistence } from './hooks/usePersistence';
import { loadGenerationSamples, loadHistory, loadPitch, loadRate, loadScript, loadSelectedVoiceCode } from './utils/storage';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Footer from './components/Footer';
import CreateView from './components/CreateView';
import LibraryView from './components/LibraryView';
import VoicesView from './components/VoicesView';
import RenderView from './components/RenderView';

function resolveInitialVoice() {
  const savedCode = loadSelectedVoiceCode();
  if (savedCode) {
    const match = FALLBACK_VOICES.find((v) => v.code === savedCode);
    if (match) return match;
  }
  return FALLBACK_VOICES[0];
}

export default function App() {
  const [state, setState] = useState<AppState>(() => ({
    script: loadScript(),
    pitch: loadPitch() ?? 0,
    rate: loadRate() ?? 1,
    selectedVoice: resolveInitialVoice(),
    history: loadHistory(),
    isGenerating: false,
    activeClipId: null,
    errorMessage: null,
  }));
  const [activeView, setActiveView] = useState<AppView>('criar');
  const [librarySearch, setLibrarySearch] = useState('');

  const scriptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const topSearchInputRef = useRef<HTMLInputElement>(null);
  const voiceSearchInputRef = useRef<HTMLInputElement>(null);
  const renderPanelRef = useRef<HTMLDivElement>(null);

  const { audioRef, generatedUrlsRef, syncActiveClipFromAudio, handleToggleClip, downloadClip } = useAudioPlayer(state, setState);
  const { availableVoices, voiceSearch, setVoiceSearch, filteredVoices, isLoadingVoices, voiceErrorMessage, showVoiceDropdown, setShowVoiceDropdown } = useVoices(setState);

  const initialSamples = useRef(loadGenerationSamples()).current;
  const {
    generationSamples, generationRuntime, generationElapsedMs,
    estimatedSegments, plannedGenerationMs,
    generationProgressPercent, generationStatus, generationRemainingMs,
    estimateSummaryLabel, handleGenerate, cancelGeneration,
  } = useGeneration(state, setState, audioRef, generatedUrlsRef, initialSamples);

  usePersistence(state, generationSamples);

  const activeClip = state.history.find((clip) => clip.id === state.activeClipId) ?? null;
  const latestGeneratedClip = state.history.find((clip) => clip.audioUrl) ?? null;
  const primaryClip = activeClip?.audioUrl ? activeClip : latestGeneratedClip;

  const activeViewTitle = activeView === 'biblioteca' ? 'Biblioteca de áudio'
    : activeView === 'vozes' ? 'Catálogo de vozes'
    : activeView === 'renderizacao' ? 'Configurações de renderização'
    : 'Geração sem título';

  const scriptForEstimate = state.script.trim();

  const handleSelectView = useCallback((view: AppView) => {
    setActiveView(view);
    setShowVoiceDropdown(false);
    requestAnimationFrame(() => {
      if (view === 'criar') scriptTextareaRef.current?.focus();
      else if (view === 'biblioteca') topSearchInputRef.current?.focus();
      else if (view === 'vozes') voiceSearchInputRef.current?.focus();
      else renderPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [setShowVoiceDropdown]);

  const handlePreview = useCallback(async () => {
    if (!primaryClip) {
      setState((prev) => ({ ...prev, errorMessage: 'Gere seu primeiro MP3 antes de ouvi-lo.' }));
      return;
    }
    await handleToggleClip(primaryClip.id);
  }, [primaryClip, handleToggleClip]);

  const deleteClip = useCallback((clipId: string) => {
    setState((prev) => ({
      ...prev,
      history: prev.history.filter((clip) => clip.id !== clipId),
      activeClipId: prev.activeClipId === clipId ? null : prev.activeClipId,
    }));
  }, []);

  const filteredHistory = state.history.filter((clip) => {
    const search = librarySearch.trim().toLowerCase();
    if (!search) return true;
    return [clip.title, clip.voiceCode, clip.timestamp, String(clip.segmentCount)]
      .some((value) => value.toLowerCase().includes(search));
  });

  return (
    <div className="flex min-h-screen flex-col bg-surface text-on-surface overflow-x-hidden font-sans xl:h-screen xl:flex-row xl:overflow-hidden">
      <audio
        ref={audioRef}
        preload="metadata"
        onLoadedMetadata={() => syncActiveClipFromAudio(false)}
        onTimeUpdate={() => syncActiveClipFromAudio(false)}
        onPlay={() => syncActiveClipFromAudio(false)}
        onPause={() => syncActiveClipFromAudio(false)}
        onEnded={() => syncActiveClipFromAudio(true)}
      />

      <Sidebar activeView={activeView} onSelectView={handleSelectView} isGenerating={state.isGenerating} estimateSummaryLabel={estimateSummaryLabel} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          activeView={activeView}
          activeViewTitle={activeViewTitle}
          librarySearch={librarySearch}
          onLibrarySearchChange={setLibrarySearch}
          topSearchInputRef={topSearchInputRef}
          availableVoicesCount={availableVoices.length}
          estimatedSegmentCount={estimatedSegments}
          scriptForEstimate={scriptForEstimate}
          generationEstimateMs={generationRuntime?.estimatedTotalMs ?? plannedGenerationMs}
        />

        <main className="flex-1 overflow-y-auto xl:overflow-hidden">
          {activeView === 'criar' ? (
            <CreateView
              state={state} setState={setState}
              estimatedSegmentCount={estimatedSegments} scriptForEstimate={scriptForEstimate}
              plannedGenerationMs={plannedGenerationMs} generationRuntime={generationRuntime}
              generationElapsedMs={generationElapsedMs} generationRemainingMs={generationRemainingMs}
              generationProgressPercent={generationProgressPercent} generationStatus={generationStatus}
              generationSamplesCount={generationSamples.length} estimateSummaryLabel={estimateSummaryLabel}
              primaryClip={primaryClip} handleGenerate={handleGenerate} cancelGeneration={cancelGeneration}
              downloadClip={downloadClip} handleToggleClip={handleToggleClip} deleteClip={deleteClip}
              showVoiceDropdown={showVoiceDropdown} setShowVoiceDropdown={setShowVoiceDropdown}
              voiceSearch={voiceSearch} onVoiceSearchChange={setVoiceSearch}
              filteredVoices={filteredVoices} voiceErrorMessage={voiceErrorMessage}
              voiceSearchInputRef={voiceSearchInputRef} scriptTextareaRef={scriptTextareaRef}
              renderPanelRef={renderPanelRef}
            />
          ) : activeView === 'biblioteca' ? (
            <LibraryView
              state={state} filteredHistory={filteredHistory} librarySearch={librarySearch}
              primaryClip={primaryClip} handleToggleClip={handleToggleClip}
              downloadClip={downloadClip} deleteClip={deleteClip} handlePreview={handlePreview}
            />
          ) : activeView === 'vozes' ? (
            <VoicesView
              state={state} setState={setState} availableVoices={availableVoices}
              voiceSearch={voiceSearch} onVoiceSearchChange={setVoiceSearch}
              voiceSearchInputRef={voiceSearchInputRef} filteredVoices={filteredVoices}
              isLoadingVoices={isLoadingVoices} voiceErrorMessage={voiceErrorMessage}
            />
          ) : (
            <RenderView
              state={state} setState={setState}
              estimatedSegmentCount={estimatedSegments} scriptForEstimate={scriptForEstimate}
              plannedGenerationMs={plannedGenerationMs} generationRuntime={generationRuntime}
              generationElapsedMs={generationElapsedMs} generationRemainingMs={generationRemainingMs}
              generationProgressPercent={generationProgressPercent} generationStatus={generationStatus}
              generationSamplesCount={generationSamples.length} estimateSummaryLabel={estimateSummaryLabel}
              primaryClip={primaryClip} handleGenerate={handleGenerate} cancelGeneration={cancelGeneration}
              downloadClip={downloadClip}
              showVoiceDropdown={showVoiceDropdown} setShowVoiceDropdown={setShowVoiceDropdown}
              voiceSearch={voiceSearch} onVoiceSearchChange={setVoiceSearch}
              filteredVoices={filteredVoices} voiceErrorMessage={voiceErrorMessage}
              voiceSearchInputRef={voiceSearchInputRef} renderPanelRef={renderPanelRef}
            />
          )}
        </main>

        <Footer primaryClip={primaryClip} onPreview={handlePreview} onDownload={() => downloadClip(primaryClip)} />
      </div>
    </div>
  );
}
