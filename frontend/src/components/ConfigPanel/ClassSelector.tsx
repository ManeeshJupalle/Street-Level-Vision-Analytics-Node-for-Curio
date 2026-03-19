import { useState, useRef } from 'react';
import { FiX, FiUpload } from 'react-icons/fi';
import { getClassDotColor } from '../../constants/classColors';
import type { ClassConfig } from '../../types';

interface Props {
  value: ClassConfig | null;
  onChange: (c: ClassConfig) => void;
}

const CITYSCAPES_SUGGESTIONS = [
  'building', 'road', 'sidewalk', 'vegetation', 'terrain',
  'pole', 'fence', 'wall', 'traffic sign',
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
      {/* Pill toggle */}
      <div className="pill-toggle mb-3">
        {[
          { value: 'prompt' as const, label: 'Text Prompt' },
          { value: 'csv' as const, label: 'Upload CSV' },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => setMode(opt.value)}
            className={mode === opt.value ? 'active' : ''}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {mode === 'prompt' ? (
        <>
          <div className="flex gap-2 mb-3">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); addFromText(); }
              }}
              placeholder="vegetation, sidewalk, building..."
              rows={2}
              className="flex-1 bg-navy-700/60 border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-accent/40 resize-none transition-all"
            />
            <button
              onClick={addFromText}
              className="self-end px-3.5 py-2.5 text-xs font-semibold bg-navy-600 hover:bg-navy-500 text-slate-300 rounded-xl transition-colors"
            >
              Add
            </button>
          </div>

          {/* Suggestion chips */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {CITYSCAPES_SUGGESTIONS.map((cls) => {
              const isActive = selected.includes(cls);
              const dotColor = getClassDotColor(cls);
              return (
                <button
                  key={cls}
                  onClick={() => toggleChip(cls)}
                  className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border transition-all duration-200 ${
                    isActive
                      ? 'bg-accent/15 border-accent/30 text-accent-light'
                      : 'border-white/[0.06] text-slate-500 hover:text-slate-400 hover:border-white/[0.12]'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                  {cls}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <div className="mb-3">
          <input ref={fileRef} type="file" accept=".csv" onChange={handleCsv} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-7 border-2 border-dashed border-white/[0.08] rounded-xl text-sm text-slate-400 hover:border-white/[0.15] hover:text-slate-300 transition-all"
          >
            <FiUpload />
            Choose CSV file
          </button>
        </div>
      )}

      {/* Selected tags with colored dots */}
      {selected.length > 0 && (
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-1.5">
            Selected ({selected.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {selected.map((cls) => {
              const dotColor = getClassDotColor(cls);
              return (
                <span
                  key={cls}
                  className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-accent/10 text-accent-light border border-accent/15"
                >
                  <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                  {cls}
                  <button
                    onClick={() => removeTag(cls)}
                    className="hover:text-white transition-colors ml-0.5"
                  >
                    <FiX className="text-[10px]" />
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
