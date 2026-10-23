import { islandPages } from './lib/tabs';
import styles from './styles/Island.module.css';
import { useOverlay } from './components/OverlayProvider';
import { motion } from 'motion/react';
import { TabPanels } from './components/TabPanels';
import { useIslandController } from './hooks/useIslandController';
import { useIslandGeometry } from './hooks/useIslandGeometry';
import { QuickView } from './components/QuickView';
import { Activity, useCallback, useEffect, useState } from 'react';
import { recordIslandContext } from './lib/diagnostics';
export default function Island() {
  const controller = useIslandController();
  const [assistantAnswerHeight, setAssistantAnswerHeight] = useState(0);
  const resetAssistantAnswerHeight = useCallback(() => setAssistantAnswerHeight(0), []);
  const { setContainer, beginPointerGesture, consumeShellClick } = useOverlay();
  const {
    leave,
    isOverlayOpen,
    islandElementRef,
    setIsHovered,
    mode,
    showInfoWhenIdleEnabled,
    isPlaying,
    setMode,
    clearClickSuppression,
    consumeClickSuppression,
    isInteractiveTarget,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    sideStyles,
    width,
    height,
    hideNotActiveIslandEnabled,
    bgColor,
    textColor,
    isHovered,
    isPreview,
    theme,
    currentTab,
    syncWindowInputRegion,
    islandBorderEnabled,
    islandCornerRadius,
    cameraInUse,
    microphoneInUse,
    chargingAlert,
    alert,
    bluetoothAlert,
    currentTabId,
    visibleTabs,
    selectTab,
    direction,
    trackPointerPosition,
  } = controller;
  const { charging, percent } = controller.battery;
  const reportIslandContext = useCallback(() => {
    const bounds = islandElementRef.current?.getBoundingClientRect();
    if (!bounds) return;
    recordIslandContext({
      tabId: currentTabId,
      mode,
      expanded: mode === 'large',
      asked: controller.assistant.asked,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      inputRegion: { width: bounds.width, height: bounds.height },
    });
  }, [controller.assistant.asked, currentTabId, islandElementRef, mode]);
  useEffect(() => {
    reportIslandContext();
    window.addEventListener('resize', reportIslandContext);
    return () => window.removeEventListener('resize', reportIslandContext);
  }, [reportIslandContext]);
  const animatedHeight =
    mode === 'large'
      ? controller.getExpandedTabSize(currentTab, assistantAnswerHeight).height
      : height;
  const geometry = useIslandGeometry({
    width,
    height: animatedHeight,
    expanded: mode === 'large',
    tab: currentTab,
    getTabRadius: islandPages.radius,
    cornerRadius: islandCornerRadius,
    getTabSize: (id) => controller.getExpandedTabSize(id, assistantAnswerHeight),
  });
  const { width: visualWidth, height: visualHeight, radius, cornerK, fallbackRadius } = geometry;
  useEffect(() => {
    const stopWidth = visualWidth.on('change', syncWindowInputRegion);
    const stopHeight = visualHeight.on('change', syncWindowInputRegion);
    const stopRadius = radius.on('change', syncWindowInputRegion);
    const stopCorner = cornerK.on('change', syncWindowInputRegion);
    return () => {
      stopWidth();
      stopHeight();
      stopRadius();
      stopCorner();
    };
  }, [visualWidth, visualHeight, radius, cornerK, syncWindowInputRegion]);
  const handleTabProgress = (from: string, to: string, progress: number, moving: boolean) => {
    geometry.followTabs(from, to, progress, moving);
    syncWindowInputRegion();
  };
  return (
    <motion.div
      id="Island"
      className={styles.Island}
      data-island
      data-theme={theme}
      ref={islandElementRef}
      onMouseEnter={(event) => {
        trackPointerPosition(event);
        setIsHovered(true);
        if (mode === 'still' && showInfoWhenIdleEnabled && !isPlaying) {
          setMode('large');
        } else if (mode !== 'large') {
          setMode('quick');
        }
      }}
      onMouseLeave={(event) => {
        trackPointerPosition(event);
        clearClickSuppression();
        leave();
      }}
      onClick={(e) => {
        if (consumeShellClick() || isOverlayOpen) return;
        if (consumeClickSuppression()) {
          return;
        }
        if (isInteractiveTarget(e.target)) return;

        const activeTag = document.activeElement?.tagName;
        if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') {
          (document.activeElement as HTMLElement).blur();
        }

        setMode((prev) => (prev === 'large' ? 'quick' : 'large'));
        if (window.electronAPI) {
          window.electronAPI.setIgnoreMouseEvents(false, false);
        }
      }}
      onPointerDownCapture={beginPointerGesture}
      onPointerDown={(event) => {
        if (!isOverlayOpen) handlePointerDown(event);
      }}
      onPointerMove={(event) => {
        trackPointerPosition(event);
        handlePointerMove(event);
      }}
      onPointerUp={(event) => {
        if (!isOverlayOpen) handlePointerUp(event);
      }}
      initial={{
        x: sideStyles.x,
        left: sideStyles.left,
        top: sideStyles.top ?? 'auto',
        bottom: sideStyles.bottom ?? 'auto',
      }}
      animate={{
        left: sideStyles.left,
        top: sideStyles.top ?? 'auto',
        bottom: sideStyles.bottom ?? 'auto',
        backgroundColor: hideNotActiveIslandEnabled && mode === 'still' ? 'rgba(0,0,0,0)' : bgColor,
        color: hideNotActiveIslandEnabled && mode === 'still' ? 'rgba(0,0,0,0)' : textColor,
        scale: isHovered && mode === 'large' ? 1.05 : 1,
        x: sideStyles.x,
      }}
      onUpdate={syncWindowInputRegion}
      onAnimationComplete={() => {
        syncWindowInputRegion();
        reportIslandContext();
      }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 40,
        mass: 2.5,
        scale: { type: 'tween', duration: 0.16, ease: [0.2, 0.8, 0.2, 1], delay: 0 },
        x: { duration: isPreview ? 0 : 0.15 },
        left: isPreview ? { duration: 0 } : undefined,
        top: isPreview ? { duration: 0 } : undefined,
        bottom: isPreview ? { duration: 0 } : undefined,
      }}
      style={{
        width: visualWidth,
        height: visualHeight,
        backgroundImage: controller.backgroundImageStyle,
        justifyContent:
          mode === 'large' ? (islandPages.get(currentTab)?.alignment ?? 'center') : 'center',
        border:
          theme === 'win95'
            ? hideNotActiveIslandEnabled && mode === 'still'
              ? 'none'
              : undefined
            : islandBorderEnabled
              ? cameraInUse
                ? `1px solid rgba(255, 215, 0, 0.8)`
                : microphoneInUse
                  ? `1px solid rgba(255, 154, 0, 0.8)`
                  : charging || chargingAlert
                    ? `1px solid rgba(111, 255, 123, 0.5)`
                    : (typeof percent === 'number' && percent <= 20) || alert
                      ? `1px solid rgba(255, 63, 63, 0.5)`
                      : bluetoothAlert
                        ? `1px solid rgba(0, 150, 255, 0.34)`
                        : hideNotActiveIslandEnabled
                          ? 'none'
                          : `1px solid color-mix(in srgb, ${textColor}, transparent 70%)`
              : 'none',
        boxShadow:
          hideNotActiveIslandEnabled && mode === 'still'
            ? 'none'
            : theme === 'win95'
              ? undefined
              : isHovered
                ? '0 0 32px rgba(0, 0, 0, 0.25)'
                : '0 0 24px rgba(0, 0, 0, 0.12)',
        ...({
          '--island-text-color': textColor,
          '--island-bg-color': bgColor,
          '--island-radius': radius,
          '--island-corner-k': cornerK,
          '--island-fallback-radius': fallbackRadius,
        } as import('motion/react').MotionStyle),
      }}
    >
      <div className={styles.content}>
        {/*Quickview*/}
        <QuickView
          {...controller}
          {...controller.media}
          {...controller.overview}
          {...controller.battery}
        />

        <Activity mode={mode === 'large' ? 'visible' : 'hidden'}>
          <TabPanels
            tabs={visibleTabs}
            activeId={currentTabId}
            width={visualWidth}
            direction={direction}
            disabled={isOverlayOpen}
            onProgress={handleTabProgress}
            onSelect={selectTab}
            renderTab={(tab) =>
              islandPages.get(tab)?.render({
                controller,
                onAnswerContentSizeChange: setAssistantAnswerHeight,
                resetAnswerContentSize: resetAssistantAnswerHeight,
              })
            }
          />
        </Activity>
        <div ref={setContainer} data-island-overlay className={styles.overlay} />
      </div>
    </motion.div>
  );
}
