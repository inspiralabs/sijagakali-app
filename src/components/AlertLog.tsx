import { AlertEvent, STATUS_CONFIG } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { formatWIB } from '@/lib/utils';

interface AlertLogProps {
  alerts: AlertEvent[];
}

export function AlertLog({ alerts }: AlertLogProps) {
  return (
    <Card className="border-border bg-card p-4">
      <h3 className="mb-3 font-semibold text-foreground">Log Peringatan Terbaru</h3>
      <div className="space-y-3">
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
