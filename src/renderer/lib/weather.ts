export type { WeatherReading } from '../../shared/weather';

/** Credentials stay in main; renderer receives weather and location data only. */
export async function fetchCurrentWeather(location: string, unit: 'f' | 'c') {
  if (!location.trim()) return null;
  return (await window.electronAPI.getWeather(location, unit)).reading;
}
