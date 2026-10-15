import { useTranslation } from 'react-i18next';
import { formatTime, formatOverviewDate } from '../lib/date';
import { useState, useEffect } from 'react';
import { useAppState } from '../components/AppStateProvider';
import { useWeather } from './useWeather';

export function useOverview() {
  const { state } = useAppState();
  const hourFormat = state.settings.hourFormat === '12-hr';
  const { timeZone, showAmPm } = state.settings;
  const { snapshot } = useWeather();
  const { i18n } = useTranslation();
  const [clock, setClock] = useState({
    time: null as string | null,
    overviewTime: null as string | null,
    overviewDate: '',
  });
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const update = () => {
      clearTimeout(timer);
      const now = new Date();
      const time = formatTime(i18n.language, hourFormat, now, timeZone, showAmPm);
      setClock({
        time,
        overviewTime:
          hourFormat && showAmPm ? formatTime(i18n.language, hourFormat, now, timeZone) : time,
        overviewDate: formatOverviewDate(i18n.language, now, timeZone, hourFormat && showAmPm),
      });
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
  return { ...clock, weather: snapshot?.reading ?? null };
}
