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
    <button
      onClick={onClick}
      disabled={!ready}
      className={`w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
        ready
          ? 'bg-gradient-to-r from-accent to-blue-400 hover:from-accent-dark hover:to-accent text-white shadow-lg shadow-accent/25 hover:shadow-xl hover:shadow-accent/30 active:scale-[0.98]'
          : 'bg-navy-600 text-slate-500 cursor-not-allowed border border-white/[0.04]'
      }`}
    >
      <FiPlay className={ready ? '' : 'opacity-40'} />
      Run Analysis
    </button>
  );
}
