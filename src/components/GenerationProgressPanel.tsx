import { Loader2, XCircle } from 'lucide-react';
import { formatRuntimeMilliseconds } from '../utils/formatters';

export default function GenerationProgressPanel({
  elapsedMs,
  estimatedTotalMs,
  remainingMs,
  characterCount,
  segmentCount,
  progressPercent,
  status,
  usesLearnedEstimate,
  onCancel,
}: {
  elapsedMs: number;
  estimatedTotalMs: number;
  remainingMs: number;
  characterCount: number;
  segmentCount: number;
  progressPercent: number;
  status: string;
  usesLearnedEstimate: boolean;
  onCancel?: () => void;
}) {
  return (
    <div className="mb-6 rounded-3xl border border-primary-container/20 bg-gradient-to-br from-primary-container/12 via-surface-low to-secondary-container/10 p-4 shadow-lg shadow-primary-container/10 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary-container">Renderização em andamento</p>
          <h3 className="text-lg font-bold mt-2">Seu áudio está sendo preparado</h3>
          <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">{status}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="h-12 w-12 rounded-2xl bg-red-500/20 border border-red-400/20 flex items-center justify-center hover:bg-red-500/30 transition-colors"
              aria-label="Cancelar geração"
            >
              <XCircle size={22} className="text-red-400" />
            </button>
          )}
          <div className="h-12 w-12 rounded-2xl bg-surface/60 border border-white/10 flex items-center justify-center">
            <Loader2 className="animate-spin text-primary-container" size={22} />
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
          <span>Processamento</span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
        <div className="h-2 rounded-full bg-surface-high overflow-hidden" role="progressbar" aria-valuenow={Math.round(progressPercent)} aria-valuemin={0} aria-valuemax={100}>
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary-container via-primary to-secondary-container transition-[width] duration-700"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="p-4 rounded-2xl bg-surface/70 border border-white/5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Tempo decorrido</p>
          <p className="text-lg font-bold">{formatRuntimeMilliseconds(elapsedMs)}</p>
        </div>
        <div className="p-4 rounded-2xl bg-surface/70 border border-white/5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Estimativa total</p>
          <p className="text-lg font-bold">~{formatRuntimeMilliseconds(estimatedTotalMs)}</p>
        </div>
        <div className="p-4 rounded-2xl bg-surface/70 border border-white/5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Restante aprox.</p>
          <p className="text-lg font-bold">{remainingMs > 0 ? `~${formatRuntimeMilliseconds(remainingMs)}` : 'Finalizando'}</p>
        </div>
        <div className="p-4 rounded-2xl bg-surface/70 border border-white/5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Carga atual</p>
          <p className="text-lg font-bold">{segmentCount} trecho(s)</p>
          <p className="text-[11px] text-on-surface-variant mt-1">{characterCount.toLocaleString('pt-BR')} caracteres</p>
        </div>
      </div>

      <p className="mt-4 text-[11px] text-on-surface-variant leading-relaxed">
        {usesLearnedEstimate
          ? 'A estimativa considera o tamanho do texto e também o ritmo das últimas renderizações feitas nesta sessão.'
          : 'A estimativa considera o tamanho do texto e a quantidade prevista de trechos antes da concatenação final.'}
      </p>
    </div>
  );
}
