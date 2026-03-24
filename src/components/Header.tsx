import React from 'react';
import { Search, User } from 'lucide-react';
import type { AppView } from '../types';
import { formatRuntimeMilliseconds } from '../utils/formatters';

function HeaderChip({ label }: { label: string }) {
  return (
    <div className="w-full rounded-full bg-surface-low border border-white/5 px-4 py-2 text-center text-[11px] font-bold uppercase tracking-widest text-on-surface-variant sm:w-auto sm:text-xs">
      {label}
    </div>
  );
}

export default function Header({
  activeView,
  activeViewTitle,
  librarySearch,
  onLibrarySearchChange,
  topSearchInputRef,
  availableVoicesCount,
  estimatedSegmentCount,
  scriptForEstimate,
  generationEstimateMs,
}: {
  activeView: AppView;
  activeViewTitle: string;
  librarySearch: string;
  onLibrarySearchChange: (value: string) => void;
  topSearchInputRef: React.RefObject<HTMLInputElement | null>;
  availableVoicesCount: number;
  estimatedSegmentCount: number;
  scriptForEstimate: string;
  generationEstimateMs: number;
}) {
  return (
    <header className="border-b border-white/5 bg-surface/80 px-4 py-4 backdrop-blur-md z-10 sm:px-6 xl:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2 text-sm min-w-0">
          <span className="text-on-surface-variant">Projeto /</span>
          <span className="font-medium truncate">{activeViewTitle}</span>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between lg:justify-end lg:gap-6">
          {activeView === 'biblioteca' ? (
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={16} />
              <input
                ref={topSearchInputRef}
                type="text"
                value={librarySearch}
                onChange={(event) => onLibrarySearchChange(event.target.value)}
                placeholder="Buscar clipes por título, voz ou data..."
                className="bg-surface-low border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary-container w-full sm:w-72 transition-all"
              />
            </div>
          ) : activeView === 'vozes' ? (
            <HeaderChip label={`${availableVoicesCount.toLocaleString('pt-BR')} vozes disponíveis`} />
          ) : activeView === 'renderizacao' ? (
            <HeaderChip label={estimatedSegmentCount > 0 ? `${estimatedSegmentCount} trecho(s) previstos` : 'Ajuste a voz e a renderização'} />
          ) : (
            <HeaderChip label={scriptForEstimate ? `Estimativa ~${formatRuntimeMilliseconds(generationEstimateMs)}` : 'Pronto para criar um novo áudio'} />
          )}
          <div className="flex items-center justify-between gap-4 text-on-surface-variant sm:justify-end">
            <div className="h-8 w-8 rounded-full overflow-hidden border border-white/10 bg-surface-high flex items-center justify-center">
              <User size={16} className="text-on-surface-variant" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
