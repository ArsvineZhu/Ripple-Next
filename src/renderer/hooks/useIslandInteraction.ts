import { useMachine } from '@xstate/react';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { IslandMode } from '../../shared/contracts';
import { islandInteractionMachine } from '../lib/islandInteractionMachine';
import type { InteractionBlockers } from '../lib/islandInteractionMachine';
import { useOverlay } from '../components/OverlayProvider';

interface Options {
  setMode: Dispatch<SetStateAction<IslandMode>>;
  mode: IslandMode;
  standby: boolean;
  largeStandby: boolean;
  leaveDelayMs: number;
}

function isFocusedControl(element: Element | null) {
  return (
    !!element &&
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName) &&
    !!element.closest('#Island') &&
    !element.closest('[inert], [hidden]')
  );
}

const initialBlockers: InteractionBlockers = {
  menuOpen: false,
  inputFocused: false,
};

export function useIslandInteraction({
  setMode,
  mode,
  standby,
  largeStandby,
  leaveDelayMs,
}: Options) {
  const collapseDelay = mode === 'quick' ? 0 : leaveDelayMs;
  const { openId } = useOverlay();
  const blockersRef = useRef<InteractionBlockers>(initialBlockers);
  const callbacksRef = useRef({ setMode, standby, largeStandby });
  useLayoutEffect(() => {
    callbacksRef.current = { setMode, standby, largeStandby };
  }, [setMode, standby, largeStandby]);
  const [snapshot, send] = useMachine(islandInteractionMachine, {
    input: {
      leaveDelayMs: collapseDelay,
      blockers: initialBlockers,
      setMousePassthrough: (ignore) => {
        void window.electronAPI?.setIgnoreMouseEvents(ignore, ignore);
      },
      collapse: () => {
        const current = callbacksRef.current;
        current.setMode(current.standby ? 'quick' : current.largeStandby ? 'large' : 'still');
      },
    },
  });

  const publishBlockers = useCallback(
    (patch: Partial<InteractionBlockers> = {}) => {
      if (
        Object.entries(patch).every(
          ([key, value]) => blockersRef.current[key as keyof InteractionBlockers] === value,
        )
      )
        return;
      blockersRef.current = { ...blockersRef.current, ...patch };
      send({ type: 'BLOCKERS_CHANGED', blockers: blockersRef.current });
    },
    [send],
  );

  useLayoutEffect(() => {
    if (openId !== null) send({ type: 'OVERLAY_OPEN' });
    publishBlockers({ menuOpen: openId !== null });
  }, [openId, publishBlockers, send]);

  useEffect(() => {
    send({ type: 'SET_DELAY', delayMs: collapseDelay });
  }, [collapseDelay, send]);

  useEffect(() => {
    const onFocusIn = () =>
      publishBlockers({
        inputFocused: document.hasFocus() && isFocusedControl(document.activeElement),
      });
    const onFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget instanceof Element ? event.relatedTarget : null;
      publishBlockers({ inputFocused: document.hasFocus() && isFocusedControl(next) });
    };
    const onWindowBlur = () => {
      publishBlockers({ inputFocused: false });
      send({ type: 'POINTER_LEAVE' });
    };
    // A page becoming inert or being removed need not emit a usable focusout.
    const observer = new MutationObserver(() => {
      if (blockersRef.current.inputFocused && !isFocusedControl(document.activeElement))
        publishBlockers({ inputFocused: false });
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['inert', 'hidden'],
    });
    window.addEventListener('focusin', onFocusIn);
    window.addEventListener('focusout', onFocusOut);
    window.addEventListener('focus', onFocusIn);
    window.addEventListener('blur', onWindowBlur);
    onFocusIn();
    return () => {
      observer.disconnect();
      window.removeEventListener('focusin', onFocusIn);
      window.removeEventListener('focusout', onFocusOut);
      window.removeEventListener('focus', onFocusIn);
      window.removeEventListener('blur', onWindowBlur);
    };
  }, [publishBlockers, send]);

  const setAssistantActive = useCallback(
    (assistantActive: boolean) => publishBlockers({ assistantActive }),
    [publishBlockers],
  );
  const setIsHovered = (value: boolean) =>
    send({ type: value ? 'POINTER_ENTER' : 'POINTER_LEAVE' });
  const leave = () => send({ type: 'POINTER_LEAVE' });
  const geometryExited = () => send({ type: 'GEOMETRY_EXIT' });

  return {
    isHovered: snapshot.matches('inside'),
    setIsHovered,
    setAssistantActive,
    leave,
    geometryExited,
    isOverlayOpen: openId !== null,
  };
}
