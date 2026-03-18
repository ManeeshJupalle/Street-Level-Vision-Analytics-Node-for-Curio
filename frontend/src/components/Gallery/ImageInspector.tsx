import { useState, useEffect } from 'react';
import { FiX, FiFlag, FiMapPin, FiClock, FiHash } from 'react-icons/fi';
import ClassBreakdown from './ClassBreakdown';
import type { ResultItem, ModelType } from '../../types';

interface Props {
  item: ResultItem;
  modelType: ModelType | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

type TabKey = 'source' | 'overlay' | 'sidebyside';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const API_BASE = API_URL.replace('/api', '');

export default function ImageInspector({ item, modelType, onClose, onPrev, onNext }: Props) {
  const [tab, setTab] = useState<TabKey>('source');
  const [flagged, setFlagged] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && onPrev) onPrev();
      if (e.key === 'ArrowRight' && onNext) onNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onPrev, onNext]);

  const isDemo = (item as any).demo_mode === true;
  const isSegmentation = 'class_ratios' in item;
  const isDetection = 'detections' in item;

  const imgSrc = item.image_url?.startsWith('/api')
    ? `${API_BASE}${item.image_url}`
    : item.image_url || `https://placehold.co/600x400/e2e8f0/94a3b8?text=${encodeURIComponent(item.image_id)}`;

  const overlayUrl = !isDemo && isSegmentation
    ? `${API_URL}/inference/overlay/${encodeURIComponent(item.image_id)}`
    : null;

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'source', label: 'Source Photo' },
    { key: 'overlay', label: 'CV Overlay' },
    { key: 'sidebyside', label: 'Side by Side' },
  ];

  const breakdownData = isSegmentation
    ? (item as any).class_ratios
    : isDetection
      ? (item as any).object_counts
      : {};

  const SourceImage = () => (
    <div className="rounded-xl overflow-hidden bg-gray-100">
      <img
        src={imgSrc}
        alt={item.image_id}
        className="w-full object-contain max-h-[50vh]"
        onError={(e) => {
          (e.target as HTMLImageElement).src = `https://placehold.co/600x400/e2e8f0/94a3b8?text=${encodeURIComponent(item.image_id)}`;
        }}
      />
    </div>
  );

  const OverlayImage = () => (
    <div className="rounded-xl overflow-hidden bg-gray-100 relative">
      {/* Source image as base */}
      <img
        src={imgSrc}
        alt={item.image_id}
        className="w-full object-contain max-h-[50vh]"
        onError={(e) => {
          (e.target as HTMLImageElement).src = `https://placehold.co/600x400/e2e8f0/94a3b8?text=${encodeURIComponent(item.image_id)}`;
        }}
      />
      {/* Overlay on top with transparency */}
      {overlayUrl && (
        <img
          src={overlayUrl}
          alt="Segmentation overlay"
          className="absolute inset-0 w-full h-full object-contain mix-blend-multiply opacity-60"
        />
      )}
      {!overlayUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <span className="text-white text-sm font-medium bg-black/50 px-3 py-1.5 rounded-lg">
            {isDemo ? 'Demo mode — no real overlay' : 'Overlay not available'}
          </span>
        </div>
      )}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900">{item.image_id}</h2>
              {!isDemo && isSegmentation && (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                  Real Inference
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400">Image Inspector</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFlagged(!flagged)}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                flagged
                  ? 'bg-rose-50 border-rose-200 text-rose-600'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              <FiFlag className="text-sm" />
              {flagged ? 'Flagged' : 'Flag as Incorrect'}
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <FiX />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-3 border-b border-gray-100">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === t.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex gap-6">
            {/* Image area */}
            <div className={tab === 'sidebyside' ? 'w-2/3 grid grid-cols-2 gap-3' : 'w-2/3'}>
              {tab === 'source' && <SourceImage />}
              {tab === 'overlay' && <OverlayImage />}
              {tab === 'sidebyside' && (
                <>
                  <SourceImage />
                  <OverlayImage />
                </>
              )}
            </div>

            {/* Details sidebar */}
            <div className="w-1/3 space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  {isSegmentation ? 'Class Breakdown' : 'Object Counts'}
                </h3>
                <ClassBreakdown data={breakdownData} isRatio={isSegmentation} />
              </div>

              <div className="pt-4 border-t border-gray-100 space-y-2">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Metadata</h3>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <FiHash className="text-gray-400 shrink-0" />
                    <span className="truncate">{item.image_id}</span>
                  </div>
                  {item.latitude != null && item.longitude != null && (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <FiMapPin className="text-gray-400 shrink-0" />
                      {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <FiClock className="text-gray-400 shrink-0" />
                    {modelType ?? 'unknown'} analysis
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
