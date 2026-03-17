interface Props {
  size?: 'sm' | 'md';
  className?: string;
}

export default function LoadingSpinner({ size = 'md', className = '' }: Props) {
  const dim = size === 'sm' ? 'w-4 h-4 border-2' : 'w-6 h-6 border-[3px]';
  return (
    <div
      className={`${dim} border-current border-t-transparent rounded-full animate-spin ${className}`}
    />
  );
}
