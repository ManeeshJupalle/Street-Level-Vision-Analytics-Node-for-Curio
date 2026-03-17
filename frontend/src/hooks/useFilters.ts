import { useCallback } from 'react';
import type { FilterRule, ResultItem } from '../types';

function getNumericValue(item: ResultItem, attr: string): number | null {
  if ('class_ratios' in item && attr in item.class_ratios) {
    return item.class_ratios[attr] * 100;
  }
  if ('object_counts' in item && attr in item.object_counts) {
    return item.object_counts[attr];
  }
  return null;
}

function matchesFilter(item: ResultItem, f: FilterRule): boolean {
  const val = getNumericValue(item, f.attribute);
  if (val === null) return false;
  switch (f.operator) {
    case '>':  return val > f.value;
    case '<':  return val < f.value;
    case '=':  return Math.abs(val - f.value) < 0.01;
    case '>=': return val >= f.value;
    case '<=': return val <= f.value;
    default:   return true;
  }
}

export function useFilters() {
  const applyFilters = useCallback(
    (items: ResultItem[], filters: FilterRule[]): ResultItem[] => {
      if (filters.length === 0) return items;
      return items.filter((item) => filters.every((f) => matchesFilter(item, f)));
    },
    [],
  );
  return { applyFilters };
}
