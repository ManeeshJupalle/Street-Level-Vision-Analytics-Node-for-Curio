interface Props {
  value: number;
  max: number;
  label?: string;
}

export default function ProgressBar({ value, max, label }: Props) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      {label && (
        <div className="flex justify-between text-xs text-slate-400 mb-1.5">
          <span>{label}</span>
          <span className="font-semibold tabular-nums">{pct}%</span>
        </div>
      )}
      <div className="h-2 bg-navy-600 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-accent to-blue-400 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
