import { createHash } from 'node:crypto';
import type { AppState } from '../../shared/appState';
import { emptyWeather } from '../../shared/weather';
import type { WeatherSnapshot } from '../../shared/weather';
import { fetchWeatherSnapshot } from './weatherAPI';

export function createWeatherService(
  stateStore: { load(): Promise<AppState> },
  secrets: { getSecret(name: string): Promise<string | null> },
) {
  const cache = new Map<string, { at: number; snapshot: WeatherSnapshot }>();
  const pending = new Map<string, Promise<WeatherSnapshot>>();
  return {
    async get(location: string, unit: 'c' | 'f') {
      if (!location.trim()) return { ...emptyWeather };
      const { settings } = await stateStore.load();
      let key: string | undefined;
      if (!settings.useBuiltInWeatherApi) {
        try {
          key = (await secrets.getSecret('weather-api-key')) ?? '';
        } catch {
          return { ...emptyWeather, error: 'missing-key' as const };
        }
      }
      const cacheId = `${location}:${unit}:${createHash('sha256')
        .update(key ?? 'builtin')
        .digest('hex')}`;
      const cached = cache.get(cacheId);
      if (cached && Date.now() - cached.at < 60_000) return cached.snapshot;
      const existing = pending.get(cacheId);
      if (existing) return existing;
      const request = fetchWeatherSnapshot(
        location,
        unit,
        (input) => fetch(input, { signal: AbortSignal.timeout(10_000) }),
        key,
      );
      pending.set(cacheId, request);
      try {
        const snapshot = await request;
        if (!snapshot.error) {
          cache.set(cacheId, { at: Date.now(), snapshot });
          if (cache.size > 20) cache.delete(cache.keys().next().value!);
        }
        return snapshot;
      } finally {
        pending.delete(cacheId);
      }
    },
  };
}
