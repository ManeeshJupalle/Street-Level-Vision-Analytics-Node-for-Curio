import { useState, useRef } from 'react';
import { FiX, FiUpload } from 'react-icons/fi';
import type { ClassConfig } from '../../types';

interface Props {
  value: ClassConfig | null;
  onChange: (c: ClassConfig) => void;
}

const CITYSCAPES_SUGGESTIONS = [
  'vegetation', 'sidewalk', 'road', 'building', 'sky',
  'car', 'person', 'terrain', 'pole', 'fence',
  'truck', 'bus', 'bicycle', 'wall', 'traffic sign',
];

export default function ClassSelector({ value, onChange }: Props) {
  const [mode, setMode] = useState<'prompt' | 'csv'>('prompt');
  const [text, setText] = useState('');
  const [selected, setSelected] = useState<string[]>(value?.classes ?? []);
  const fileRef = useRef<HTMLInputElement>(null);

  const updateClasses = (classes: string[]) => {
    setSelected(classes);
    onChange({ classes, source: mode });
  };

  const addFromText = () => {
    const newClasses = text
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s && !selected.includes(s));
    if (newClasses.length > 0) {
      updateClasses([...selected, ...newClasses]);
      setText('');
    }
  };

  const toggleChip = (cls: string) => {
    if (selected.includes(cls)) {
      updateClasses(selected.filter((c) => c !== cls));
    } else {
      updateClasses([...selected, cls]);
    }
  };

  const removeTag = (cls: string) => updateClasses(selected.filter((c) => c !== cls));

  const handleCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const lines = (evt.target?.result as string).split('\n');
      const classes: string[] = [];
      for (const line of lines.slice(1)) {
        const name = line.split(',')[0]?.trim().toLowerCase();
        if (name) classes.push(name);
      }
      updateClasses(classes);
    };
    reader.readAsText(file);
  };

  return (
    <div>
      {/* Mode toggle */}
      <div className="flex gap-1 mb-3">
        {[
          { value: 'prompt' as const, label: 'Text Prompt' },
          { value: 'csv' as const, label: 'Upload CSV' },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => setMode(opt.value)}
            className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${
              mode === opt.value
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-300 border border-transparent hover:bg-slate-700/50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {mode === 'prompt' ? (
        <>
          {/* Text input */}
          <div className="flex gap-2 mb-3">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addFromText();
                }
              }}
              placeholder="vegetation, sidewalk, building..."
              rows={2}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 resize-none transition-colors"
            />
            <button
              onClick={addFromText}
              className="self-end px-3 py-2 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-md transition-colors"
            >
              Add
            </button>
          </div>

          {/* Suggestion chips */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {CITYSCAPES_SUGGESTIONS.map((cls) => {
              const isActive = selected.includes(cls);
              return (
                <button
                  key={cls}
                  onClick={() => toggleChip(cls)}
                  className={`text-[11px] px-2 py-1 rounded-full border transition-all ${
                    isActive
                      ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                      : 'border-slate-700 text-slate-500 hover:text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {cls}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <div className="mb-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={handleCsv}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-6 border-2 border-dashed border-slate-700 rounded-lg text-sm text-slate-400 hover:border-slate-500 hover:text-slate-300 transition-colors"
          >
            <FiUpload />
            Choose CSV file
          </button>
        </div>
      )}

      {/* Selected tags */}
      {selected.length > 0 && (
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">
            Selected ({selected.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {selected.map((cls) => (
              <span
                key={cls}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/20"
              >
                {cls}
                <button
                  onClick={() => removeTag(cls)}
                  className="hover:text-white transition-colors"
                >
                  <FiX className="text-[10px]" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
