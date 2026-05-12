import { AlertEvent, STATUS_CONFIG } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { cn, formatWIB } from '@/lib/utils';

interface AlertLogProps {
  alerts: AlertEvent[];
  className?: string;
}

export function AlertLog({ alerts, className }: AlertLogProps) {
  return (
    <Card
      className={cn(
        'flex min-h-0 min-w-0 flex-col border-border/90 bg-card shadow-sm',
        className
      )}
    >
      <div className="shrink-0 border-b border-border/60 px-4 py-3 sm:px-5">
        <h3 className="text-sm font-semibold text-foreground">Log peringatan terbaru</h3>
      </div>
      <div className="max-h-[min(24rem,50vh)] min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5 lg:max-h-none">
        {alerts.map(alert => {
          const config = STATUS_CONFIG[alert.status];
          return (
            <div key={alert.id} className="flex gap-3">
              <div className="mt-1 flex-shrink-0">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: config.hex }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{alert.title}</p>
                <p className="text-xs text-muted-foreground">{alert.description}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{alert.deviceName} · {formatWIB(alert.timestamp)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
