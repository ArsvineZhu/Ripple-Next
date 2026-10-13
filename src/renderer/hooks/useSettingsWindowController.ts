import { useEffect } from 'react';
import { useAppState } from '../components/AppStateProvider';
import { useSettingsContext } from '../components/SettingsProvider';
import { useBackgroundImage } from './useBackgroundImage';
import { useQuickApps } from './useQuickApps';
import { useWorkflows } from './useWorkflows';
import { useAIConfiguration } from './useAIConfiguration';
import { TABS, islandPages } from '../lib/tabs';

/** Settings-window props for SettingsTab without island media, hover, or paging. */
export function useSettingsWindowController() {
  const { state, updateState } = useAppState();
  const settings = useSettingsContext();
  const aiConfiguration = useAIConfiguration();
  useEffect(() => {
    void window.electronAPI
      ?.getDisplays()
      .then(settings.setDisplays)
      .catch(() => {});
  }, [settings.setDisplays]);
  const backgroundImage = useBackgroundImage(settings.bgImage);
  const { workflows, removeWorkflow } = useWorkflows();
  const {
    quickApps,
    newQuickApp,
    quickAppMode,
    setQuickAppMode,
    executable,
    setExecutable,
    argumentLines,
    setArgumentLines,
    workingDirectory,
    setWorkingDirectory,
    appUrl,
    setAppUrl,
    handleQuickAppInput,
    selectQuickApp,
    appSuggestions,
    showSuggestions,
    setShowSuggestions,
    handleQaChange,
    addQuickApp,
    removeQuickApp,
  } = useQuickApps();

  const { hiddenTabs, defaultTabId } = state.settings;
  const tabOrder = islandPages.orderedIds(state.settings.tabOrder);
  const setDefaultTabId = (defaultTabId: string) => updateState({ settings: { defaultTabId } });
  const moveTabOrder = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= tabOrder.length) return;
    const newOrder = [...tabOrder];
    const [moved] = newOrder.splice(fromIdx, 1);
    if (moved !== undefined) newOrder.splice(toIdx, 0, moved);
    updateState({ settings: { tabOrder: newOrder } });
  };
  const toggleTabVisibility = (id: string) => {
    const newHidden = hiddenTabs.includes(id)
      ? hiddenTabs.filter((tab) => tab !== id)
      : [...hiddenTabs, id];
    if (newHidden.length < TABS.length) updateState({ settings: { hiddenTabs: newHidden } });
  };
  const handlePositionChange = (value: string) => {
    if (value === settings.positionMode) return;
    settings.setPositionMode(value);
  };

  return {
    aiConfiguration,
    ...settings,
    ...backgroundImage,
    workflows,
    removeWorkflow,
    quickApps,
    newQuickApp,
    quickAppMode,
    setQuickAppMode,
    executable,
    setExecutable,
    argumentLines,
    setArgumentLines,
    workingDirectory,
    setWorkingDirectory,
    appUrl,
    setAppUrl,
    handleQuickAppInput,
    selectQuickApp,
    appSuggestions,
    showSuggestions,
    setShowSuggestions,
    handleQaChange,
    addQuickApp,
    removeQuickApp,
    tabOrder,
    hiddenTabs,
    defaultTabId,
    setDefaultTabId,
    moveTabOrder,
    toggleTabVisibility,
    handlePositionChange,
    isFree: settings.positionMode === 'free',
  };
}
