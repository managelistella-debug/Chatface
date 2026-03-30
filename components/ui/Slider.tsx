'use client';

interface SliderProps {
  label?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}

export function Slider({ label, value, min = 0, max = 1, step = 0.1, onChange }: SliderProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-primary">{label}</label>
          <span className="text-sm text-muted">{value}</span>
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-surface-hover rounded-lg appearance-none cursor-pointer accent-primary"
      />
    </div>
  );
}
