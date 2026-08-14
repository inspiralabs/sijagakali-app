import { useQuery } from '@tanstack/react-query';
import { fetchWeatherBatch } from './fetchWeather';

const STALE_MS = 15 * 60_000;

export function useWeatherBatch(deploymentSlug: string, enabled = true) {
  return useQuery({
    queryKey: ['weather-batch', deploymentSlug],
    queryFn: () => fetchWeatherBatch(deploymentSlug),
    staleTime: STALE_MS,
    enabled: enabled && Boolean(deploymentSlug) && Boolean(import.meta.env.VITE_SIJAGAKALIAPI_URL),
    retry: 1,
  });
}
