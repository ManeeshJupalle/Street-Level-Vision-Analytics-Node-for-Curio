import { useState, useEffect, useCallback } from 'react';
import { FiWifi, FiRefreshCw } from 'react-icons/fi';
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
    error?: string;
  }>({ running: false, total: 0, processed: 0 });
  const [filters, setFilters] = useState<FilterRule[]>([]);
  const [backendUp, setBackendUp] = useState(true);

  const checkBackend = useCallback(() => {
    api
      .get('/health')
      .then(() => setBackendUp(true))
      .catch(() => setBackendUp(false));
  }, []);

  useEffect(() => {
    checkBackend();
  }, [checkBackend]);

  const handleDataSourceChange = useCallback((d: DataSourceConfig) => {
    setDataSource(d);
  }, []);

  const handleClassConfigChange = useCallback((c: ClassConfig) => {
    setClassConfig(c);
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#f8f9fc]">
      {!backendUp && (
        <div className="shrink-0 bg-rose-500 text-white text-xs font-semibold flex items-center justify-center gap-2 py-1.5 px-4">
          <FiWifi className="text-sm" />
          Cannot connect to backend at localhost:8000
          <button
            onClick={checkBackend}
            className="ml-2 underline underline-offset-2 hover:no-underline flex items-center gap-1"
          >
            <FiRefreshCw className="text-xs" /> Retry
          </button>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <div className="w-[380px] min-w-[360px] max-w-[420px] shrink-0">
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
          />
        </div>

        {/* Dashboard */}
        <div className="flex-1 min-w-0">
          <Gallery
            results={results}
            modelType={selectedModel?.model_type ?? null}
            filters={filters}
            onFiltersChange={setFilters}
            classConfig={classConfig}
            jobStatus={jobStatus}
          />
        </div>
      </div>
    </div>
  );
}
