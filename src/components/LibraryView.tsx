import type { AppState, AudioClip } from '../types';
import InfoCard from './InfoCard';
import HistoryItem from './HistoryItem';
import LibrarySummaryPanel from './LibrarySummaryPanel';

export default function LibraryView({
  state,
  filteredHistory,
  librarySearch,
  primaryClip,
  handleToggleClip,
  downloadClip,
  deleteClip,
  handlePreview,
}: {
  state: AppState;
  filteredHistory: AudioClip[];
  librarySearch: string;
  primaryClip: AudioClip | null;
  handleToggleClip: (clipId: string) => void;
  downloadClip: (clip: AudioClip | null) => void;
  deleteClip: (clipId: string) => void;
  handlePreview: () => void;
}) {
  const totalLibraryCharacters = state.history.reduce((total, clip) => total + clip.characterCount, 0);
  const totalLibrarySegments = state.history.reduce((total, clip) => total + clip.segmentCount, 0);

  return (
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
                <HistoryItem
                  key={clip.id}
                  clip={clip}
                  onToggle={handleToggleClip}
                  onDownload={() => downloadClip(clip)}
                  onDelete={deleteClip}
                  expanded
                />
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
  );
}
