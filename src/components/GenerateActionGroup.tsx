import { Download, Loader2, Sparkles, XCircle } from 'lucide-react';
import { formatRuntimeMilliseconds } from '../utils/formatters';

export default function GenerateActionGroup({
  onGenerate,
  onDownload,
  onCancel,
  isGenerating,
  canGenerate,
  canDownload,
  generationElapsedMs,
  estimateLabel,
}: {
  onGenerate: () => void;
  onDownload: () => void;
  onCancel?: () => void;
  isGenerating: boolean;
  canGenerate: boolean;
  canDownload: boolean;
  generationElapsedMs: number;
  estimateLabel: string;
}) {
  return (
    <div className="flex w-full flex-col gap-3 sm:w-auto sm:items-end">
      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
        {isGenerating && onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-6 py-4 font-bold text-red-300 transition-all active:scale-95 hover:bg-red-500/20 sm:w-auto sm:px-8"
          >
            <XCircle size={20} />
            <span>Cancelar</span>
          </button>
        ) : null}
        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating || !canGenerate}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-primary-container to-primary px-6 py-4 font-bold text-white shadow-lg shadow-primary-container/20 transition-all active:scale-95 hover:shadow-primary-container/40 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-8"
        >
          {isGenerating ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              <span>Gerando {formatRuntimeMilliseconds(generationElapsedMs)}</span>
            </>
          ) : (
            <>
              <Sparkles size={20} />
              <span>Gerar áudio</span>
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onDownload}
          disabled={!canDownload}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-secondary/20 bg-surface-highest px-6 py-4 font-bold text-secondary transition-all active:scale-95 hover:bg-secondary/10 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-8"
        >
          <Download size={20} />
          Exportar MP3
        </button>
      </div>
      <p className="max-w-md text-[11px] leading-relaxed text-on-surface-variant text-left sm:text-right">
        {estimateLabel}
      </p>
    </div>
  );
}
