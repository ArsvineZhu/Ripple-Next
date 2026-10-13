import { emptyWeather, parseWeatherSnapshot } from '../../shared/weather';
import type { WeatherSnapshot } from '../../shared/weather';

type WeatherFetcher = (input: URL) => Promise<Pick<Response, 'ok' | 'json'>>;

const WEATHER_API_KEY = '0b18c67c443543e0a6045401250911';

export async function fetchWeatherSnapshot(
  location: string,
  unit: 'f' | 'c',
  fetcher: WeatherFetcher = fetch,
  apiKey = WEATHER_API_KEY,
): Promise<WeatherSnapshot> {
  const query = location.trim();
  if (!query) return { ...emptyWeather };
  if (!apiKey.trim()) return { ...emptyWeather, error: 'missing-key' };

  const url = new URL('https://api.weatherapi.com/v1/current.json');
  url.searchParams.set('key', apiKey);
  url.searchParams.set('q', query);
  url.searchParams.set('aqi', 'no');

  try {
    const response = await fetcher(url);
    if (!response.ok) return { ...emptyWeather, error: 'lookup-failed' };
    return parseWeatherSnapshot(await response.json(), unit);
  } catch {
    return { ...emptyWeather, error: 'lookup-failed' };
  }
}
