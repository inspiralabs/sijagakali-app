import { useQuery } from '@tanstack/react-query';
import { fetchWeatherBatch, fetchWeatherNowcast } from './fetchWeather';

const STALE_MS = 15 * 60_000;

export function useWeatherBatch(deploymentSlug: string, enabled = true) {
  return useQuery({
    queryKey: ['weather-batch', deploymentSlug],
    queryFn: () => fetchWeatherBatch(deploymentSlug),
    staleTime: STALE_MS,
    enabled: enabled && Boolean(deploymentSlug) && Boolean(import.meta.env.VITE_SIJAGAAIRAPI_URL),
    retry: 1,
  });
}

export function useWeatherNowcast(deploymentSlug: string, enabled = true) {
  return useQuery({
    queryKey: ['weather-nowcast', deploymentSlug],
    queryFn: () => fetchWeatherNowcast(deploymentSlug),
    staleTime: STALE_MS,
    enabled: enabled && Boolean(deploymentSlug) && Boolean(import.meta.env.VITE_SIJAGAAIRAPI_URL),
    retry: 1,
  });
}
