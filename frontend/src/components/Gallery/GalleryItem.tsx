import type { ResultItem, ModelType } from '../../types';

interface Props {
  item: ResultItem;
  modelType: ModelType | null;
  onClick: () => void;
}

function getPrimaryMetric(item: ResultItem): { label: string; value: string; level: 'high' | 'mid' | 'low' } {
  if ('class_ratios' in item) {
    const entries = Object.entries(item.class_ratios);
    if (entries.length === 0) return { label: '—', value: '—', level: 'low' };
    entries.sort((a, b) => b[1] - a[1]);
    const [label, ratio] = entries[0];
    const pct = Math.round(ratio * 100);
    return {
      label: label.slice(0, 8),
      value: `${pct}%`,
      level: pct > 40 ? 'high' : pct > 15 ? 'mid' : 'low',
    };
  }
  if ('object_counts' in item) {
    const entries = Object.entries(item.object_counts);
    if (entries.length === 0) return { label: '—', value: '0', level: 'low' };
    entries.sort((a, b) => b[1] - a[1]);
    const [label, count] = entries[0];
    return {
      label: label.slice(0, 8),
      value: String(count),
      level: count > 5 ? 'high' : count > 2 ? 'mid' : 'low',
    };
  }
  return { label: '—', value: '—', level: 'low' };
}

const borderColors = {
  high: 'border-emerald-400 shadow-emerald-100',
  mid: 'border-amber-400 shadow-amber-100',
  low: 'border-gray-200',
};

const badgeBgs = {
  high: 'bg-emerald-500',
  mid: 'bg-amber-500',
  low: 'bg-gray-500',
};

export default function GalleryItem({ item, onClick }: Props) {
  const metric = getPrimaryMetric(item);
  const imgSrc = item.image_url || `https://placehold.co/300x200/e2e8f0/94a3b8?text=${encodeURIComponent(item.image_id)}`;

  return (
    <button
      onClick={onClick}
      className={`group relative bg-white rounded-xl border-2 overflow-hidden shadow-sm hover:shadow-md transition-all text-left ${borderColors[metric.level]}`}
    >
      {/* Thumbnail */}
      <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
        <img
          src={imgSrc}
          alt={item.image_id}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://placehold.co/300x200/e2e8f0/94a3b8?text=${encodeURIComponent(item.image_id)}`;
          }}
        />
      </div>

      {/* Metric badge */}
      <div
        className={`absolute top-2 right-2 px-2 py-0.5 rounded-md text-white text-[11px] font-semibold shadow ${badgeBgs[metric.level]}`}
      >
        {metric.label}: {metric.value}
      </div>

      {/* Footer */}
      <div className="px-3 py-2">
        <p className="text-xs font-medium text-gray-800 truncate">{item.image_id}</p>
        {item.latitude != null && item.longitude != null && (
          <p className="text-[10px] text-gray-400 mt-0.5">
            {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
          </p>
        )}
      </div>
    </button>
  );
}
