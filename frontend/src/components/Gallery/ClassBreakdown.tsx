import { getClassColor } from '../../constants/classColors';

interface Props {
  data: Record<string, number>;
  isRatio?: boolean;
}

export default function ClassBreakdown({ data, isRatio = true }: Props) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const maxVal = isRatio ? 1 : Math.max(...entries.map(([, v]) => v), 1);

  return (
    <div className="space-y-2">
      {entries.map(([label, value]) => {
        const pct = isRatio ? value * 100 : (value / maxVal) * 100;
        const display = isRatio ? `${(value * 100).toFixed(1)}%` : String(value);
        const color = getClassColor(label);
        return (
          <div key={label}>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-gray-700 font-medium flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                {label}
              </span>
              <span className="text-gray-500">{display}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(pct, 0.5)}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
      {entries.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-2">No data</p>
      )}
    </div>
  );
}
