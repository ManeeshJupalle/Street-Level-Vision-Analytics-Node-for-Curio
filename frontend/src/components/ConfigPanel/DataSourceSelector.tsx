import { useState, useEffect, useRef, useCallback } from 'react';
import { FiMapPin, FiFolder, FiCheck, FiCamera, FiSearch } from 'react-icons/fi';
import { useDataSource } from '../../hooks/useDataSource';
import LoadingSpinner from '../common/LoadingSpinner';
import api from '../../services/api';
import type { DataSourceConfig } from '../../types';

type Mode = 'sample' | 'mapillary' | 'folder';

interface Props {
  value: DataSourceConfig | null;
  onChange: (d: DataSourceConfig) => void;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  boundingbox: [string, string, string, string]; // [south, north, west, east]
}

const MODE_OPTIONS: { value: Mode; icon: typeof FiCamera; label: string }[] = [
  { value: 'sample', icon: FiCamera, label: 'Sample' },
  { value: 'mapillary', icon: FiMapPin, label: 'Mapillary' },
  { value: 'folder', icon: FiFolder, label: 'Folder' },
];

export default function DataSourceSelector({ value, onChange }: Props) {
  const [mode, setMode] = useState<Mode>('sample');
  const [bbox, setBbox] = useState<number[]>([-87.66, 41.91, -87.62, 41.94]);
  const [limit, setLimit] = useState(100);
  const [folderPath, setFolderPath] = useState('');
  const [sampleCount, setSampleCount] = useState<number | null>(null);
  const { coverage, loading: coverageLoading, error, checkCoverage } = useDataSource();
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Place search state
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<NominatimResult[]>([]);
  const [placeLoading, setPlaceLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const searchPlace = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setPlaceLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`,
        { headers: { 'User-Agent': 'StreetVisionNode/1.0' } }
      );
      const data: NominatimResult[] = await res.json();
      setPlaceResults(data);
      setShowDropdown(data.length > 0);
    } catch {
      setPlaceResults([]);
    } finally {
      setPlaceLoading(false);
    }
  }, []);

  const selectPlace = (result: NominatimResult) => {
    // Nominatim boundingbox: [south, north, west, east]
    const [south, north, west, east] = result.boundingbox.map(Number);

    // If bbox is too large (> ~0.1 deg), constrain to ~500m radius around center
    const latSpan = north - south;
    const lonSpan = east - west;
    let newBbox: number[];
    if (latSpan > 0.1 || lonSpan > 0.1) {
      const lat = Number(result.lat);
      const lon = Number(result.lon);
      const offset = 0.005; // ~500m
      newBbox = [lon - offset, lat - offset, lon + offset, lat + offset];
    } else {
      newBbox = [west, south, east, north]; // [west, south, east, north]
    }

    setBbox(newBbox);
    setSelectedPlace(result.display_name);
    setShowDropdown(false);
    setPlaceQuery(result.display_name.split(',')[0]); // Show short name in input
  };

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
          {/* Place search bar */}
          <div className="relative" ref={dropdownRef}>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
              <input
                type="text"
                value={placeQuery}
                onChange={(e) => setPlaceQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    searchPlace(placeQuery);
                  }
                }}
                placeholder="Search a city, street, or place..."
                className="w-full bg-navy-700/60 border border-white/[0.06] rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-accent/40 transition-all"
              />
              {placeLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <LoadingSpinner size="sm" className="text-slate-400" />
                </div>
              )}
            </div>

            {/* Dropdown results */}
            {showDropdown && placeResults.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-navy-800 border border-white/[0.1] rounded-xl shadow-xl overflow-hidden">
                {placeResults.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => selectPlace(r)}
                    className="w-full text-left px-3.5 py-2.5 text-sm text-slate-300 hover:bg-white/[0.06] transition-colors border-b border-white/[0.04] last:border-0"
                  >
                    <span className="block truncate">{r.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Show computed bbox in muted text */}
          {selectedPlace && (
            <div className="px-2">
              <p className="text-[10px] text-slate-500 leading-relaxed">
                <span className="font-medium text-slate-400">Bbox:</span>{' '}
                {bbox.map(v => v.toFixed(4)).join(', ')}
              </p>
            </div>
          )}

          {/* Image limit slider */}
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
