import type { ChangeEvent } from 'react';
import { useCallback, useRef, useState } from 'react';
import type { AppSettings, PositionMode } from '../../shared/appState';
import type { DisplayInfo } from '../../shared/contracts';
import type { LanguagePreference } from '../../shared/i18n';
import { changeLanguagePreference } from '../i18n';
import { useAppState } from '../components/AppStateProvider';
import { useNotifications } from '../components/NotificationProvider';

export function useSettings(initialHasApiKey: boolean) {
  const { state, updateState } = useAppState();
  const { notify } = useNotifications();
  const settings = state.settings;
  const [displays, setDisplays] = useState<DisplayInfo[]>([]);
  const [hasApiKey, setHasApiKey] = useState(initialHasApiKey);
  const [autoLaunchPending, setAutoLaunchPending] = useState(false);
  const autoLaunchRequest = useRef(false);
  const updateSettings = useCallback(
    (patch: Partial<AppSettings>) => updateState({ settings: patch }),
    [updateState],
  );

  const handleLanguageChange = (value: LanguagePreference) => {
    updateSettings({ language: value });
    void changeLanguagePreference(value);
  };
  const handleBatteryAlertsChange = (batteryAlerts: boolean) => updateSettings({ batteryAlerts });
  const handleIslandBorderChange = (islandBorder: boolean) => updateSettings({ islandBorder });
  const handleStandbyChange = (standbyMode: boolean) => updateSettings({ standbyMode });
  const handleLargeStandbyChange = (largeStandbyMode: boolean) =>
    updateSettings({ largeStandbyMode });
  const handleHourFormatChange = (input: string) =>
    updateSettings({ hourFormat: input === '12-hr' ? '12-hr' : '24-hr' });
  const handleTimeZoneChange = (timeZone: string) => updateSettings({ timeZone });
  const handleAutoLaunchChange = async (enable: boolean) => {
    if (autoLaunchRequest.current) return;
    autoLaunchRequest.current = true;
    setAutoLaunchPending(true);
    try {
      await window.electronAPI?.setAutoLaunch(enable);
      updateSettings({ autoLaunch: enable });
    } catch (error) {
      notify({
        severity: 'error',
        code: 'autoLaunchFailed',
        area: 'settings',
        detail: error instanceof Error ? error.message : String(error),
      });
    } finally {
      autoLaunchRequest.current = false;
      setAutoLaunchPending(false);
    }
  };
  const handleShowTrayChange = (showTray: boolean) => updateSettings({ showTray });
  const handlehideNotActiveIslandChange = (hideIslandWhenInactive: boolean) =>
    updateSettings({ hideIslandWhenInactive });
  const handleShowInfoWhenIdleChange = (showInfoWhenIdle: boolean) =>
    updateSettings({ showInfoWhenIdle });
  const handleWeatherUnitChange = (input: string) =>
    updateSettings({ weatherUnit: input === 'c' ? 'c' : 'f' });
  const handleBgColorChange = (backgroundColor: string) => updateSettings({ backgroundColor });
  const handleTextColorChange = (textColor: string) => updateSettings({ textColor });
  const handleDisplayChange = (displayId: string) => {
    updateSettings({ displayId });
    void window.electronAPI?.setDisplay(displayId).catch(() => {});
  };
  const handleIslandXChange = (input: number | ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    updateSettings({ islandX: typeof input === 'number' ? input : Number(input.target.value) });
  const handleIslandYChange = (input: number | ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    updateSettings({ islandY: typeof input === 'number' ? input : Number(input.target.value) });
  const handleBgImageChange = (backgroundImage: string) => updateSettings({ backgroundImage });
  const setTheme = (theme: string) => {
    if (theme === 'sleek-black') {
      updateSettings({
        theme: 'sleek-black',
        backgroundColor: 'rgba(0, 0, 0, 0.64)',
        textColor: 'rgba(255, 255, 255)',
      });
    } else if (theme === 'win95') {
      updateSettings({
        theme: 'win95',
        backgroundColor: 'rgba(195, 195, 195)',
        textColor: 'rgba(0, 0, 0)',
      });
    } else {
      updateSettings({
        theme: 'default',
        backgroundColor: '#000000',
        textColor: '#FFFFFF',
      });
    }
  };
  const setPositionMode = (positionMode: string) =>
    updateSettings({ positionMode: positionMode as PositionMode });
  const handleApiBaseUrlChange = (aiBaseUrl: string) => updateSettings({ aiBaseUrl });
  const handleAiModelChange = (aiModel: string) => updateSettings({ aiModel });
  const saveApiKey = async (key: string): Promise<boolean> => {
    try {
      await window.electronAPI?.saveApiKey(key.trim());
      setHasApiKey(Boolean(key.trim()));
      return true;
    } catch (error) {
      notify({
        severity: 'error',
        code: 'secretStorageUnavailable',
        area: 'settings',
        detail: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  };

  return {
    language: settings.language,
    searchUrlTemplate: settings.searchUrlTemplate,
    setSearchUrlTemplate: (searchUrlTemplate: string) => updateSettings({ searchUrlTemplate }),
    handleLanguageChange,
    batteryAlertsEnabled: settings.batteryAlerts,
    islandBorderEnabled: settings.islandBorder,
    islandCornerRadius: settings.islandCornerRadius,
    handleIslandCornerRadiusChange: (input: string | number) =>
      updateSettings({ islandCornerRadius: Number(input) }),
    standbyBorderEnabled: settings.standbyMode,
    largeStandbyEnabled: settings.largeStandbyMode,
    hideNotActiveIslandEnabled: settings.hideIslandWhenInactive,
    showInfoWhenIdleEnabled: settings.showInfoWhenIdle,
    hourFormat: settings.hourFormat === '12-hr',
    showAmPm: settings.showAmPm,
    setShowAmPm: (showAmPm: boolean) => updateSettings({ showAmPm }),
    timeZone: settings.timeZone,
    handleTimeZoneChange,
    weatherUnit: settings.weatherUnit,
    theme: settings.theme,
    setTheme,
    bgColor: settings.backgroundColor,
    textColor: settings.textColor,
    bgImage: settings.backgroundImage,
    displays,
    setDisplays,
    currentDisplayId: settings.displayId || '',
    weatherLocation: settings.weatherLocation,
    setWeatherLocation: (weatherLocation: string) => updateSettings({ weatherLocation }),
    autoLaunchEnabled: settings.autoLaunch,
    autoLaunchPending,
    showTrayEnabled: settings.showTray,
    handleShowTrayChange,
    positionMode: settings.positionMode,
    setPositionMode,
    islandX: settings.islandX,
    islandY: settings.islandY,
    leaveDelayMs: settings.leaveDelayMs,
    hasApiKey,
    aiBaseUrl: settings.aiBaseUrl,
    aiModel: settings.aiModel,
    saveApiKey,
    handleApiBaseUrlChange,
    handleAiModelChange,
    handleLeaveDelayChange: (input: string | number) =>
      updateSettings({
        leaveDelayMs: Math.max(0, Math.min(2000, Number(input))),
      }),
    handleBatteryAlertsChange,
    handleIslandBorderChange,
    handleStandbyChange,
    handleLargeStandbyChange,
    handleHourFormatChange,
    handleAutoLaunchChange,
    handlehideNotActiveIslandChange,
    handleShowInfoWhenIdleChange,
    handleWeatherUnitChange,
    handleBgColorChange,
    handleTextColorChange,
    handleDisplayChange,
    handleIslandXChange,
    handleIslandYChange,
    handleBgImageChange,
  };
}
