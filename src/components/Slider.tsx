import { formatSliderNumber } from '../utils/formatters';

export default function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  showSign = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit: string;
  showSign?: boolean;
}) {
  const percentage = ((value - min) / (max - min)) * 100;
  const values = [min, min + (max - min) / 2, max];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em]">{label}</label>
        <span className="text-xs font-bold text-secondary-container">
          {showSign && value > 0 ? '+' : ''}
          {formatSliderNumber(value)}
          {unit}
        </span>
      </div>
      <div className="relative w-full h-1.5 bg-surface-highest rounded-full group cursor-pointer">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(parseFloat(event.target.value))}
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-secondary/50 to-secondary-container rounded-full" style={{ width: `${percentage}%` }} />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-4 w-4 bg-secondary-container rounded-full shadow-[0_0_10px_rgba(0,218,243,0.4)] transition-transform group-hover:scale-110"
          style={{ left: `calc(${percentage}% - 8px)` }}
        />
      </div>
      <div className="flex justify-between text-[10px] font-bold text-on-surface-variant/30">
        {values.map((item) => (
          <span key={`${label}-${item}`}>
            {showSign && item > 0 ? '+' : ''}
            {formatSliderNumber(item)}
            {unit}
          </span>
        ))}
      </div>
    </div>
  );
}
