import { useTranslation } from 'react-i18next';
import { useIslandInteraction } from './useIslandInteraction';
import { useEffect, useLayoutEffect, useReducer } from 'react';

import { measureTextWidth } from '../lib/text';
import { useAssistant } from './useAssistant';
import { useTasks } from './useTasks';
import { useWorkflows } from './useWorkflows';
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
  const { state: appState } = useAppState();
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
    hourFormat,
    showAmPm,
    timeZone,
    weatherUnit,
    theme,
    bgColor,
    textColor,
    bgImage,
    weatherLocation,
    positionMode,
    islandX,
    islandY,
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
  const {
    asked,
    setAsked,
    aiAnswer,
    assistantError,
    userText,
    setUserText,
    resetAssistant,
    askAI,
  } = useAssistant();
  const { tasks, taskText, setTaskText, addTask, removeTask } = useTasks();
  const { workflows } = useWorkflows();
  const quickApps = appState.quickApps;
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
  }, [appState.settings.displayId]);

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
    workflows,
    quickApps,
    asked,
    userText,
    setUserText,
    setAsked,
    askAI,
    aiAnswer,
    assistantError,
    resetAssistant,
    clipboard,
    copyToClipboard,
    tasks,
    removeTask,
    taskText,
    setTaskText,
    addTask,
    hourFormat,
    timeZone,
    positionMode,
    islandX,
    islandY,
    batteryAlertsEnabled,
    weatherLocation,
    weatherUnit,
    leaveDelayMs,
  };
}
export type IslandController = ReturnType<typeof useIslandController>;
