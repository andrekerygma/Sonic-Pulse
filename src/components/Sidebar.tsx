import type { ReactNode } from 'react';
import { Library, Mic2, PlusCircle, Settings2 } from 'lucide-react';
import { formatRuntimeMilliseconds } from '../utils/formatters';
import type { AppView, GenerationRuntime } from '../types';

function SidebarLink({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-center transition-all duration-200 group xl:justify-start xl:gap-3 xl:px-4 ${active ? 'text-primary-container font-bold bg-surface-high/50 border-b-2 border-primary-container xl:border-b-0 xl:border-r-2' : 'text-on-surface-variant/60 hover:bg-surface-high'}`}
    >
      <span className={`${active ? 'text-primary-container' : 'group-hover:text-on-surface'}`}>{icon}</span>
      <span className="text-xs sm:text-sm">{label}</span>
    </button>
  );
}

export default function Sidebar({
  activeView,
  onSelectView,
  isGenerating,
  estimateSummaryLabel,
}: {
  activeView: AppView;
  onSelectView: (view: AppView) => void;
  isGenerating: boolean;
  estimateSummaryLabel: string;
}) {
  return (
    <aside className="w-full shrink-0 border-b border-white/5 px-4 py-4 xl:w-64 xl:border-b-0 xl:border-r xl:px-4 xl:py-8">
      <div className="mb-5 px-1 xl:mb-10 xl:px-2">
        <h1 className="text-xl font-extrabold tracking-tight text-primary-container font-headline">Sonic Pulse</h1>
        <p className="text-xs text-on-surface-variant font-medium mt-1">Estúdio de voz local</p>
      </div>

      <nav aria-label="Navegação principal" className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-1 xl:gap-2">
        <SidebarLink icon={<PlusCircle size={20} />} label="Criar" active={activeView === 'criar'} onClick={() => onSelectView('criar')} />
        <SidebarLink icon={<Library size={20} />} label="Biblioteca" active={activeView === 'biblioteca'} onClick={() => onSelectView('biblioteca')} />
        <SidebarLink icon={<Mic2 size={20} />} label="Vozes" active={activeView === 'vozes'} onClick={() => onSelectView('vozes')} />
        <SidebarLink icon={<Settings2 size={20} />} label="Renderização" active={activeView === 'renderizacao'} onClick={() => onSelectView('renderizacao')} />
      </nav>

      <div className="mt-4 xl:mt-auto xl:pt-6">
        <div className="p-4 rounded-2xl bg-surface-low border border-white/5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Status local</p>
          <p className="text-sm font-bold text-on-surface">
            {isGenerating ? 'Renderização em andamento' : 'Pronto para gerar'}
          </p>
          <p className="mt-2 text-[11px] text-on-surface-variant leading-relaxed">
            {estimateSummaryLabel}
          </p>
        </div>
      </div>
    </aside>
  );
}
