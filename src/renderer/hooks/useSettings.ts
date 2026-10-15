import { useCallback, useRef, useState } from 'react';
import type { AppSettings } from '../../shared/appState';
import type { DisplayInfo } from '../../shared/contracts';
import { useAppState } from '../components/AppStateProvider';
import { useNotifications } from '../components/NotificationProvider';

export function useSettings(initialHasWeatherApiKey = false) {
  const { state, updateState } = useAppState();
  const { notify } = useNotifications();
  const [displays, setDisplays] = useState<DisplayInfo[]>([]);
  const [hasWeatherApiKey, setHasWeatherApiKey] = useState(initialHasWeatherApiKey);
  const [autoLaunchPending, setAutoLaunchPending] = useState(false);
  const autoLaunchRequest = useRef(false);
  const updateSettings = useCallback(
    (settings: Partial<AppSettings>) => updateState({ settings }),
    [updateState],
  );
  return {
    settings: state.settings,
    updateSettings,
    displays,
    setDisplays,
    hasWeatherApiKey,
    autoLaunchPending,
    async setAutoLaunch(enable: boolean) {
      if (autoLaunchRequest.current) return;
      autoLaunchRequest.current = true;
      setAutoLaunchPending(true);
      await updateSettings({ autoLaunch: enable });
      autoLaunchRequest.current = false;
      setAutoLaunchPending(false);
    },
    setTheme(theme: AppSettings['theme']) {
      const colors =
        theme === 'sleek-black'
          ? { backgroundColor: 'rgba(0, 0, 0, 0.64)', textColor: 'rgba(255, 255, 255)' }
          : theme === 'win95'
            ? { backgroundColor: 'rgba(195, 195, 195)', textColor: 'rgba(0, 0, 0)' }
            : { backgroundColor: '#000000', textColor: '#FFFFFF' };
      return updateSettings({ theme, ...colors });
    },
    async saveWeatherApiKey(key: string) {
      try {
        await window.electronAPI.saveWeatherApiKey(key.trim());
        setHasWeatherApiKey(Boolean(key.trim()));
        return true;
      } catch {
        notify({ severity: 'error', code: 'secretStorageUnavailable', area: 'settings' });
        return false;
      }
    },
  };
}
