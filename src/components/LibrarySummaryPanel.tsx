import type { AudioClip } from '../types';

export default function LibrarySummaryPanel({
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
