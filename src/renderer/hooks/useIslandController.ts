import { useTranslation } from 'react-i18next';
import { useIslandInteraction } from './useIslandInteraction';
import { useEffect, useLayoutEffect, useReducer } from 'react';

import { measureTextWidth } from '../lib/text';
import { useAssistant } from './useAssistant';
import { useTasks } from './useTasks';
import { useWorkflows } from './useWorkflows';
import { useQuickApps } from './useQuickApps';
import { useBrowserSearch } from './useBrowserSearch';
import { useClipboard } from './useClipboard';
import { useOverview } from './useOverview';
import { useBattery } from './useBattery';
import { useBatteryAlerts } from './useBatteryAlerts';
import { useDeviceAlerts } from './useDeviceAlerts';
import { useMedia } from './useMedia';
import { useSettingsContext } from '../components/SettingsProvider';
import { modeReducer, resolveMode } from '../lib/modes';
import { useNavigation } from './useNavigation';
import { useWindowInput } from './useWindowInput';
import { useAppState } from '../components/AppStateProvider';
import { islandPages } from '../lib/tabs';
import { useBackgroundImage } from './useBackgroundImage';
import { useIslandPreview } from './useIslandPreview';
import { freeIslandPosition } from '../lib/islandPosition';
export function useIslandController() {
  const { t } = useTranslation();
  const { state: appState, updateState } = useAppState();
  const [requestedMode, setMode] = useReducer(modeReducer, 'still');
  const {
    batteryAlertsEnabled,
    islandBorderEnabled,
    islandCornerRadius,
    standbyBorderEnabled,
    largeStandbyEnabled,
    hideNotActiveIslandEnabled,
    showInfoWhenIdleEnabled,
    leaveDelayMs,
    searchUrlTemplate,
    setSearchUrlTemplate,
    handleLeaveDelayChange,
    hourFormat,
    showAmPm,
    timeZone,
    weatherUnit,
    theme,
    setTheme,
    bgColor,
    textColor,
    bgImage,
    displays,
    currentDisplayId,
    weatherLocation,
    setWeatherLocation,
    autoLaunchEnabled,
    positionMode,
    setPositionMode,
    islandX,
    islandY,
    handleBatteryAlertsChange,
    handleIslandBorderChange,
    handleIslandCornerRadiusChange,
    handleStandbyChange,
    handleLargeStandbyChange,
    handleHourFormatChange,
    handleTimeZoneChange,
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
  } = useSettingsContext();
  const isPreview = useIslandPreview();
  const mode = isPreview
    ? 'large'
    : resolveMode(requestedMode, standbyBorderEnabled, largeStandbyEnabled);
  const backgroundImage = useBackgroundImage(bgImage);
  const {
    mediaTrack,
    mediaSnapshot,
    mediaActionError,
    mediaBusy,
    mediaPageId,
    controlMedia,
    selectMediaSession,
    openMediaSession,
    showPausedQuickView,
  } = useMedia();
  const {
    isHovered,
    setIsHovered,
    isDragging,
    beginPositionChange,
    finishPositionChange,
    setAssistantActive,
    leave,
    geometryExited,
    isOverlayOpen,
  } = useIslandInteraction({
    setMode,
    standby: standbyBorderEnabled,
    largeStandby: largeStandbyEnabled,
    leaveDelayMs,
  });
  const handlePositionChange = (value: string) => {
    if (value === positionMode) return;
    beginPositionChange();
    setPositionMode(value);
  };
  const {
    asked,
    setAsked,
    aiAnswer,
    assistantError,
    setAIAnswer,
    userText,
    setUserText,
    resetAssistant,
    askAI,
  } = useAssistant();
  const { tasks, taskText, setTaskText, addTask, removeTask } = useTasks();
  const { workflows, openWorkflow, removeWorkflow } = useWorkflows();
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
  const { browserSearch, setBrowserSearch, searchBrowser, searchError, setSearchError } =
    useBrowserSearch();
  const { clipboard, copyToClipboard } = useClipboard();
  const { time, overviewTime, overviewDate, weather } = useOverview(
    hourFormat,
    timeZone,
    weatherLocation,
    weatherUnit,
    showAmPm,
    `${appState.settings.useBuiltInWeatherApi}:${appState.settings.secretRevision}`,
  );
  const { percent, charging } = useBattery();
  const { alert, chargingAlert } = useBatteryAlerts({
    percent,
    charging,
    enabled: batteryAlertsEnabled,
    setMode,
  });
  const { bluetoothAlert, cameraInUse, cameraAlert, microphoneInUse, microphoneAlert } =
    useDeviceAlerts(setMode);
  const {
    tabOrder,
    hiddenTabs,
    defaultTabId,
    setDefaultTabId,
    moveTabOrder,
    toggleTabVisibility,
    currentTabId,
    direction,
    currentTab,
    visibleTabs,
    selectTab,
    clearClickSuppression,
    consumeClickSuppression,
    isInteractiveTarget,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  } = useNavigation({
    mediaTrack,
    mediaAvailable:
      mediaSnapshot.status !== 'idle' || mediaActionError !== null || mediaSnapshot.error !== null,
    mode,
    isDragging,
    setMode,
  });
  useLayoutEffect(() => {
    setAssistantActive(
      islandPages.get(currentTab)?.blocksCollapse?.({
        mediaAvailable: mediaSnapshot.sessions.length > 0,
        workflowCount: workflows.length,
        taskCount: tasks.length,
        assistantActive: asked,
        answerHeight: 0,
        viewportHeight: window.innerHeight,
      }) ?? false,
    );
  }, [
    asked,
    currentTab,
    mediaSnapshot.sessions.length,
    workflows.length,
    tasks.length,
    setAssistantActive,
  ]);
  const { islandElementRef, syncWindowInputRegion, trackPointerPosition } =
    useWindowInput(geometryExited);
  let isPlaying = mediaTrack?.state === 'playing';
  const trackTitle = mediaTrack ? mediaTrack.name || t('unknownSong') : '';
  const trackArtist = mediaTrack ? mediaTrack.artist || t('unknownArtist') : '';
  const nowPlayingText = mediaTrack ? `${trackTitle} • ${trackArtist}` : '';
  const textWidth = measureTextWidth(nowPlayingText) || nowPlayingText.length * 7;
  const nowPlayingWidth = Math.min(300, Math.max(122, Math.ceil(textWidth + 24 + 6 + 20)));
  const getExpandedTabSize = (id: string, answerHeight = 0) =>
    islandPages.size(id, {
      mediaAvailable: mediaSnapshot.sessions.length > 0,
      workflowCount: workflows.length,
      taskCount: tasks.length,
      assistantActive: asked,
      answerHeight,
      viewportHeight: window.innerHeight,
    });
  const expandedSize = getExpandedTabSize(currentTab);
  let width =
    mode === 'large'
      ? expandedSize.width
      : mode === 'quick' &&
          isPlaying &&
          !alert &&
          !chargingAlert &&
          !bluetoothAlert &&
          !cameraAlert &&
          !microphoneAlert
        ? nowPlayingWidth
        : mode === 'quick' ||
            alert ||
            chargingAlert ||
            bluetoothAlert ||
            cameraAlert ||
            microphoneAlert
          ? 260
          : isPlaying
            ? nowPlayingWidth
            : 170;
  let height = mode === 'large' ? expandedSize.height : 40;
  useEffect(() => {
    const savedDisplayId = appState.settings.displayId;
    if (savedDisplayId && window.electronAPI?.setDisplay) {
      void window.electronAPI.setDisplay(savedDisplayId);
    }

    if (!appState.settings.welcomeShown) {
      const timer = setTimeout(() => {
        void window.electronAPI.openExternal(
          'https://github.com/ArsvineZhu/Ripple-Next/blob/main/instructions.md',
        );
        updateState({ settings: { welcomeShown: true } });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [appState.settings.displayId, appState.settings.welcomeShown, updateState]);

  const isFree = positionMode === 'free';
  const getSideStyles = () => {
    switch (positionMode) {
      case 'top-left':
        return { left: '15px', top: '15px', x: '0%' };
      case 'top-right':
        return { left: 'calc(100% - 15px)', top: '15px', x: '-100%' };
      case 'bottom-left':
        return { left: '15px', top: 'auto', bottom: '45px', x: '0%' };
      case 'bottom-right':
        return { left: 'calc(100% - 15px)', top: 'auto', bottom: '45px', x: '-100%' };
      case 'top-center':
        return { left: '49.8%', top: '20px', x: '-50%' };
      case 'bottom-center':
        return { left: '49.8%', top: 'auto', bottom: '45px', x: '-50%' };
      default:
        return freeIslandPosition(
          islandX,
          islandY,
          { width, height },
          { width: window.innerWidth, height: window.innerHeight },
        );
    }
  };
  const sideStyles = getSideStyles();
  return {
    isPreview,
    leave,
    finishPositionChange,
    isOverlayOpen,
    islandElementRef,
    setIsHovered,
    mode,
    showInfoWhenIdleEnabled,
    isPlaying,
    setMode,
    clearClickSuppression,
    consumeClickSuppression,
    standbyBorderEnabled,
    largeStandbyEnabled,
    isInteractiveTarget,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    sideStyles,
    width,
    getExpandedTabSize,
    height,
    hideNotActiveIslandEnabled,
    bgColor,
    textColor,
    isHovered,
    theme,
    currentTab,
    syncWindowInputRegion,
    trackPointerPosition,
    bgImage,
    ...backgroundImage,
    islandBorderEnabled,
    islandCornerRadius,
    cameraInUse,
    microphoneInUse,
    charging,
    chargingAlert,
    percent,
    alert,
    bluetoothAlert,
    showPausedQuickView,
    cameraAlert,
    microphoneAlert,
    mediaTrack,
    trackTitle,
    mediaSnapshot,
    mediaActionError,
    mediaBusy,
    mediaPageId,
    controlMedia,
    selectMediaSession,
    openMediaSession,
    trackArtist,
    textWidth,
    nowPlayingWidth,
    time,
    overviewTime,
    overviewDate,
    weather,
    direction,
    currentTabId,
    visibleTabs,
    selectTab,
    browserSearch,
    setBrowserSearch,
    searchBrowser,
    searchError,
    setSearchError,
    searchUrlTemplate,
    setSearchUrlTemplate,
    workflows,
    openWorkflow,
    quickApps,
    asked,
    userText,
    setUserText,
    setAsked,
    askAI,
    aiAnswer,
    assistantError,
    setAIAnswer,
    resetAssistant,
    clipboard,
    copyToClipboard,
    tasks,
    removeTask,
    taskText,
    setTaskText,
    addTask,
    hourFormat,
    handleHourFormatChange,
    timeZone,
    handleTimeZoneChange,
    autoLaunchEnabled,
    handleAutoLaunchChange,
    displays,
    currentDisplayId,
    handleDisplayChange,
    tabOrder,
    hiddenTabs,
    moveTabOrder,
    setDefaultTabId,
    defaultTabId,
    toggleTabVisibility,
    setTheme,
    positionMode,
    handlePositionChange,
    isFree,
    islandX,
    handleIslandXChange,
    islandY,
    handleIslandYChange,
    handleIslandBorderChange,
    handleIslandCornerRadiusChange,
    handlehideNotActiveIslandChange,
    handleBgColorChange,
    handleTextColorChange,
    handleBgImageChange,
    batteryAlertsEnabled,
    handleBatteryAlertsChange,
    handleStandbyChange,
    handleLargeStandbyChange,
    handleShowInfoWhenIdleChange,
    weatherLocation,
    setWeatherLocation,
    weatherUnit,
    handleWeatherUnitChange,
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
    setShowSuggestions,
    addQuickApp,
    showSuggestions,
    appSuggestions,
    handleQaChange,
    removeQuickApp,
    leaveDelayMs,
    handleLeaveDelayChange,
    removeWorkflow,
  };
}
export type IslandController = ReturnType<typeof useIslandController>;
