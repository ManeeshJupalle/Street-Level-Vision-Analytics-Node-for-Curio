import { FiZap } from 'react-icons/fi';
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
  demoMode: boolean;
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
    <div className="step-label">
      <span className={`step-circle ${state}`}>{num}</span>
      <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
        {label}
      </span>
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
    <div className="h-full bg-gradient-to-b from-navy-900 to-navy-800 border-r border-white/[0.06] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-5 pt-5 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-blue-400 flex items-center justify-center shadow-lg shadow-accent/20">
            <FiZap className="text-white text-base" />
          </div>
          <div>
            <h1 className="text-[15px] font-semibold text-white leading-tight tracking-tight">
              Street Vision
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">
              Urban image analysis pipeline
            </p>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="flex-1 overflow-y-auto sidebar-scroll px-5 py-5 space-y-6">
        <section>
          <StepHeader
            num={1}
            label="Select Model"
            state={modelDone ? 'done' : 'active'}
          />
          <ModelSelector selected={selectedModel} onSelect={onModelSelect} />
        </section>

        <section>
          <StepHeader
            num={2}
            label="Data Source"
            state={dataDone ? 'done' : modelDone ? 'active' : 'pending'}
          />
          <DataSourceSelector value={dataSource} onChange={onDataSourceChange} />
        </section>

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
      <div className="shrink-0 px-5 py-4 border-t border-white/[0.06]">
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
