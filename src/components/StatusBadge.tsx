import { StatusLevel, STATUS_CONFIG } from '@/lib/types';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: StatusLevel;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
        status === 'bahaya' && 'animate-pulse-danger',
        className
      )}
      style={{ backgroundColor: `${config.hex}20`, color: config.hex }}
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: config.hex }} />
      {config.siagaLabel} · {config.label}
    </span>
  );
}
