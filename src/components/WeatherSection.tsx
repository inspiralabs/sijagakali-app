import { getDefaultDeploymentSlug } from '@/lib/sijagaairEnv';
import { useWeatherBatch, useWeatherNowcast } from '@/lib/sijagaair/useWeatherData';
import { WeatherNowcastBanner } from '@/components/WeatherNowcastBanner';
import { WeatherDeviceGrid } from '@/components/WeatherDeviceGrid';

interface WeatherSectionProps {
  showAdminHints?: boolean;
}

export function WeatherSection({ showAdminHints = false }: WeatherSectionProps) {
  const slug = getDefaultDeploymentSlug();
  const batch = useWeatherBatch(slug);
  const nowcast = useWeatherNowcast(slug);

  const refreshAll = () => {
    void batch.refetch();
    void nowcast.refetch();
  };

  return (
    <div className="space-y-4">
      <WeatherNowcastBanner
        data={nowcast.data}
        isLoading={nowcast.isLoading}
        error={nowcast.error}
      />
      <WeatherDeviceGrid
        items={batch.data?.items ?? []}
        isLoading={batch.isLoading}
        isFetching={batch.isFetching || nowcast.isFetching}
        error={batch.error}
        onRefresh={refreshAll}
        attribution={batch.data?.attribution}
        showAdminHints={showAdminHints}
      />
    </div>
  );
}
