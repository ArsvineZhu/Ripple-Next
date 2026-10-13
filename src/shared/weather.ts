export interface WeatherReading {
  temp: number;
  status: string;
}
interface WeatherLocation {
  city: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
}
export interface WeatherSnapshot {
  reading: WeatherReading | null;
  location: WeatherLocation | null;
  error: 'missing-key' | 'lookup-failed' | null;
}
export const emptyWeather: WeatherSnapshot = { reading: null, location: null, error: null };

export function parseWeatherSnapshot(payload: unknown, unit: 'f' | 'c'): WeatherSnapshot {
  if (!payload || typeof payload !== 'object') return { ...emptyWeather, error: 'lookup-failed' };
  const data = payload as Record<string, unknown>;
  const current = data.current as Record<string, unknown> | undefined;
  const condition = current?.condition as Record<string, unknown> | undefined;
  const temp = current?.[unit === 'c' ? 'temp_c' : 'temp_f'];
  const value = data.location as Record<string, unknown> | undefined;
  const location =
    value &&
    typeof value.name === 'string' &&
    typeof value.region === 'string' &&
    typeof value.country === 'string' &&
    typeof value.lat === 'number' &&
    Number.isFinite(value.lat) &&
    typeof value.lon === 'number' &&
    Number.isFinite(value.lon)
      ? {
          city: value.name,
          region: value.region,
          country: value.country,
          latitude: value.lat,
          longitude: value.lon,
        }
      : null;
  if (typeof temp !== 'number' || !Number.isFinite(temp) || typeof condition?.text !== 'string')
    return { ...emptyWeather, location, error: 'lookup-failed' };
  return { reading: { temp: Math.round(temp), status: condition.text }, location, error: null };
}
