import { isInteractiveTarget } from '../lib/interactions';
import type { PointerEvent, Dispatch, SetStateAction } from 'react';
import type { MediaTrack, IslandMode } from '../../shared/contracts';
import { nextTabId } from '../lib/navigation';
import { islandPages } from '../lib/tabs';
import { defaultPageLayoutContext } from '../lib/tabGeometry';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

import { TABS } from '../lib/tabs';
import { useAppState } from '../components/AppStateProvider';
export function useNavigation({
  mediaTrack,
  mediaAvailable = !!mediaTrack,
  mode,
  isDragging,
  setMode,
}: {
  mediaTrack: MediaTrack | null;
  mediaAvailable?: boolean;
  mode: IslandMode;
  isDragging: boolean;
  setMode: Dispatch<SetStateAction<IslandMode>>;
}) {
  const { state, updateState } = useAppState();
  const { tabOrder, hiddenTabs, defaultTabId } = state.settings;
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
  const isMusicActive = mediaAvailable;
  const visibleTabs = useMemo(
    () =>
      islandPages.visible(tabOrder, hiddenTabs, {
        ...defaultPageLayoutContext,
        mediaAvailable: isMusicActive,
      }),
    [tabOrder, hiddenTabs, isMusicActive],
  );
  const [[currentTabId, direction], setTabState] = useState<[string, number]>(() => {
    const id = visibleTabs.includes(defaultTabId) ? defaultTabId : visibleTabs[0]!;
    return [id, 0];
  });
  const currentTab = currentTabId;

  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.includes(currentTabId)) {
      setTabState([visibleTabs[0], 0]);
    }
  }, [hiddenTabs, visibleTabs, currentTabId]);
  const swipeStartX = useRef<number | null>(0);
  const swipeStartY = useRef(0);
  const swipeMoved = useRef(false);
  const suppressClick = useRef(false);
  const swipeThreshold = 60;
  const moveTab = useCallback(
    (direction: number) => {
      if (mode !== 'large') {
        setMode('large');
        return;
      }
      setTabState(([id]) => [nextTabId(visibleTabs, id, direction), direction]);
    },
    [mode, setMode, visibleTabs],
  );
  const selectTab = useCallback(
    (id: string, direction?: number) => {
      if (!visibleTabs.includes(id)) return;
      setTabState((previous) =>
        previous[0] === id
          ? previous
          : [
              id,
              direction ?? (visibleTabs.indexOf(id) > visibleTabs.indexOf(previous[0]) ? 1 : -1),
            ],
      );
    },
    [visibleTabs],
  );
  const clearClickSuppression = () => {
    suppressClick.current = false;
  };
  const consumeClickSuppression = () => {
    const suppressed = suppressClick.current;
    suppressClick.current = false;
    return suppressed;
  };
  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const target = e.target;
    if (!(target instanceof Element)) {
      swipeStartX.current = null;
      return;
    }
    if (
      mode !== 'large' ||
      isDragging ||
      isInteractiveTarget(target) ||
      target?.closest('#userinput') ||
      target?.id === 'userinput'
    ) {
      swipeStartX.current = null;
      return;
    }
    swipeStartX.current = e.clientX;
    swipeStartY.current = e.clientY;
    swipeMoved.current = false;
  };
  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (swipeStartX.current === null || mode !== 'large') return;
    const dx = Math.abs(e.clientX - swipeStartX.current);
    const dy = Math.abs(e.clientY - swipeStartY.current);
    if (dx > 8 || dy > 8) {
      swipeMoved.current = true;
      suppressClick.current = true;
    }
  };
  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    setTimeout(() => {
      suppressClick.current = false;
    }, 100);

    if (swipeStartX.current === null) return;
    const startX = swipeStartX.current;
    const startY = swipeStartY.current;
    swipeStartX.current = null;

    if (mode !== 'large' || isDragging) return;
    if (!swipeMoved.current) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) < swipeThreshold || Math.abs(dx) <= Math.abs(dy)) return;

    moveTab(dx > 0 ? -1 : 1);
  };
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        isInteractiveTarget(e.target) ||
        document.querySelector(
          '[data-island-overlay] [role="menu"], [data-island-overlay] [role="listbox"]',
        )
      )
        return;
      if (e.key === 'ArrowRight') {
        moveTab(1);
      } else if (e.key === 'ArrowLeft') {
        moveTab(-1);
      } else if (e.ctrlKey && /^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key) - 1;
        if (visibleTabs[idx] !== undefined) {
          const targetId = visibleTabs[idx];
          setMode('large');
          setTabState([
            targetId,
            visibleTabs.indexOf(targetId) > visibleTabs.indexOf(currentTabId) ? 1 : -1,
          ]);
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [moveTab, currentTabId, visibleTabs, setMode]);
  return {
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
  };
}
