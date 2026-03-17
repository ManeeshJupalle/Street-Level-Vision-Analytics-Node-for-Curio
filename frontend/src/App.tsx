import { useState } from 'react';
import ConfigPanel from './components/ConfigPanel/ConfigPanel';
import Gallery from './components/Gallery/Gallery';
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

  return (
    <div className="h-screen flex overflow-hidden">
      <div className="w-[40%] min-w-[380px] max-w-[520px] shrink-0">
        <ConfigPanel
          selectedModel={selectedModel}
          onModelSelect={setSelectedModel}
          dataSource={dataSource}
          onDataSourceChange={setDataSource}
          classConfig={classConfig}
          onClassConfigChange={setClassConfig}
          jobStatus={jobStatus}
          onJobStatusChange={setJobStatus}
          onResults={setResults}
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
  );
}
