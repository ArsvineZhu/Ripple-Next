import { useEffect, useState } from 'react';
import type { WeatherSnapshot } from '../../shared/weather';

export function useWeatherPreview(enabled: boolean, refreshToken: string) {
  const [snapshot, setSnapshot] = useState<WeatherSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let active = true,
      sequence = 0;
    const update = async () => {
      const version = ++sequence;
      setLoading(true);
      try {
        const result = await window.electronAPI.getWeather('auto:ip', 'c');
        if (active && sequence === version) setSnapshot(result);
      } catch {
        if (active && sequence === version)
          setSnapshot({ reading: null, location: null, error: 'lookup-failed' });
      } finally {
        if (active && sequence === version) setLoading(false);
      }
    };
    void update();
    const focus = () => void update();
    const timer = setInterval(focus, 60_000);
    window.addEventListener('focus', focus);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener('focus', focus);
    };
  }, [enabled, refreshToken]);
  return { snapshot, loading };
}
