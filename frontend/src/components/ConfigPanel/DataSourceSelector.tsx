import { useState, useEffect } from 'react';
import { FiMap, FiFolder, FiCheck } from 'react-icons/fi';
import { useDataSource } from '../../hooks/useDataSource';
import LoadingSpinner from '../common/LoadingSpinner';
import type { DataSourceConfig, DataSourceType } from '../../types';

interface Props {
  value: DataSourceConfig | null;
  onChange: (d: DataSourceConfig) => void;
}

const CHICAGO_BBOX = [-87.66, 41.91, -87.62, 41.94];

export default function DataSourceSelector({ value, onChange }: Props) {
  const [mode, setMode] = useState<DataSourceType>('mapillary');
  const [bbox, setBbox] = useState(CHICAGO_BBOX);
  const [limit, setLimit] = useState(100);
  const [folderPath, setFolderPath] = useState('');
  const { coverage, loading: coverageLoading, error, checkCoverage } = useDataSource();

  // Sync config on any input change
  useEffect(() => {
    if (mode === 'mapillary') {
      onChange({ source_type: 'mapillary', bbox, limit });
    } else {
      if (folderPath.trim()) {
        onChange({ source_type: 'folder', folder_path: folderPath, limit });
      }
    }
  }, [mode, bbox, limit, folderPath, onChange]);

  const bboxLabels = ['West', 'South', 'East', 'North'];

  return (
    <div>
      {/* Mode toggle */}
      <div className="flex gap-1 mb-4">
        {[
          { value: 'mapillary' as const, icon: FiMap, label: 'Mapillary API' },
          { value: 'folder' as const, icon: FiFolder, label: 'Local Folder' },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => setMode(opt.value)}
            className={`flex-1 flex items-center justify-center gap-2 text-xs font-medium py-2 rounded-md transition-colors ${
              mode === opt.value
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-300 border border-transparent hover:bg-slate-700/50'
            }`}
          >
            <opt.icon className="text-sm" />
            {opt.label}
          </button>
        ))}
      </div>

      {mode === 'mapillary' ? (
        <div className="space-y-3">
          {/* Bbox inputs */}
          <div className="grid grid-cols-2 gap-2">
            {bbox.map((val, i) => (
              <div key={i}>
                <label className="text-[10px] text-slate-500 uppercase tracking-wider">
                  {bboxLabels[i]}
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={val}
                  onChange={(e) => {
                    const next = [...bbox];
                    next[i] = parseFloat(e.target.value) || 0;
                    setBbox(next);
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 transition-colors"
                />
              </div>
            ))}
          </div>

          {/* Limit slider */}
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-[10px] text-slate-500 uppercase tracking-wider">
                Image limit
              </label>
              <span className="text-xs text-slate-300 font-medium">{limit}</span>
            </div>
            <input
              type="range"
              min={50}
              max={2000}
              step={50}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-indigo-500"
            />
            <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
              <span>50</span>
              <span>2000</span>
            </div>
          </div>

          {/* Check coverage */}
          <button
            onClick={() => checkCoverage(bbox)}
            disabled={coverageLoading}
            className="w-full flex items-center justify-center gap-2 text-xs font-medium py-2 rounded-md border border-slate-600 text-slate-300 hover:bg-slate-700/50 transition-colors disabled:opacity-50"
          >
            {coverageLoading ? (
              <LoadingSpinner size="sm" className="text-slate-400" />
            ) : coverage !== null ? (
              <FiCheck className="text-emerald-400" />
            ) : null}
            {coverage !== null
              ? `~${coverage} images available`
              : 'Check Coverage'}
          </button>

          {error && <p className="text-xs text-rose-400">{error}</p>}
        </div>
      ) : (
        <div>
          <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">
            Folder path
          </label>
          <input
            type="text"
            value={folderPath}
            onChange={(e) => setFolderPath(e.target.value)}
            placeholder="/path/to/images"
            className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
          />
          {value?.source_type === 'folder' && value.folder_path && (
            <div className="flex items-center gap-1 mt-2 text-xs text-emerald-400">
              <FiCheck /> Source configured
            </div>
          )}
        </div>
      )}
    </div>
  );
}
