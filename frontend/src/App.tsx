import { useState, useEffect, useCallback, useMemo } from 'react';
import { FiAlertTriangle } from 'react-icons/fi';
import ConfigPanel from './components/ConfigPanel/ConfigPanel';
import Gallery from './components/Gallery/Gallery';
import api from './services/api';
import type {
  ModelInfo,
  DataSourceConfig,
  ClassConfig,
  ResultItem,
  FilterRule,
} from './types';

export default function App() {
  const [selectedModel, setSelectedModel] = useState<ModelInfo | null>(null);
  const [dataSource, setDataSource] = useState<DataSourceConfig | null>(null);
  const [classConfig, setClassConfig] = useState<ClassConfig | null>(null);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [jobStatus, setJobStatus] = useState<{
    running: boolean;
    jobId?: string;
    total: number;
    processed: number;
  }>({ running: false, total: 0, processed: 0 });
  const [filters, setFilters] = useState<FilterRule[]>([]);
  const [backendDemoMode, setBackendDemoMode] = useState(false);
  const [backendUp, setBackendUp] = useState(true);

  // Check backend health on mount
  useEffect(() => {
    api
      .get('/health')
      .then((res) => {
        setBackendDemoMode(res.data.demo_mode ?? false);
        setBackendUp(true);
      })
      .catch(() => setBackendUp(false));
  }, []);

  // Determine if current results are real or demo
  const resultsAreDemo = useMemo(() => {
    if (results.length === 0) return false;
    return results.some((r: any) => r.demo_mode === true);
  }, [results]);

  // Show demo banner only when backend is in demo mode AND results are demo (or no results yet)
  const showDemoBanner = backendDemoMode && (results.length === 0 || resultsAreDemo);

  const handleDataSourceChange = useCallback((d: DataSourceConfig) => {
    setDataSource(d);
  }, []);

  const handleClassConfigChange = useCallback((c: ClassConfig) => {
    setClassConfig(c);
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Demo mode banner */}
      {showDemoBanner && (
        <div className="shrink-0 bg-amber-500 text-amber-950 text-xs font-semibold flex items-center justify-center gap-2 py-1.5 px-4">
          <FiAlertTriangle className="text-sm" />
          DEMO MODE — Using simulated data. Select "Sample Images" data source to run real SegFormer inference.
        </div>
      )}

      {!backendUp && (
        <div className="shrink-0 bg-rose-500 text-white text-xs font-semibold flex items-center justify-center gap-2 py-1.5 px-4">
          <FiAlertTriangle className="text-sm" />
          Backend not reachable at {import.meta.env.VITE_API_URL || 'http://localhost:8000/api'} — start it with: uvicorn backend.main:app --reload
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        <div className="w-[40%] min-w-[380px] max-w-[520px] shrink-0">
          <ConfigPanel
            selectedModel={selectedModel}
            onModelSelect={setSelectedModel}
            dataSource={dataSource}
            onDataSourceChange={handleDataSourceChange}
            classConfig={classConfig}
            onClassConfigChange={handleClassConfigChange}
            jobStatus={jobStatus}
            onJobStatusChange={setJobStatus}
            onResults={setResults}
            demoMode={showDemoBanner}
          />
        </div>
        <div className="flex-1 min-w-0">
          <Gallery
            results={results}
            modelType={selectedModel?.model_type ?? null}
            filters={filters}
            onFiltersChange={setFilters}
          />
        </div>
      </div>
    </div>
  );
}
