import { useState } from 'react';
import { FiX, FiPlus } from 'react-icons/fi';
import type { FilterRule } from '../../types';

interface Props {
  filters: FilterRule[];
  onChange: (f: FilterRule[]) => void;
  availableAttributes: string[];
}

const OPERATORS: FilterRule['operator'][] = ['>', '<', '=', '>=', '<='];

export default function FilterBar({ filters, onChange, availableAttributes }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [attr, setAttr] = useState('');
  const [op, setOp] = useState<FilterRule['operator']>('>');
  const [val, setVal] = useState('');

  const addFilter = () => {
    if (!attr || !val) return;
    const rule: FilterRule = {
      id: `${Date.now()}`,
      attribute: attr,
      operator: op,
      value: parseFloat(val),
    };
    onChange([...filters, rule]);
    setShowForm(false);
    setAttr('');
    setVal('');
  };

  const remove = (id: string) => onChange(filters.filter((f) => f.id !== id));

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {filters.map((f) => (
        <span
          key={f.id}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200 font-medium"
        >
          {f.attribute} {f.operator} {f.value}
          <button onClick={() => remove(f.id)} className="hover:text-rose-500 transition-colors">
            <FiX className="text-[10px]" />
          </button>
        </span>
      ))}

      {showForm ? (
        <div className="flex items-center gap-1.5">
          <select
            value={attr}
            onChange={(e) => setAttr(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-blue-400"
          >
            <option value="">Attribute</option>
            {availableAttributes.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <select
            value={op}
            onChange={(e) => setOp(e.target.value as FilterRule['operator'])}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-blue-400"
          >
            {OPERATORS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
          <input
            type="number"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="value"
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 w-16 bg-white focus:outline-none focus:border-blue-400"
          />
          <button onClick={addFilter} className="text-xs font-semibold text-blue-600 hover:text-blue-800">
            Apply
          </button>
          <button onClick={() => setShowForm(false)} className="text-xs text-gray-400 hover:text-gray-600">
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition-colors font-medium"
        >
          <FiPlus className="text-[10px]" /> Add Filter
        </button>
      )}

      {filters.length > 0 && (
        <button
          onClick={() => onChange([])}
          className="text-xs text-gray-400 hover:text-rose-500 transition-colors font-medium ml-1"
        >
          Clear All
        </button>
      )}
    </div>
  );
}
