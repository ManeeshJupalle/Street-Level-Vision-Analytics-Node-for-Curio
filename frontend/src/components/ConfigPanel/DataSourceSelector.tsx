import { useState, useEffect, useRef } from 'react';
import { FiMapPin, FiFolder, FiCheck, FiCamera } from 'react-icons/fi';
import { useDataSource } from '../../hooks/useDataSource';
import LoadingSpinner from '../common/LoadingSpinner';
import api from '../../services/api';
import type { DataSourceConfig } from '../../types';

type Mode = 'sample' | 'mapillary' | 'folder';

interface Props {
  value: DataSourceConfig | null;
  onChange: (d: DataSourceConfig) => void;
}

const CHICAGO_BBOX = [-87.66, 41.91, -87.62, 41.94];

const MODE_OPTIONS: { value: Mode; icon: typeof FiCamera; label: string }[] = [
  { value: 'sample', icon: FiCamera, label: 'Sample' },
  { value: 'mapillary', icon: FiMapPin, label: 'Mapillary' },
  { value: 'folder', icon: FiFolder, label: 'Folder' },
];

export default function DataSourceSelector({ value, onChange }: Props) {
  const [mode, setMode] = useState<Mode>('sample');
  const [bbox, setBbox] = useState(CHICAGO_BBOX);
  const [limit, setLimit] = useState(100);
  const [folderPath, setFolderPath] = useState('');
  const [sampleCount, setSampleCount] = useState<number | null>(null);
  const { coverage, loading: coverageLoading, error, checkCoverage } = useDataSource();
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    api.get('/data/sample/list').then((res) => {
      setSampleCount(res.data.count ?? 0);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (mode === 'sample') {
      onChangeRef.current({
        source_type: 'folder',
        folder_path: '__sample_images__',
        limit: sampleCount ?? 15,
      });
    } else if (mode === 'mapillary') {
      onChangeRef.current({ source_type: 'mapillary', bbox, limit });
    } else if (folderPath.trim()) {
      onChangeRef.current({ source_type: 'folder', folder_path: folderPath, limit });
    }
  }, [mode, bbox, limit, folderPath, sampleCount]);

  const bboxLabels = ['West', 'South', 'East', 'North'];

  return (
    <div>
      {/* Mode selector — icon buttons */}
      <div className="flex gap-1.5 mb-4">
        {MODE_OPTIONS.map((opt) => {
          const active = mode === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setMode(opt.value)}
              className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2.5 rounded-xl border transition-all duration-200 ${
                active
                  ? 'bg-accent text-white border-accent shadow-md shadow-accent/20'
                  : 'text-slate-400 border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:text-slate-300'
              }`}
            >
              <opt.icon className="text-sm" />
              {opt.label}
            </button>
          );
        })}
      </div>

      {mode === 'sample' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
            <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
              <FiCheck className="text-white text-[10px]" />
            </div>
            <span className="text-sm text-slate-200 font-medium">
              {sampleCount !== null ? `${sampleCount} street images ready` : 'Loading...'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Real Mapillary street-level images. SegFormer runs actual inference on these.
          </p>
        </div>
      )}

      {mode === 'mapillary' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {bbox.map((val, i) => (
              <div key={i}>
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
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
                  className="w-full bg-navy-700/60 border border-white/[0.06] rounded-lg px-2.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-accent/40 transition-all"
                />
              </div>
            ))}
          </div>

          <div>
            <div className="flex justify-between mb-1.5">
              <label className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Image limit</label>
              <span className="text-xs text-slate-300 font-semibold tabular-nums">{limit}</span>
            </div>
            <input
              type="range"
              min={50} max={2000} step={50}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full h-1.5 bg-navy-600 rounded-full appearance-none cursor-pointer accent-accent"
            />
          </div>

          <button
            onClick={() => checkCoverage(bbox)}
            disabled={coverageLoading}
            className="w-full flex items-center justify-center gap-2 text-xs font-medium py-2.5 rounded-xl border border-white/[0.08] text-slate-300 hover:bg-white/[0.04] transition-all disabled:opacity-50"
          >
            {coverageLoading ? (
              <LoadingSpinner size="sm" className="text-slate-400" />
            ) : coverage !== null ? (
              <FiCheck className="text-emerald-400" />
            ) : null}
            {coverage !== null ? `~${coverage} images available` : 'Check Coverage'}
          </button>
          {error && <p className="text-xs text-rose-400">{error}</p>}
        </div>
      )}

      {mode === 'folder' && (
        <div>
          <label className="text-[10px] text-slate-500 uppercase tracking-wider font-medium block mb-1.5">
            Folder path
          </label>
          <input
            type="text"
            value={folderPath}
            onChange={(e) => setFolderPath(e.target.value)}
            placeholder="/path/to/images"
            className="w-full bg-navy-700/60 border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-accent/40 transition-all"
          />
          {value?.source_type === 'folder' && value.folder_path && value.folder_path !== '__sample_images__' && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-400">
              <FiCheck /> Source configured
            </div>
          )}
        </div>
      )}
    </div>
  );
}
