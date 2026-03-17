import { useState, useMemo } from 'react';
import { FiImage, FiGrid } from 'react-icons/fi';
import GalleryItem from './GalleryItem';
import ImageInspector from './ImageInspector';
import FilterBar from './FilterBar';
import { useFilters } from '../../hooks/useFilters';
import type { ResultItem, ModelType, FilterRule } from '../../types';

interface Props {
  results: ResultItem[];
  modelType: ModelType | null;
  filters: FilterRule[];
  onFiltersChange: (f: FilterRule[]) => void;
}

export default function Gallery({ results, modelType, filters, onFiltersChange }: Props) {
  const [inspecting, setInspecting] = useState<ResultItem | null>(null);
  const { applyFilters } = useFilters();

  const filtered = useMemo(
    () => applyFilters(results, filters),
    [results, filters, applyFilters],
  );

  // Collect all available attributes for filter dropdown
  const attributes = useMemo(() => {
    const set = new Set<string>();
    for (const r of results) {
      if ('class_ratios' in r) {
        Object.keys(r.class_ratios).forEach((k) => set.add(k));
      }
      if ('object_counts' in r) {
        Object.keys(r.object_counts).forEach((k) => set.add(k));
      }
    }
    return Array.from(set).sort();
  }, [results]);

  // Empty state
  if (results.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-8">
        <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-5">
          <FiImage className="text-3xl text-gray-300" />
        </div>
        <h2 className="text-lg font-semibold text-gray-800 mb-1">No results yet</h2>
        <p className="text-sm text-gray-400 max-w-xs">
          Configure a model, data source, and classes in the left panel, then run an
          analysis to see results here.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 pt-5 pb-3 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FiGrid className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-800">Results</h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {filtered.length}
              {filtered.length !== results.length && ` / ${results.length}`}
            </span>
            {filters.length > 0 && (
              <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                {filters.length} filter{filters.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        <FilterBar
          filters={filters}
          onChange={onFiltersChange}
          availableAttributes={attributes}
        />
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50/80">
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
          <div className="text-center py-12">
            <p className="text-sm text-gray-400">
              No results match your filters. Try adjusting or clearing them.
            </p>
          </div>
        )}
      </div>

      {/* Inspector modal */}
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
