import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BoxLifecycleHook } from '../../registry/types';

const API_BASE = 'http://localhost:8000/api';
const STANDALONE_URL = 'http://localhost:5173';

interface JobInfo {
  job_id: string | null;
  status: 'idle' | 'queued' | 'running' | 'completed' | 'failed';
  total_images: number;
  processed: number;
}

/**
 * Street Vision node lifecycle hook.
 *
 * Renders a compact control panel inside the Curio canvas that:
 * - Shows backend connection status
 * - Opens the standalone Street Vision app for configuration
 * - Fetches inference results as GeoJSON and pushes downstream
 */
export const useStreetVisionLifecycle: BoxLifecycleHook = (data, _boxState) => {
  const [backendUp, setBackendUp] = useState(false);
  const [job, setJob] = useState<JobInfo>({
    job_id: null, status: 'idle', total_images: 0, processed: 0,
  });
  const [fetching, setFetching] = useState(false);
  const [lastPushed, setLastPushed] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  // Check backend health
  useEffect(() => {
    const check = () => {
      fetch(`${API_BASE}/health`)
        .then((r) => r.json())
        .then(() => setBackendUp(true))
        .catch(() => setBackendUp(false));
    };
    check();
    const iv = setInterval(check, 10000);
    return () => clearInterval(iv);
  }, []);

  // Poll latest job status
  useEffect(() => {
    const poll = () => {
      fetch(`${API_BASE}/inference/latest`)
        .then((r) => r.json())
        .then((d) => {
          if (d.job_id) {
            setJob({
              job_id: d.job_id,
              status: d.status,
              total_images: d.total_images,
              processed: d.processed,
            });
          }
        })
        .catch(() => {});
    };
    pollRef.current = setInterval(poll, 3000);
    return () => clearInterval(pollRef.current);
  }, []);

  // Open standalone app
  const handleLaunch = useCallback(() => {
    window.open(STANDALONE_URL, 'street-vision', 'width=1400,height=900');
  }, []);

  // Fetch results as GeoJSON and push downstream
  const handleFetchResults = useCallback(() => {
    if (!job.job_id) return;
    setFetching(true);
    fetch(`${API_BASE}/inference/results/${job.job_id}/geojson`)
      .then((r) => r.json())
      .then((geojson) => {
        // Push through Curio's data flow
        data.outputCallback(data.nodeId, JSON.stringify(geojson));
        setLastPushed(geojson.features?.length || 0);
        setFetching(false);
      })
      .catch(() => setFetching(false));
  }, [job.job_id, data]);

  // Styles matching Curio's MUI-based aesthetic
  const styles: Record<string, React.CSSProperties> = {
    container: {
      padding: '12px 14px',
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      fontSize: 13,
      color: '#333',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 2,
    },
    logo: {
      width: 28,
      height: 28,
      borderRadius: 6,
      background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontSize: 14,
      fontWeight: 700,
      flexShrink: 0,
    },
    title: {
      fontSize: 14,
      fontWeight: 600,
      color: '#1a1a2e',
      lineHeight: 1.2,
    },
    subtitle: {
      fontSize: 10,
      color: '#888',
      marginTop: 1,
    },
    statusRow: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 11,
      color: '#666',
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      flexShrink: 0,
    },
    btn: {
      padding: '8px 12px',
      border: 'none',
      borderRadius: 8,
      fontSize: 12,
      fontWeight: 600,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      transition: 'all 0.15s',
    },
    launchBtn: {
      background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
      color: '#fff',
    },
    fetchBtn: {
      background: '#f0fdf4',
      color: '#166534',
      border: '1px solid #bbf7d0',
    },
    fetchBtnDisabled: {
      background: '#f3f4f6',
      color: '#9ca3af',
      border: '1px solid #e5e7eb',
      cursor: 'not-allowed',
    },
    jobCard: {
      background: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: 8,
      padding: '8px 10px',
      fontSize: 11,
    },
    progressBar: {
      height: 4,
      background: '#e2e8f0',
      borderRadius: 2,
      overflow: 'hidden',
      marginTop: 4,
    },
    progressFill: {
      height: '100%',
      background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
      borderRadius: 2,
      transition: 'width 0.3s',
    },
    badge: {
      display: 'inline-block',
      padding: '2px 6px',
      borderRadius: 4,
      fontSize: 10,
      fontWeight: 600,
    },
  };

  const statusColor = backendUp ? '#22c55e' : '#ef4444';
  const statusText = backendUp ? 'Backend connected' : 'Backend offline';

  const jobStatusColors: Record<string, string> = {
    idle: '#94a3b8',
    queued: '#f59e0b',
    running: '#3b82f6',
    completed: '#22c55e',
    failed: '#ef4444',
  };

  const canFetch = job.status === 'completed' && job.job_id;
  const pct = job.total_images > 0 ? Math.round((job.processed / job.total_images) * 100) : 0;

  const contentComponent = (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logo}>SV</div>
        <div>
          <div style={styles.title}>Street Vision</div>
          <div style={styles.subtitle}>Urban image analysis</div>
        </div>
      </div>

      {/* Connection status */}
      <div style={styles.statusRow}>
        <div style={{ ...styles.dot, background: statusColor }} />
        {statusText}
      </div>

      {/* Launch button */}
      <button
        style={{ ...styles.btn, ...styles.launchBtn }}
        onClick={handleLaunch}
        title="Opens the Street Vision configuration UI"
      >
        Configure &amp; Run Analysis
      </button>

      {/* Job status */}
      {job.job_id && (
        <div style={styles.jobCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              <span
                style={{
                  ...styles.badge,
                  background: jobStatusColors[job.status] + '20',
                  color: jobStatusColors[job.status],
                }}
              >
                {job.status}
              </span>
            </span>
            <span style={{ color: '#94a3b8' }}>
              {job.processed}/{job.total_images} images
            </span>
          </div>
          {job.status === 'running' && (
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${pct}%` }} />
            </div>
          )}
        </div>
      )}

      {/* Fetch results */}
      <button
        style={{
          ...styles.btn,
          ...(canFetch && !fetching ? styles.fetchBtn : styles.fetchBtnDisabled),
        }}
        onClick={handleFetchResults}
        disabled={!canFetch || fetching}
      >
        {fetching ? 'Fetching...' : 'Fetch Results as GeoJSON'}
      </button>

      {lastPushed > 0 && (
        <div style={{ fontSize: 10, color: '#22c55e', textAlign: 'center' }}>
          Pushed {lastPushed} features downstream
        </div>
      )}
    </div>
  );

  return { contentComponent };
};
