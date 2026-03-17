interface Props {
  children: React.ReactNode;
  color?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'gray';
  className?: string;
}

const colorMap = {
  indigo: 'bg-indigo-500/20 text-indigo-300',
  emerald: 'bg-emerald-500/20 text-emerald-300',
  amber: 'bg-amber-500/20 text-amber-300',
  rose: 'bg-rose-500/20 text-rose-300',
  gray: 'bg-slate-600/40 text-slate-300',
};

export default function Badge({ children, color = 'gray', className = '' }: Props) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full ${colorMap[color]} ${className}`}
    >
      {children}
    </span>
  );
}
