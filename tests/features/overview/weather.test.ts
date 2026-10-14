import { expect, it, vi, afterEach } from 'vitest';
import { fetchWeatherSnapshot } from '../../../src/main/services/weatherAPI';
import { createWeatherService } from '../../../src/main/services/weather';
import { defaultAppState } from '../../../src/shared/appState';

const payload = {
  current: { temp_c: 18.6, temp_f: 65.5, condition: { text: 'Partly cloudy' } },
  location: { name: 'Toronto', region: 'Ontario', country: 'Canada', lat: 43.65, lon: -79.38 },
};
afterEach(() => vi.unstubAllGlobals());
it('skips blank locations and missing custom credentials', async () => {
  const fetcher = vi.fn();
  expect((await fetchWeatherSnapshot(' ', 'c', fetcher, 'fixture-key')).reading).toBeNull();
  expect((await fetchWeatherSnapshot('auto:ip', 'c', fetcher, '')).error).toBe('missing-key');
  expect(fetcher).not.toHaveBeenCalled();
});
it('sends the selected key and returns usable weather plus the detected location', async () => {
  const fetcher = vi.fn(async (url: URL) => {
    expect(url.searchParams.get('q')).toBe('auto:ip');
    expect(url.searchParams.get('key')).toBe('fixture-custom-key');
    return { ok: true, json: async () => payload };
  });
  expect(await fetchWeatherSnapshot('auto:ip', 'c', fetcher, 'fixture-custom-key')).toEqual({
    reading: { temp: 19, status: 'Partly cloudy' },
    location: {
      city: 'Toronto',
      region: 'Ontario',
      country: 'Canada',
      latitude: 43.65,
      longitude: -79.38,
    },
    error: null,
  });
});
it('returns a bounded failure without leaking a key-bearing fetch error', async () => {
  const fetcher = vi.fn(async () => {
    throw new Error('failed fixture-secret');
  });
  const result = await fetchWeatherSnapshot('London', 'c', fetcher, 'fixture-secret');
  expect(result.error).toBe('lookup-failed');
  expect(JSON.stringify(result)).not.toContain('fixture-secret');
});
it('does not silently use the built-in credential when custom mode lacks a key', async () => {
  const state = structuredClone(defaultAppState);
  state.settings.weather = {
    ...state.settings.weather,
    location: { mode: 'automatic', city: '', region: '', country: '' },
    unit: 'c',
    keySource: 'custom',
  };
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  const service = createWeatherService({ getSecret: async () => null });
  expect((await service.get(state.settings.weather)).error).toBe('missing-key');
  expect(fetcher).not.toHaveBeenCalled();
});
it('shares concurrent lookups, caches results and invalidates when credentials change', async () => {
  const state = structuredClone(defaultAppState);
  state.settings.weather = {
    ...state.settings.weather,
    location: { mode: 'automatic', city: '', region: '', country: '' },
    unit: 'c',
    keySource: 'custom',
  };
  let key = 'fixture-first';
  const fetcher = vi.fn(
    async () =>
      new Response(JSON.stringify(payload), { headers: { 'Content-Type': 'application/json' } }),
  );
  vi.stubGlobal('fetch', fetcher);
  const service = createWeatherService({ getSecret: async () => key });
  await Promise.all([service.get(state.settings.weather), service.get(state.settings.weather)]);
  await service.get(state.settings.weather);
  expect(fetcher).toHaveBeenCalledTimes(1);
  key = 'fixture-second';
  await service.get(state.settings.weather);
  expect(fetcher).toHaveBeenCalledTimes(2);
});
