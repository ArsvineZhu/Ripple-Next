import { type ReactNode, createContext, useContext } from 'react';

import { useSettings } from '../hooks/useSettings';
export type SettingsValues = ReturnType<typeof useSettings>;
const SettingsContext = createContext<SettingsValues | null>(null);
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
