import { useLayoutEffect, useRef, useState } from 'react';
import type { MediaSession } from '../../shared/media';
import {
  isResumedWheelPush,
  isTailDecay,
  isVerticalTakeover,
  wheelEventAxis,
} from '../lib/wheelGesture';

function sessionOrder(order: string[], sessions: MediaSession[]) {
  return [
    ...order.filter((id) => sessions.some((item) => item.id === id)),
    ...sessions.map((item) => item.id).filter((id) => !order.includes(id)),
  ];
}
export function useMediaPaging(
  sessions: MediaSession[],
  selectedId: string | null,
  onSelect: (id: string | null) => void,
) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [order, setOrder] = useState<string[]>([]);
  const ids = sessionOrder(order, sessions);
  const orderedSessions = ids.map((id) => sessions.find((item) => item.id === id)!);
  const enabled = sessions.length > 1 || selectedId !== null;
  const current = useRef({ ids, selectedId, onSelect, enabled });
  useLayoutEffect(() => {
    current.current = { ids, selectedId, onSelect, enabled };
  });
  useLayoutEffect(() => {
    setOrder((previous) => {
      const next = sessionOrder(previous, sessions);
      return previous.length === next.length && previous.every((id, index) => id === next[index])
        ? previous
        : next;
    });
  }, [sessions]);
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    let axis: ReturnType<typeof wheelEventAxis> | null = null;
    let timer: ReturnType<typeof setTimeout>;
    let gesture: {
      startedAt: number;
      lastWheelAt: number;
      lastIntentAt: number;
      peak: number;
      tail: number;
      lastDelta: number;
      rising: number;
      decayed: boolean;
      consumed: boolean;
    } | null = null;
    const reset = () => {
      axis = null;
      gesture = null;
    };
    const unsubscribe = window.electronAPI?.onScrollGestureStart?.(({ at }) => {
      if (!gesture || gesture.startedAt >= at) return;
      if (gesture.lastWheelAt < at) reset();
      else {
        gesture.startedAt = at;
        gesture.consumed = gesture.lastIntentAt >= at;
        gesture.peak = Math.abs(gesture.lastDelta);
        gesture.tail = gesture.peak;
        gesture.rising = 0;
        gesture.decayed = false;
        axis = wheelEventAxis(0, gesture.lastDelta);
      }
    });
    const wheel = (event: WheelEvent) => {
      if (!current.current.enabled || (!event.deltaX && !event.deltaY) || event.ctrlKey) return;
      const now = Date.now();
      const unit =
        event.deltaMode === 1 ? 40 : event.deltaMode === 2 ? Math.max(1, viewport.clientHeight) : 1;
      const x = event.deltaX * unit,
        y = event.deltaY * unit;
      if (!axis || isVerticalTakeover(x, y)) axis = wheelEventAxis(x, y);
      clearTimeout(timer);
      timer = setTimeout(reset, 150);
      if (axis !== 'vertical') return;
      // Bubble so TabPanels also retains vertical ownership through horizontal-only tail ticks.
      event.preventDefault();
      if (!y) return;
      const magnitude = Math.abs(y);
      if (gesture) {
        gesture.lastWheelAt = now;
        gesture.rising = magnitude > Math.abs(gesture.lastDelta) ? gesture.rising + 1 : 0;
        gesture.decayed ||= isTailDecay(magnitude, gesture.peak);
        gesture.tail = Math.min(gesture.tail, magnitude);
        if (
          gesture.tail <= gesture.peak * 0.25 &&
          isResumedWheelPush({
            magnitude,
            tailMagnitude: gesture.tail,
            risingSamples: gesture.rising,
            decayed: gesture.decayed,
          })
        )
          gesture = null;
      }
      if (!gesture)
        gesture = {
          startedAt: now,
          lastWheelAt: now,
          lastIntentAt: -Infinity,
          peak: magnitude,
          tail: magnitude,
          lastDelta: y,
          rising: 0,
          decayed: false,
          consumed: false,
        };
      gesture.lastDelta = y;
      gesture.peak = Math.max(gesture.peak, magnitude);
      if (gesture.consumed) return;
      gesture.consumed = true;
      gesture.lastIntentAt = now;
      const pages: (string | null)[] = [null, ...current.current.ids];
      const index = Math.max(0, pages.indexOf(current.current.selectedId));
      const next = Math.max(0, Math.min(pages.length - 1, index + Math.sign(y)));
      if (next !== index) {
        current.current.selectedId = pages[next];
        current.current.onSelect(pages[next]);
      }
    };
    viewport.addEventListener('wheel', wheel, { passive: false });
    return () => {
      clearTimeout(timer);
      unsubscribe?.();
      viewport.removeEventListener('wheel', wheel);
    };
  }, []);
  return { viewportRef, orderedSessions, pagingEnabled: enabled };
}
