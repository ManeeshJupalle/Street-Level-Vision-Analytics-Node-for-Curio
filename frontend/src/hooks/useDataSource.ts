import { useState, useCallback } from 'react';
import api from '../services/api';

export function useDataSource() {
  const [coverage, setCoverage] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkCoverage = useCallback(async (bbox: number[]) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/data/mapillary/coverage', { bbox });
      setCoverage(res.data.estimated_count);
    } catch (e: any) {
      setError(e.response?.data?.detail ?? e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { coverage, loading, error, checkCoverage };
}
