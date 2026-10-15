import { createHash } from 'node:crypto';
import { emptyWeather } from '../../shared/weather';
import type { WeatherSnapshot, WeatherPreferences } from '../../shared/weather';
import { fetchWeatherSnapshot } from './weatherAPI';

export function createWeatherService(secrets: { getSecret(name: string): Promise<string | null> }) {
  const cache = new Map<string, { at: number; snapshot: WeatherSnapshot }>();
  const pending = new Map<string, Promise<WeatherSnapshot>>();
  return {
    async get(preferences: WeatherPreferences) {
      const { location, unit, keySource } = preferences;
      const query =
        location.mode === 'automatic'
          ? 'auto:ip'
          : [location.city, location.region, location.country]
              .map((value) => value.trim())
              .filter(Boolean)
              .join(', ');
      if (!query) return { ...emptyWeather };
      let key: string | undefined;
      if (keySource === 'custom') {
        try {
          key = (await secrets.getSecret('weather-api-key')) ?? '';
        } catch {
          return { ...emptyWeather, error: 'missing-key' as const };
        }
      }
      const cacheId = `${query}:${unit}:${createHash('sha256')
        .update(key ?? 'builtin')
        .digest('hex')}`;
      const cached = cache.get(cacheId);
      if (cached && Date.now() - cached.at < 60_000) return cached.snapshot;
      const existing = pending.get(cacheId);
      if (existing) return existing;
      const request = fetchWeatherSnapshot(
        query,
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
