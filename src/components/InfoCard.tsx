export default function InfoCard({
  title,
  value,
  description,
  highlight = false,
}: {
  title: string;
  value: string;
  description: string;
  highlight?: boolean;
}) {
  return (
    <div className={`p-5 rounded-2xl border ${highlight ? 'border-secondary-container/30 bg-secondary-container/10' : 'border-white/5 bg-surface-low'}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">{title}</p>
      <p className="text-lg font-bold text-on-surface mb-2">{value}</p>
      <p className="text-xs text-on-surface-variant leading-relaxed">{description}</p>
    </div>
  );
}
