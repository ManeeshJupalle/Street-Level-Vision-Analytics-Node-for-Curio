import { FiPlay } from 'react-icons/fi';
import ProgressBar from '../common/ProgressBar';
import LoadingSpinner from '../common/LoadingSpinner';

interface Props {
  ready: boolean;
  running: boolean;
  processed: number;
  total: number;
  onClick: () => void;
}

export default function RunButton({ ready, running, processed, total, onClick }: Props) {
  if (running) {
    return (
      <div className="space-y-2">
        <ProgressBar
          value={processed}
          max={total}
          label={`Processing ${processed}/${total} images...`}
        />
        <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
          <LoadingSpinner size="sm" className="text-indigo-400" />
          Analysis in progress
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={!ready}
      className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all ${
        ready
          ? 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-500/25'
          : 'bg-slate-700 text-slate-500 cursor-not-allowed'
      }`}
    >
      <FiPlay className={ready ? '' : 'opacity-50'} />
      Run Analysis
    </button>
  );
}
