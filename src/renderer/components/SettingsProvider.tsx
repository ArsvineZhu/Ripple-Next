import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';

import { useSettings } from '../hooks/useSettings';
const SettingsContext = createContext<ReturnType<typeof useSettings> | null>(null);
export function SettingsProvider({
  children,
  hasWeatherApiKey = false,
}: {
  children: ReactNode;
  hasWeatherApiKey?: boolean;
}) {
  const settings = useSettings(hasWeatherApiKey);
  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>;
}
export function useSettingsContext() {
  const settings = useContext(SettingsContext);
  if (!settings) throw new Error('SettingsProvider is missing');
  return settings;
}
