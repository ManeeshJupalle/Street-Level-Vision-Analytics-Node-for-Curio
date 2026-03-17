import { useRef, useCallback } from 'react';
import api from '../services/api';
import type { InferenceRequest, ResultItem } from '../types';

interface JobStatus {
  running: boolean;
  jobId?: string;
  total: number;
  processed: number;
}

export function useInference(
  onStatusChange: (s: JobStatus) => void,
  onResults: (r: ResultItem[]) => void,
) {
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = undefined;
    }
  }, []);

  const runInference = useCallback(
    async (request: InferenceRequest) => {
      stopPolling();
      onStatusChange({ running: true, total: request.data_source.limit, processed: 0 });
      onResults([]);

      try {
        const res = await api.post('/inference/run', request);
        const jobId: string = res.data.job_id;
        onStatusChange({
          running: true,
          jobId,
          total: request.data_source.limit,
          processed: 0,
        });

        pollRef.current = setInterval(async () => {
          try {
            const status = await api.get(`/inference/results/${jobId}`);
            const d = status.data;
            onStatusChange({
              running: d.status === 'queued' || d.status === 'running',
              jobId,
              total: d.total_images,
              processed: d.processed,
            });
            if (d.results?.length) onResults(d.results);
            if (d.status === 'completed' || d.status === 'failed') {
              stopPolling();
              onStatusChange({
                running: false,
                jobId,
                total: d.total_images,
                processed: d.processed,
              });
            }
          } catch {
            stopPolling();
            onStatusChange({ running: false, total: 0, processed: 0 });
          }
        }, 2000);
      } catch (e: any) {
        onStatusChange({ running: false, total: 0, processed: 0 });
        throw e;
      }
    },
    [onStatusChange, onResults, stopPolling],
  );

  return { runInference, stopPolling };
}
