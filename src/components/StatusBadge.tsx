import { StatusLevel, STATUS_CONFIG, STALE_HEX } from '@/lib/types';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: StatusLevel;
  /** Data belum diperbarui: tampilkan status terakhir dengan warna netral. */
  stale?: boolean;
  className?: string;
}

export function StatusBadge({ status, stale = false, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const hex = stale ? STALE_HEX : config.hex;
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold',
        status === 'bahaya' && !stale && 'animate-pulse-danger',
        className
      )}
      style={{ backgroundColor: `${hex}20`, color: hex }}
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: hex }} />
      {stale ? `Terakhir: ${config.label}` : `${config.siagaLabel} · ${config.label}`}
    </span>
  );
}
