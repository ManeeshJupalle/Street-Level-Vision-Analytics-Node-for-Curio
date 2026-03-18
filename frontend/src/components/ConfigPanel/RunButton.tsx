import { FiPlay, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import ProgressBar from '../common/ProgressBar';
import LoadingSpinner from '../common/LoadingSpinner';

interface Props {
  ready: boolean;
  running: boolean;
  processed: number;
  total: number;
  error?: string;
  onClick: () => void;
}

export default function RunButton({ ready, running, processed, total, error, onClick }: Props) {
  if (running) {
    return (
      <div className="space-y-2.5">
        <ProgressBar
          value={processed}
          max={total}
          label={`Processing ${processed}/${total} images...`}
        />
        <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
          <LoadingSpinner size="sm" className="text-accent-light" />
          Analysis in progress
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {error && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
          <FiAlertCircle className="text-rose-400 text-sm shrink-0 mt-0.5" />
          <p className="text-xs text-rose-300 leading-relaxed">{error}</p>
        </div>
      )}
      <button
        onClick={onClick}
        disabled={!ready}
        className={`w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
          ready
            ? 'bg-gradient-to-r from-accent to-blue-400 hover:from-accent-dark hover:to-accent text-white shadow-lg shadow-accent/25 hover:shadow-xl hover:shadow-accent/30 active:scale-[0.98]'
            : 'bg-navy-600 text-slate-500 cursor-not-allowed border border-white/[0.04]'
        }`}
      >
        {error ? <FiRefreshCw className={ready ? '' : 'opacity-40'} /> : <FiPlay className={ready ? '' : 'opacity-40'} />}
        {error ? 'Retry Analysis' : 'Run Analysis'}
      </button>
    </div>
  );
}
