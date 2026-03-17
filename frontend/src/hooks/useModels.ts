import { useState, useCallback } from 'react';
import api from '../services/api';
import type { ModelSearchResult } from '../types';

export function useModels() {
  const [models, setModels] = useState<ModelSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchModels = useCallback(async (task: string, query: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/models/search', { params: { task, query } });
      setModels(res.data.models ?? []);
    } catch (e: any) {
      setError(e.response?.data?.detail ?? e.message);
      setModels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { models, loading, error, searchModels };
}
