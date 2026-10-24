import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { animate, useMotionValue } from 'motion/react';
import { useReducedMotionPreference } from '../hooks/useReducedMotionPreference';
import { usePageSwipe } from '../hooks/usePageSwipe';
import { pageSwipeSettlement } from '../lib/pageSwipe';

import { tabAt, type PageRailOptions } from '../lib/pageRail';
export function useMacPageRail<Id extends string | number = number>(props: PageRailOptions<Id>) {
  const elastic = useMotionValue(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const current = useRef(props);
  const initialIndex = Math.max(0, props.tabs.indexOf(props.activeId));
  const position = useMotionValue(initialIndex);
  const committed = useRef({
    id: props.activeId,
    position: initialIndex,
    order: props.tabs.join(','),
  });
  const animation = useRef<ReturnType<typeof animate> | null>(null);
  const generation = useRef(0);
  const reduced = useReducedMotionPreference();
  const [visualId, setVisualId] = useState(props.activeId);
  const visual = useRef(visualId);
  useLayoutEffect(() => {
    current.current = props;
  });
  const paint = useCallback((cursor: number, moving: boolean) => {
    const { tabs, onProgress } = current.current;
    if (!tabs.length) return;
    const id = tabAt(tabs, Math.round(cursor));
    if (visual.current !== id) {
      visual.current = id;
      setVisualId(id);
    }
    if (viewportRef.current) {
      viewportRef.current.dataset.tabPosition = String(cursor);
      viewportRef.current.dataset.tabProgress = String(cursor - Math.floor(cursor));
    }
    if (moving)
      onProgress(
        tabAt(tabs, Math.floor(cursor)),
        tabAt(tabs, Math.floor(cursor) + 1),
        cursor - Math.floor(cursor),
        true,
      );
    else onProgress(id, id, 0, false);
  }, []);
  const stop = useCallback(() => {
    generation.current++;
    animation.current?.stop();
    animation.current = null;
  }, []);
  const settle = useCallback(
    (destination: number) => {
      stop();
      const token = generation.current;
      const remaining = Math.abs(destination - position.get());
      if (reduced || remaining < 0.0001) {
        position.jump(destination);
        paint(destination, false);
        return;
      }
      // No overshooting spring or second elastic animation: the visible rail converges once.
      animation.current = animate(position, destination, {
        ...pageSwipeSettlement(position.get(), destination),
        onComplete: () => {
          if (token === generation.current) paint(destination, false);
        },
      });
    },
    [paint, position, reduced, stop],
  );
  const swipe = usePageSwipe({
    viewportRef,
    disabled: props.disabled || props.tabs.length < 2,
    width: props.width,
    anchor: () => committed.current.position,
    position,
    track: (value) => {
      stop();
      if (!reduced) position.set(value);
    },
    release: (destination) => {
      const previous = committed.current.position;
      const { tabs, onSelect } = current.current;
      if (destination !== previous) {
        const id = tabAt(tabs, destination);
        committed.current = { ...committed.current, id, position: destination };
        onSelect(id, Math.sign(destination - previous));
      }
      settle(destination);
    },
  });
  useLayoutEffect(() => {
    paint(position.get(), false);
    const unsubscribe = position.on('change', (value) => paint(value, true));
    return () => {
      unsubscribe();
      stop();
      position.jump(committed.current.position);
    };
  }, [paint, position, stop]);
  useLayoutEffect(() => {
    const order = props.tabs.join(',');
    if (committed.current.order !== order) {
      swipe.cancel();
      stop();
      committed.current = { id: props.activeId, position: initialIndex, order };
      position.jump(initialIndex);
      paint(initialIndex, false);
      return;
    }
    if (committed.current.id === props.activeId) return;
    swipe.cancel();
    const previous = props.tabs.indexOf(committed.current.id);
    const target = props.tabs.indexOf(props.activeId);
    if (target < 0 || !props.tabs.length) return;
    const direction = props.direction || 1;
    const steps =
      direction > 0
        ? (target - previous + props.tabs.length) % props.tabs.length
        : (previous - target + props.tabs.length) % props.tabs.length;
    const destination = committed.current.position + direction * steps;
    committed.current = { id: props.activeId, position: destination, order };
    settle(destination);
  }, [
    props.activeId,
    props.direction,
    props.tabs,
    initialIndex,
    paint,
    position,
    settle,
    stop,
    swipe,
  ]);
  useLayoutEffect(() => {
    if (reduced) {
      swipe.cancel();
      settle(committed.current.position);
    }
  }, [reduced, settle, swipe]);
  return { viewportRef, position, elastic, visualId };
}
