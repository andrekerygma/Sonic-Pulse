import { Download, Pause, Play } from 'lucide-react';
import { motion } from 'motion/react';
import type { AudioClip } from '../types';

export default function Footer({
  primaryClip,
  onPreview,
  onDownload,
}: {
  primaryClip: AudioClip | null;
  onPreview: () => void;
  onDownload: () => void;
}) {
  return (
    <footer className="border-t border-primary-container/10 bg-surface-low px-4 py-4 shadow-2xl sm:px-6 xl:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4 lg:w-1/3">
          <div className="h-10 w-10 bg-surface-high rounded-lg flex items-center justify-center">
            <div className="flex items-end gap-0.5 h-4">
              <motion.div animate={{ height: [4, 12, 6, 14, 4] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1 bg-primary rounded-full" />
              <motion.div animate={{ height: [8, 4, 14, 6, 8] }} transition={{ repeat: Infinity, duration: 1.2 }} className="w-1 bg-primary rounded-full" />
              <motion.div animate={{ height: [12, 6, 4, 10, 12] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-1 bg-primary rounded-full" />
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold truncate">{primaryClip?.title || 'Nenhum áudio gerado ainda'}</p>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">
              {primaryClip ? `${primaryClip.voiceCode} · ${primaryClip.duration} · ${primaryClip.segmentCount} parte(s)` : 'Pronto para gerar'}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-8">
          <button
            type="button"
            onClick={onPreview}
            disabled={!primaryClip?.audioUrl}
            className="h-12 w-12 flex items-center justify-center rounded-full bg-primary-container text-white shadow-lg shadow-primary-container/30 hover:scale-105 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={primaryClip?.isPlaying ? 'Pausar áudio' : 'Reproduzir áudio'}
          >
            {primaryClip?.isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-6 lg:w-1/3 lg:justify-end">
          <button
            type="button"
            onClick={onPreview}
            disabled={!primaryClip?.audioUrl}
            className="flex items-center gap-2 px-4 py-2 text-secondary-container hover:bg-white/5 rounded-lg transition-all font-bold text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play size={14} />
            Ouvir
          </button>
          <button
            type="button"
            onClick={onDownload}
            disabled={!primaryClip?.audioUrl}
            className="flex items-center gap-2 px-4 py-2 text-on-surface-variant hover:bg-white/5 rounded-lg transition-all font-bold text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={14} />
            Baixar
          </button>
        </div>
      </div>
    </footer>
  );
}
