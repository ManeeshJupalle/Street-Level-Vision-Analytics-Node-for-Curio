import { FiActivity } from 'react-icons/fi';
import ModelSelector from './ModelSelector';
import DataSourceSelector from './DataSourceSelector';
import ClassSelector from './ClassSelector';
import RunButton from './RunButton';
import { useInference } from '../../hooks/useInference';
import type {
  ModelInfo,
  DataSourceConfig,
  ClassConfig,
  ResultItem,
} from '../../types';

interface JobStatus {
  running: boolean;
  jobId?: string;
  total: number;
  processed: number;
}

interface Props {
  selectedModel: ModelInfo | null;
  onModelSelect: (m: ModelInfo) => void;
  dataSource: DataSourceConfig | null;
  onDataSourceChange: (d: DataSourceConfig) => void;
  classConfig: ClassConfig | null;
  onClassConfigChange: (c: ClassConfig) => void;
  jobStatus: JobStatus;
  onJobStatusChange: (s: JobStatus) => void;
  onResults: (r: ResultItem[]) => void;
}

function StepHeader({
  num,
  label,
  state,
}: {
  num: number;
  label: string;
  state: 'pending' | 'active' | 'done';
}) {
  return (
    <div className="step-header">
      <span className={`step-num ${state}`}>{num}</span>
      {label}
    </div>
  );
}

export default function ConfigPanel({
  selectedModel,
  onModelSelect,
  dataSource,
  onDataSourceChange,
  classConfig,
  onClassConfigChange,
  jobStatus,
  onJobStatusChange,
  onResults,
}: Props) {
  const { runInference } = useInference(onJobStatusChange, onResults);

  const modelDone = !!selectedModel;
  const dataDone = !!dataSource;
  const classDone = !!(classConfig && classConfig.classes.length > 0);
  const allReady = modelDone && dataDone && classDone;

  const handleRun = () => {
    if (!allReady || !selectedModel || !dataSource || !classConfig) return;
    runInference({
      model: selectedModel,
      data_source: dataSource,
      classes: classConfig,
    });
  };

  return (
    <div className="dark-panel h-full bg-slate-900 border-r border-slate-800 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-5 pt-5 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center">
            <FiActivity className="text-indigo-400 text-lg" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-white leading-tight">
              Street Vision
            </h1>
            <p className="text-[11px] text-slate-500">
              Urban image analysis pipeline
            </p>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
        {/* Step 1 */}
        <section>
          <StepHeader
            num={1}
            label="Select Model"
            state={modelDone ? 'done' : 'active'}
          />
          <ModelSelector selected={selectedModel} onSelect={onModelSelect} />
        </section>

        {/* Step 2 */}
        <section>
          <StepHeader
            num={2}
            label="Data Source"
            state={dataDone ? 'done' : modelDone ? 'active' : 'pending'}
          />
          <DataSourceSelector value={dataSource} onChange={onDataSourceChange} />
        </section>

        {/* Step 3 */}
        <section>
          <StepHeader
            num={3}
            label="Classes"
            state={classDone ? 'done' : dataDone ? 'active' : 'pending'}
          />
          <ClassSelector value={classConfig} onChange={onClassConfigChange} />
        </section>
      </div>

      {/* Run */}
      <div className="shrink-0 px-5 py-4 border-t border-slate-800">
        <RunButton
          ready={allReady}
          running={jobStatus.running}
          processed={jobStatus.processed}
          total={jobStatus.total}
          onClick={handleRun}
        />
      </div>
    </div>
  );
}
