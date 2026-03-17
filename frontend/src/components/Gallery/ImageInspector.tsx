import { useState, useRef, useEffect } from 'react';
import { FiX, FiFlag, FiMapPin, FiClock, FiHash } from 'react-icons/fi';
import ClassBreakdown from './ClassBreakdown';
import type { ResultItem, ModelType } from '../../types';

interface Props {
  item: ResultItem;
  modelType: ModelType | null;
  onClose: () => void;
}

const OVERLAY_COLORS: Record<string, string> = {
  road: '#808080', sidewalk: '#c8c8c8', building: '#8b4513',
  wall: '#a0a0a0', fence: '#b4b4b4', pole: '#ffd700',
  'traffic light': '#ff0000', 'traffic sign': '#ffff00',
  vegetation: '#00aa00', terrain: '#228b22', sky: '#87ceeb',
  person: '#ff1493', rider: '#ff4500', car: '#0000ff',
  truck: '#000080', bus: '#00bfff', train: '#8a2be2',
  motorcycle: '#ff6347', bicycle: '#00ff7f',
};

type TabKey = 'source' | 'overlay' | 'sidebyside';

export default function ImageInspector({ item, modelType, onClose }: Props) {
  const [tab, setTab] = useState<TabKey>('source');
  const [flagged, setFlagged] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgSrc = item.image_url || `https://placehold.co/600x400/e2e8f0/94a3b8?text=${encodeURIComponent(item.image_id)}`;

  const isSegmentation = 'class_ratios' in item;
  const isDetection = 'detections' in item;

  // Draw detection boxes on canvas
  useEffect(() => {
    if ((tab === 'overlay' || tab === 'sidebyside') && isDetection && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const dets = (item as any).detections ?? [];
        for (const det of dets) {
          const [x1, y1, x2, y2] = det.bbox;
          const color = OVERLAY_COLORS[det.label] || '#00ff00';

          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
          ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

          ctx.fillStyle = color;
          ctx.fillRect(x1, y1 - 20, ctx.measureText(det.label).width + 16, 20);
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 12px Inter, sans-serif';
          ctx.fillText(`${det.label} ${(det.confidence * 100).toFixed(0)}%`, x1 + 4, y1 - 5);
        }
      };
      img.src = imgSrc;
    }
  }, [tab, item, isDetection, imgSrc]);

  // Draw segmentation pseudo-overlay
  useEffect(() => {
    if ((tab === 'overlay' || tab === 'sidebyside') && isSegmentation && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        ctx.globalAlpha = 0.35;

        // Render horizontal bands representing class ratios
        const ratios = (item as any).class_ratios as Record<string, number>;
        const entries = Object.entries(ratios).sort((a, b) => b[1] - a[1]);
        let yOff = 0;
        for (const [label, ratio] of entries) {
          const height = ratio * img.height;
          ctx.fillStyle = OVERLAY_COLORS[label] || '#888888';
          ctx.fillRect(0, yOff, img.width, height);
          yOff += height;
        }
        ctx.globalAlpha = 1.0;

        // Labels
        yOff = 0;
        ctx.font = 'bold 14px Inter, sans-serif';
        for (const [label, ratio] of entries) {
          const height = ratio * img.height;
          if (height > 18) {
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            const tw = ctx.measureText(label).width;
            ctx.fillRect(4, yOff + 4, tw + 8, 18);
            ctx.fillStyle = '#fff';
            ctx.fillText(label, 8, yOff + 17);
          }
          yOff += height;
        }
      };
      img.src = imgSrc;
    }
  }, [tab, item, isSegmentation, imgSrc]);

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
            <h2 className="text-lg font-semibold text-gray-900">{item.image_id}</h2>
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
                  ? 'border-indigo-500 text-indigo-600'
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
            <div className={`${tab === 'sidebyside' ? 'w-2/3 grid grid-cols-2 gap-3' : 'w-2/3'}`}>
              {(tab === 'source' || tab === 'sidebyside') && (
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
              )}
              {(tab === 'overlay' || tab === 'sidebyside') && (
                <div className="rounded-xl overflow-hidden bg-gray-100">
                  <canvas ref={canvasRef} className="w-full object-contain max-h-[50vh]" />
                </div>
              )}
            </div>

            {/* Details sidebar */}
            <div className="w-1/3 space-y-5">
              {/* Breakdown chart */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  {isSegmentation ? 'Class Breakdown' : 'Object Counts'}
                </h3>
                <ClassBreakdown data={breakdownData} isRatio={isSegmentation} />
              </div>

              {/* Metadata */}
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
