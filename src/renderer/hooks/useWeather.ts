import { useEffect, useEffectEvent, useState } from 'react';
import type { WeatherSnapshot } from '../../shared/weather';
import { useAppState } from '../components/AppStateProvider';

export function useWeather(enabled = true, refreshMs = 600_000) {
  const { state } = useAppState();
  const preferences = state.settings.weather;
  const signature = JSON.stringify(preferences) + ':' + state.settings.secretRevision;
  const request = useEffectEvent(() => window.electronAPI.getWeather(preferences));
  const [snapshot, setSnapshot] = useState<WeatherSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let active = true,
      pending = false,
      shown = false;
    const update = async () => {
      if (pending) return;
      pending = true;
      if (!shown) setLoading(true);
      try {
        const next = await request();
        if (active) {
          shown = true;
          setSnapshot(next);
        }
      } catch {
        if (active) {
          shown = true;
          setSnapshot({ reading: null, location: null, error: 'lookup-failed' });
        }
      } finally {
        pending = false;
        if (active) setLoading(false);
      }
    };
    shown = false;
    setSnapshot(null);
    void update();
    window.addEventListener('focus', update);
    const timer = setInterval(update, refreshMs);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener('focus', update);
    };
  }, [enabled, signature, refreshMs]);
  return { snapshot, loading };
}
