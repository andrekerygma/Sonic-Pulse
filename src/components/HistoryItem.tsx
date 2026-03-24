import { Download, Pause, Play, Trash2 } from 'lucide-react';
import type { AudioClip } from '../types';

export default function HistoryItem({
  clip,
  onToggle,
  onDownload,
  onDelete,
  expanded = false,
}: {
  clip: AudioClip;
  onToggle: (clipId: string) => void;
  onDownload: () => void;
  onDelete?: (clipId: string) => void;
  expanded?: boolean;
}) {
  const canPlay = Boolean(clip.audioUrl);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        if (canPlay) void onToggle(clip.id);
      }}
      onKeyDown={(event) => {
        if ((event.key === 'Enter' || event.key === ' ') && canPlay) {
          event.preventDefault();
          void onToggle(clip.id);
        }
      }}
      className={`p-4 bg-surface-low rounded-xl group transition-all border border-transparent hover:border-white/5 ${canPlay ? 'hover:bg-surface-high cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
    >
      <div className="flex justify-between items-start mb-2">
        <span className={`text-[10px] font-bold uppercase tracking-widest ${clip.isPlaying ? 'text-primary' : 'text-on-surface-variant'}`}>
          {clip.timestamp}
        </span>
        <div className="flex items-center gap-2">
          {onDelete && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onDelete(clip.id);
              }}
              className="text-on-surface-variant hover:text-red-400 transition-colors"
              aria-label={`Excluir clipe ${clip.title}`}
            >
              <Trash2 size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDownload();
            }}
            disabled={!clip.audioUrl}
            className="text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-50"
            aria-label={`Baixar ${clip.title}`}
          >
            <Download size={14} />
          </button>
        </div>
      </div>
      <p className="text-sm font-medium mb-2 line-clamp-1 group-hover:text-primary transition-colors">{clip.title}</p>
      <p className="text-[10px] text-on-surface-variant mb-3">
        {clip.voiceCode} · {clip.segmentCount} parte(s) · {clip.characterCount.toLocaleString('pt-BR')} caracteres
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            if (canPlay) void onToggle(clip.id);
          }}
          disabled={!canPlay}
          className={`h-8 w-8 flex items-center justify-center rounded-full transition-all active:scale-90 ${clip.isPlaying ? 'bg-secondary-container text-surface shadow-lg' : 'bg-surface-highest text-on-surface'} disabled:opacity-50 disabled:cursor-not-allowed`}
          aria-label={clip.isPlaying ? 'Pausar' : 'Reproduzir'}
        >
          {clip.isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
        </button>
        <div className="flex-1 h-1 bg-surface-highest rounded-full overflow-hidden">
          <div className="h-full bg-secondary-container transition-all" style={{ width: `${clip.progress}%` }} />
        </div>
        <span className="text-[10px] font-bold text-on-surface-variant">{clip.duration}</span>
      </div>
      {expanded && (
        <div className="mt-3 text-[10px] text-on-surface-variant">
          Biblioteca expandida: clique no clipe para reproduzir e use o painel à direita para baixar.
        </div>
      )}
    </div>
  );
}
