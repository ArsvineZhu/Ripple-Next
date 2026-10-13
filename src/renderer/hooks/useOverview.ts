import { useTranslation } from 'react-i18next';
import { formatTime } from '../lib/date';
import { useState, useEffect } from 'react';
import { fetchCurrentWeather } from '../lib/weather';
import type { WeatherReading } from '../lib/weather';
import { recordRendererError } from '../lib/diagnostics';

export function useOverview(
  hourFormat: boolean,
  timeZone: string,
  location: string,
  weatherUnit: 'f' | 'c',
  showAmPm = false,
) {
  const { i18n } = useTranslation();
  const [time, setTime] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherReading | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const update = () => {
      clearTimeout(timer);
      setTime(formatTime(i18n.language, hourFormat, new Date(), timeZone, showAmPm));
      // The clock displays minutes. Align updates with the next minute rather
      // than waking the renderer sixty times for the same visible value.
      timer = setTimeout(update, 60_000 - (Date.now() % 60_000));
    };
    const resume = () => {
      if (document.visibilityState !== 'hidden') update();
    };
    update();
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', resume);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [hourFormat, i18n.language, timeZone, showAmPm]);
  useEffect(() => {
    if (!location.trim()) {
      setWeather(null);
      return;
    }
    let active = true;
    const getWeather = async () => {
      try {
        const currentWeather = await fetchCurrentWeather(location, weatherUnit);
        if (active) setWeather(currentWeather);
      } catch (error) {
        if (active) setWeather(null);
        recordRendererError('overview', error);
      }
    };
    setWeather(null);
    void getWeather();
    const interval = setInterval(getWeather, 600000); // Update every 10 mins
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [location, weatherUnit]);
  return { time, weather };
}
