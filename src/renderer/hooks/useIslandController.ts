import { useTranslation } from 'react-i18next';
import { useIslandInteraction } from './useIslandInteraction';
import { useLayoutEffect, useReducer } from 'react';

import { measureTextWidth } from '../lib/text';
import { useAssistant } from './useAssistant';
import { useClipboard } from './useClipboard';
import { useOverview } from './useOverview';
import { useBattery } from './useBattery';
import { useBatteryAlerts } from './useBatteryAlerts';
import { useDeviceAlerts } from './useDeviceAlerts';
import { useMedia } from './useMedia';
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
    batteryAlerts: batteryAlertsEnabled,
    islandBorder: islandBorderEnabled,
    islandCornerRadius,
    standbyMode: standbyBorderEnabled,
    largeStandbyMode: largeStandbyEnabled,
    hideIslandWhenInactive: hideNotActiveIslandEnabled,
    showInfoWhenIdle: showInfoWhenIdleEnabled,
    leaveDelayMs,
    theme,
    backgroundColor: bgColor,
    textColor,
    backgroundImage: bgImage,
    positionMode,
    islandX,
    islandY,
  } = appState.settings;
  const isPreview = useIslandPreview();
  const mode = isPreview
    ? 'large'
    : resolveMode(requestedMode, standbyBorderEnabled, largeStandbyEnabled);
  const backgroundImage = useBackgroundImage(bgImage);
  const media = useMedia();
  const { mediaTrack, mediaSnapshot, mediaActionError } = media;
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
  const assistant = useAssistant();
  const { asked } = assistant;
  const tasks = appState.tasks;
  const workflows = appState.workflows;
  const clipboard = useClipboard();
  const overview = useOverview();
  const battery = useBattery();
  const { percent, charging } = battery;
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
  const music = appState.settings.music;
  const nowPlayingText = mediaTrack
    ? trackTitle + (mode === 'still' && !music.idleArtist ? '' : ` • ${trackArtist}`)
    : '';
  const textWidth = measureTextWidth(nowPlayingText) || nowPlayingText.length * 7;
  const nowPlayingWidth = Math.min(300, Math.max(122, Math.ceil(textWidth + 82)));
  const hasMediaFeedback = Boolean(mediaActionError || (mediaTrack && mediaSnapshot.error));
  const getExpandedTabSize = (id: string, answerHeight = 0) => {
    const size = islandPages.size(id, {
      mediaAvailable: mediaSnapshot.sessions.length > 0,
      workflowCount: workflows.length,
      taskCount: tasks.length,
      assistantActive: asked,
      answerHeight,
      viewportHeight: window.innerHeight,
    });
    return id === 'playing' && hasMediaFeedback ? { ...size, height: size.height + 24 } : size;
  };
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
  const compactMediaError =
    mode !== 'large' &&
    (isPlaying || media.showPausedQuickView) &&
    !alert &&
    !chargingAlert &&
    !bluetoothAlert &&
    !cameraAlert &&
    !microphoneAlert &&
    Boolean(mediaActionError || mediaSnapshot.error);
  const feedbackHeight =
    compactMediaError || (mode === 'large' && currentTab === 'playing' && hasMediaFeedback)
      ? 24
      : 0;
  if (compactMediaError) width = Math.max(width, 230);
  let height = mode === 'large' ? expandedSize.height : 40 + feedbackHeight;
  const getSideStyles = () => {
    switch (positionMode) {
      case 'top-left':
        return { left: '15px', top: '15px', x: '0%' };
      case 'top-right':
        return { left: 'calc(100% - 15px)', top: '15px', x: '-100%' };
      case 'bottom-left':
        return { left: '15px', top: 'auto', bottom: `${45 - feedbackHeight}px`, x: '0%' };
      case 'bottom-right':
        return {
          left: 'calc(100% - 15px)',
          top: 'auto',
          bottom: `${45 - feedbackHeight}px`,
          x: '-100%',
        };
      case 'top-center':
        return { left: '49.8%', top: '20px', x: '-50%' };
      case 'bottom-center':
        return { left: '49.8%', top: 'auto', bottom: `${45 - feedbackHeight}px`, x: '-50%' };
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
    music,
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
    chargingAlert,
    alert,
    bluetoothAlert,
    cameraAlert,
    microphoneAlert,
    trackTitle,
    trackArtist,
    textWidth,
    nowPlayingWidth,
    direction,
    currentTabId,
    visibleTabs,
    selectTab,
    media,
    overview,
    battery,
    assistant,
    clipboard,
    positionMode,
    islandX,
    islandY,
    batteryAlertsEnabled,
    leaveDelayMs,
  };
}
export type IslandController = ReturnType<typeof useIslandController>;
