import { useState, useEffect } from 'react';
import { FiSearch, FiDownload, FiCheck } from 'react-icons/fi';
import { useModels } from '../../hooks/useModels';
import LoadingSpinner from '../common/LoadingSpinner';
import Badge from '../common/Badge';
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
      {selected && (
        <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
          <FiCheck className="text-indigo-400 shrink-0" />
          <span className="text-sm text-slate-200 truncate">{selected.name}</span>
          <Badge color="indigo">{selected.model_type}</Badge>
        </div>
      )}

      {/* Task tabs */}
      <div className="flex gap-1 mb-3">
        {TASKS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTask(t.value)}
            className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${
              task === t.value
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-300 border border-transparent hover:bg-slate-700/50'
            }`}
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
          className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-colors"
        />
        {loading && (
          <LoadingSpinner
            size="sm"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
        )}
      </div>

      {/* Results */}
      <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
        {error && <p className="text-xs text-rose-400">{error}</p>}
        {!loading && models.length === 0 && !error && (
          <p className="text-xs text-slate-500 text-center py-4">
            {query.length < 2 ? 'Type to search models...' : 'No models found'}
          </p>
        )}
        {models.map((m) => {
          const isSelected = selected?.model_id === m.model_id;
          return (
            <button
              key={m.model_id}
              onClick={() => handleSelect(m)}
              className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
                isSelected
                  ? 'border-indigo-500/50 bg-indigo-500/10'
                  : 'border-slate-700/50 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-slate-200 truncate font-medium">
                  {m.name}
                </span>
                <div className="flex items-center gap-1 text-slate-500 shrink-0">
                  <FiDownload className="text-[10px]" />
                  <span className="text-[11px]">{fmtDownloads(m.downloads)}</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">{m.model_id}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
