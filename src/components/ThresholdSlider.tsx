export function ThresholdSlider({
  value,
  onChange,
  title = "Match threshold",
  hint = "Min. probability Jev must assign",
}: {
  value: number;
  onChange: (v: number) => void;
  title?: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-ink-900/60 px-4 py-2.5 backdrop-blur">
      <div className="leading-tight">
        <p className="font-mono text-[10px] tracking-[0.2em] text-zinc-500 uppercase">{title}</p>
        <p className="text-xs text-zinc-400">{hint}</p>
      </div>
      <input
        type="range"
        min={0.05}
        max={0.95}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-40 accent-[var(--color-accent)]"
        aria-label={title}
      />
      <span className="w-12 text-right font-mono text-lg text-white">{Math.round(value * 100)}%</span>
    </div>
  );
}
