import { cn } from '@/lib/utils';

type Tone = 'success' | 'warning' | 'neutral' | 'info';

const TONE_CLASSES: Record<Tone, string> = {
  success: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  warning: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  neutral: 'bg-muted text-muted-foreground',
  info: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
};

const DOT_CLASSES: Record<Tone, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  neutral: 'bg-muted-foreground/60',
  info: 'bg-blue-500',
};

export function StatusPill({ tone, label, className }: { tone: Tone; label: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium', TONE_CLASSES[tone], className)}>
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', DOT_CLASSES[tone])} />
      {label}
    </span>
  );
}
