import { useState, useMemo } from 'react';
import { FiGrid, FiLayers, FiBarChart2, FiTrendingUp, FiSearch, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import GalleryItem from './GalleryItem';
import ImageInspector from './ImageInspector';
import FilterBar from './FilterBar';
import { useFilters } from '../../hooks/useFilters';
import type { ResultItem, ModelType, FilterRule, ClassConfig } from '../../types';

interface Props {
  results: ResultItem[];
  modelType: ModelType | null;
  filters: FilterRule[];
  onFiltersChange: (f: FilterRule[]) => void;
  classConfig?: ClassConfig | null;
  jobStatus?: { running: boolean; total: number; processed: number };
}

function SkeletonBar({ w }: { w: string }) {
  return <div className={`skeleton h-3 rounded-full ${w}`} />;
}

function DashboardCard({
  title,
  icon: Icon,
  children,
  className = '',
}: {
  title: string;
  icon: typeof FiGrid;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-card p-5 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Icon className="text-gray-400 text-sm" />
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

// SVG city illustration for empty state
function CityIllustration() {
  return (
    <svg viewBox="0 0 400 200" className="w-full max-w-sm mx-auto opacity-40" fill="none">
      {/* Sky */}
      <rect width="400" height="200" rx="12" fill="#f0f4ff" />
      {/* Buildings */}
      <rect x="20" y="80" width="40" height="120" rx="4" fill="#c7d2fe" />
      <rect x="30" y="60" width="20" height="140" rx="3" fill="#a5b4fc" />
      <rect x="70" y="90" width="50" height="110" rx="4" fill="#ddd6fe" />
      <rect x="130" y="70" width="35" height="130" rx="4" fill="#c7d2fe" />
      <rect x="175" y="100" width="45" height="100" rx="4" fill="#e0e7ff" />
      <rect x="230" y="60" width="30" height="140" rx="3" fill="#a5b4fc" />
      <rect x="270" y="85" width="55" height="115" rx="4" fill="#c7d2fe" />
      <rect x="335" y="95" width="45" height="105" rx="4" fill="#ddd6fe" />
      {/* Windows */}
      {[28, 38].map(x => [90, 105, 120, 135].map(y => (
        <rect key={`${x}-${y}`} x={x} y={y} width="6" height="6" rx="1" fill="#818cf8" opacity="0.3" />
      )))}
      {/* Trees */}
      <circle cx="155" cy="155" r="15" fill="#86efac" opacity="0.5" />
      <rect x="153" y="160" width="4" height="20" rx="2" fill="#a3e635" opacity="0.4" />
      <circle cx="215" cy="150" r="12" fill="#86efac" opacity="0.4" />
      <rect x="213" y="155" width="4" height="18" rx="2" fill="#a3e635" opacity="0.35" />
      {/* Road */}
      <rect x="0" y="185" width="400" height="15" rx="0" fill="#94a3b8" opacity="0.2" />
      <rect x="60" y="190" width="30" height="3" rx="1.5" fill="#cbd5e1" opacity="0.4" />
      <rect x="140" y="190" width="30" height="3" rx="1.5" fill="#cbd5e1" opacity="0.4" />
      <rect x="220" y="190" width="30" height="3" rx="1.5" fill="#cbd5e1" opacity="0.4" />
      <rect x="300" y="190" width="30" height="3" rx="1.5" fill="#cbd5e1" opacity="0.4" />
    </svg>
  );
}

export default function Gallery({ results, modelType, filters, onFiltersChange, classConfig, jobStatus }: Props) {
  const [inspecting, setInspecting] = useState<ResultItem | null>(null);
  const { applyFilters } = useFilters();

  const filtered = useMemo(
    () => applyFilters(results, filters),
    [results, filters, applyFilters],
  );

  const attributes = useMemo(() => {
    const set = new Set<string>();
    for (const r of results) {
      if ('class_ratios' in r) Object.keys(r.class_ratios).forEach((k) => set.add(k));
      if ('object_counts' in r) Object.keys(r.object_counts).forEach((k) => set.add(k));
    }
    return Array.from(set).sort();
  }, [results]);

  // Aggregate top classes across all results
  const topClasses = useMemo(() => {
    if (results.length === 0) return [];
    const sums: Record<string, number> = {};
    let count = 0;
    for (const r of results) {
      if ('class_ratios' in r) {
        for (const [k, v] of Object.entries(r.class_ratios)) {
          sums[k] = (sums[k] || 0) + v;
        }
        count++;
      }
    }
    if (count === 0) return [];
    return Object.entries(sums)
      .map(([label, total]) => ({ label, avg: total / count }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 6);
  }, [results]);

  // Empty state — dashboard with placeholders
  if (results.length === 0 && !jobStatus?.running) {
    return (
      <div className="h-full flex flex-col overflow-hidden bg-[#f8f9fc]">
        <div className="shrink-0 px-8 pt-6 pb-4">
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Analysis Dashboard</h2>
          <p className="text-sm text-gray-400 mt-0.5">Configure and run an analysis to populate results</p>
        </div>

        <div className="flex-1 overflow-y-auto px-8 pb-8">
          {/* Inference error banner */}
          {(jobStatus as any)?.error && (
            <div className="mb-5 flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
              <FiAlertCircle className="text-rose-500 text-lg shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-rose-700">Analysis failed</p>
                <p className="text-xs text-rose-500 mt-0.5">{(jobStatus as any).error}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-5">
            {/* Image source */}
            <DashboardCard title="Image Source Input" icon={FiGrid}>
              <div className="border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center py-10 text-gray-300">
                <FiGrid className="text-3xl mb-2" />
                <span className="text-sm font-medium">Import Image</span>
                <span className="text-xs text-gray-300 mt-1">Source images will appear here</span>
              </div>
            </DashboardCard>

            {/* Deep analysis preview */}
            <DashboardCard title="Deep Analysis Preview" icon={FiLayers}>
              <CityIllustration />
              <p className="text-center text-sm text-gray-400 mt-4 leading-relaxed">
                Configure and run an analysis<br />
                to see results here.
              </p>
              <div className="flex items-center justify-center gap-2 mt-3 text-gray-300">
                <FiSearch className="text-sm" />
                <span className="text-xs">Select a model, data source, and classes in the left panel</span>
              </div>
            </DashboardCard>

            {/* Class prompts */}
            <DashboardCard title="Class Prompts" icon={FiBarChart2}>
              {classConfig && classConfig.classes.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {classConfig.classes.map((c) => (
                    <span key={c} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                      {c}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <SkeletonBar w="w-3/4" />
                  <SkeletonBar w="w-1/2" />
                  <SkeletonBar w="w-2/3" />
                </div>
              )}
            </DashboardCard>

            {/* Top detected classes */}
            <DashboardCard title="Top Detected Classes" icon={FiBarChart2}>
              <div className="space-y-3">
                {['w-4/5', 'w-3/5', 'w-2/5', 'w-1/4'].map((w, i) => (
                  <div key={i}>
                    <SkeletonBar w="w-16" />
                    <div className="mt-1.5 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full skeleton rounded-full ${w}`} />
                    </div>
                  </div>
                ))}
              </div>
            </DashboardCard>
          </div>
        </div>
      </div>
    );
  }

  // Results state — gallery with filter bar and stats
  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#f8f9fc]">
      {/* Header */}
      <div className="shrink-0 px-8 pt-6 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Analysis Dashboard</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              {filtered.length !== results.length && ` of ${results.length}`}
              {filters.length > 0 && (
                <span className="ml-2 text-accent font-medium">
                  {filters.length} filter{filters.length > 1 ? 's' : ''} active
                </span>
              )}
            </p>
          </div>
        </div>
        <FilterBar
          filters={filters}
          onChange={onFiltersChange}
          availableAttributes={attributes}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-8">
        {/* Top classes summary */}
        {topClasses.length > 0 && (
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {topClasses.map((c) => (
              <div key={c.label} className="bg-white rounded-xl border border-gray-100 shadow-card px-3 py-3 text-center">
                <p className="text-lg font-bold text-gray-900 tabular-nums">
                  {(c.avg * 100).toFixed(0)}%
                </p>
                <p className="text-[11px] text-gray-400 font-medium truncate">{c.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Image grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((item, i) => (
            <GalleryItem
              key={item.image_id || i}
              item={item}
              modelType={modelType}
              onClick={() => setInspecting(item)}
            />
          ))}
        </div>

        {filtered.length === 0 && results.length > 0 && (
          <div className="text-center py-16">
            <p className="text-sm text-gray-400">
              No results match your filters. Try adjusting or clearing them.
            </p>
          </div>
        )}
      </div>

      {inspecting && (
        <ImageInspector
          item={inspecting}
          modelType={modelType}
          onClose={() => setInspecting(null)}
        />
      )}
    </div>
  );
}
