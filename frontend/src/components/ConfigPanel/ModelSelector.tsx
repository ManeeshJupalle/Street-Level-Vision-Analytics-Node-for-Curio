import { useState, useEffect } from 'react';
import { FiSearch, FiDownload, FiCheck } from 'react-icons/fi';
import { useModels } from '../../hooks/useModels';
import LoadingSpinner from '../common/LoadingSpinner';
import type { ModelInfo, ModelType, ModelSearchResult } from '../../types';

interface Props {
  selected: ModelInfo | null;
  onSelect: (m: ModelInfo) => void;
}

const TASKS: { label: string; value: ModelType }[] = [
  { label: 'Segmentation', value: 'segmentation' },
  { label: 'Detection', value: 'detection' },
];

export default function ModelSelector({ selected, onSelect }: Props) {
  const [task, setTask] = useState<ModelType>('segmentation');
  const [query, setQuery] = useState('cityscapes');
  const { models, loading, error, searchModels } = useModels();

  useEffect(() => {
    if (query.trim().length >= 2) {
      const t = setTimeout(() => searchModels(task, query), 400);
      return () => clearTimeout(t);
    }
  }, [task, query, searchModels]);

  const handleSelect = (m: ModelSearchResult) => {
    onSelect({
      model_id: m.model_id,
      model_type: task,
      name: m.name,
      description: '',
    });
  };

  const fmtDownloads = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);

  return (
    <div>
      {/* Selected model card */}
      {selected && (
        <div className="mb-3 flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-accent/10 border border-accent/25 shadow-glow">
          <FiCheck className="text-accent-light shrink-0" />
          <span className="text-sm text-slate-200 truncate font-medium">{selected.name}</span>
          <span className="ml-auto shrink-0 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-accent/20 text-accent-light">
            {selected.model_type}
          </span>
        </div>
      )}

      {/* Task pill toggle */}
      <div className="pill-toggle mb-3">
        {TASKS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTask(t.value)}
            className={task === t.value ? 'active' : ''}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search models..."
          className="w-full bg-navy-700/60 border border-white/[0.06] rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/15 transition-all"
        />
        {loading && (
          <LoadingSpinner
            size="sm"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
        )}
      </div>

      {/* Model list */}
      <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-0.5 sidebar-scroll">
        {error && <p className="text-xs text-rose-400 px-1">{error}</p>}
        {!loading && models.length === 0 && !error && (
          <p className="text-xs text-slate-500 text-center py-4">
            {query.length < 2 ? 'Type to search models...' : 'No models found'}
          </p>
        )}
        {models.map((m) => {
          const isSelected = selected?.model_id === m.model_id;
          const org = m.model_id.includes('/') ? m.model_id.split('/')[0] : '';
          return (
            <button
              key={m.model_id}
              onClick={() => handleSelect(m)}
              className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all duration-200 ${
                isSelected
                  ? 'border-accent/40 bg-accent/8 shadow-glow'
                  : 'border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.08] hover:shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] text-slate-200 truncate font-medium">
                  {m.name}
                </span>
                <div className="flex items-center gap-1.5 text-slate-500 shrink-0">
                  <FiDownload className="text-[10px]" />
                  <span className="text-[11px] tabular-nums">{fmtDownloads(m.downloads)}</span>
                </div>
              </div>
              {org && (
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{org}</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
