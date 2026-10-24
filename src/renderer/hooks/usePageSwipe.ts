import { useLayoutEffect, useMemo, useRef } from 'react';
import type { RefObject } from 'react';
import type { MotionValue } from 'motion/react';
import type { NativeScroll } from '../../shared/contracts';
import { PageSwipe, pageSwipeAxis } from '../lib/pageSwipe';

interface Options {
  viewportRef: RefObject<HTMLDivElement | null>;
  width: MotionValue<number>;
  position: MotionValue<number>;
  disabled: boolean;
  anchor(): number;
  track(position: number): void;
  release(destination: number): void;
}

function childOwnsScroll(target: Element | null, viewport: HTMLElement, deltaX: number) {
  for (let element = target; element && element !== viewport; element = element.parentElement) {
    if (element.matches('input[type="range"], [role="slider"], [role="menu"], [role="listbox"]'))
      return true;
    const overflow = getComputedStyle(element).overflowX;
    if (
      (overflow === 'auto' || overflow === 'scroll') &&
      element.scrollWidth > element.clientWidth + 1 &&
      (deltaX < 0
        ? element.scrollLeft > 0
        : element.scrollLeft < element.scrollWidth - element.clientWidth)
    )
      return true;
  }
  return false;
}

function hasVerticalContent(target: Element | null, viewport: HTMLElement) {
  for (let element = target; element && element !== viewport; element = element.parentElement) {
    if (element.matches('[data-media-carousel]')) return true;
    const overflow = getComputedStyle(element).overflowY;
    if (
      (overflow === 'auto' || overflow === 'scroll') &&
      element.scrollHeight > element.clientHeight + 1
    )
      return true;
  }
  return false;
}

/** OS adapters feed a single stroke model; native and DOM streams never both drive the rail. */
export function usePageSwipe(options: Options) {
  const current = useRef(options);
  const cancelRef = useRef(() => {});
  const controls = useMemo(() => ({ cancel: () => cancelRef.current() }), []);
  useLayoutEffect(() => {
    current.current = options;
    if (options.disabled) cancelRef.current();
  });
  useLayoutEffect(() => {
    const viewport = current.current.viewportRef.current;
    if (!viewport) return;
    let alive = true;
    let native: boolean | null =
      typeof window.electronAPI?.getNativeScrollAvailable === 'function' ? null : false;
    let stroke: PageSwipe | null = null;
    let source: 'native' | 'wheel' | null = null;
    let blocked = false;
    let startTarget: Element | null = null;
    let finished = false;
    let wheelPhased = false;
    let horizontal = false;
    let domAxis: PageSwipe['axis'] = 'pending';
    let domTravelX = 0;
    let domTravelY = 0;
    let lastAt = 0;
    let lastWheelAt = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let quiet: ReturnType<typeof setTimeout> | undefined;
    let history: { x: number; y: number; at: number }[] = [];
    const clearTimers = () => {
      clearTimeout(timer);
      clearTimeout(quiet);
    };
    const finish = (at: number, cancelled = false) => {
      const active = stroke;
      stroke = null;
      finished = true;
      clearTimeout(timer);
      if (active?.axis === 'horizontal') current.current.release(active.release(at, cancelled));
    };
    const reset = () => {
      clearTimers();
      stroke = null;
      source = null;
      blocked = finished = wheelPhased = horizontal = false;
      history = [];
      domAxis = 'pending';
      domTravelX = domTravelY = 0;
    };
    const cancel = () => {
      finish(lastAt, true);
      reset();
    };
    cancelRef.current = cancel;
    const start = (at: number, target: Element | null, x: number, kind: 'native' | 'wheel') => {
      reset();
      source = kind;
      startTarget = target;
      blocked =
        current.current.disabled ||
        !target ||
        !viewport.contains(target) ||
        (x !== 0 && childOwnsScroll(target, viewport, x));
      if (!blocked)
        stroke = new PageSwipe(
          current.current.anchor(),
          current.current.position.get(),
          Math.max(1, current.current.width.get()),
          at,
          hasVerticalContent(target, viewport),
        );
    };
    const move = (x: number, y: number, at: number) => {
      lastAt = at;
      if (!stroke || blocked || current.current.disabled) return;
      if (stroke.axis === 'pending' && x !== 0 && childOwnsScroll(startTarget, viewport, x)) {
        blocked = true;
        return;
      }
      // DOM delivery can precede the native IPC copy. Share its ownership, not
      // its distance, so Chromium and the rail cannot consume different axes.
      if (source === 'native' && stroke.axis === 'pending' && domAxis !== 'pending') {
        stroke.axis = domAxis;
        stroke.origin = current.current.position.get();
      }
      const cursor = stroke.move(x, y, at, current.current.position.get());
      if (stroke.axis !== 'pending') domAxis = stroke.axis;
      if (cursor !== null) {
        horizontal = true;
        current.current.track(cursor);
      }
    };
    const scheduleQuiet = () => {
      clearTimeout(quiet);
      quiet = setTimeout(() => {
        finish(lastAt);
        reset();
      }, 180);
    };
    const wheelSample = (x: number, y: number, at: number, target: Element | null) => {
      if (!x && !y) return;
      if (source !== 'wheel') {
        const phased = wheelPhased;
        start(at, target, x, 'wheel');
        wheelPhased = phased;
      }
      lastWheelAt = at;
      if (!finished) {
        history.push({ x, y, at });
        if (history.length > 256) history.shift();
        move(x, y, at);
        clearTimeout(timer);
        // Missing OS phases (mouse wheels/X11): settle after a quiet burst, then
        // keep its tail consumed until a longer gap or an explicit fresh begin.
        if (!wheelPhased) timer = setTimeout(() => finish(lastAt + 100), 100);
      }
      if (!wheelPhased) scheduleQuiet();
    };
    const onNative = (event: NativeScroll) => {
      native = true;
      if (event.control) {
        cancel();
        return;
      }
      const target =
        event.phase === 'begin' || event.phase === 'wheel'
          ? document.elementFromPoint(event.x, event.y)
          : null;
      if (event.phase === 'wheel') {
        // A missing phase must never replace a contact already owned by AppKit.
        if (source === 'native' && !finished) {
          move(event.deltaX, event.deltaY, event.at);
          return;
        }
        wheelSample(event.deltaX, event.deltaY, event.at, target);
        return;
      }
      if (event.phase === 'begin' && (source !== 'native' || finished)) {
        if (stroke) finish(lastAt, true);
        start(event.at, target, event.deltaX, 'native');
      }
      if (source !== 'native') return;
      // Momentum belongs to the released stroke. It never adds page distance.
      if (event.phase === 'momentum') {
        finish(event.at);
        return;
      }
      if (event.phase === 'cancel') {
        finish(event.at, true);
        return;
      }
      move(event.deltaX, event.deltaY, event.at);
      if (event.phase === 'end') finish(event.at);
    };
    const unsubscribeNative = window.electronAPI?.onNativeScroll?.(onNative);
    void window.electronAPI
      ?.getNativeScrollAvailable?.()
      .then((available) => {
        if (alive && native === null) native = available;
      })
      .catch(() => {
        if (alive && native === null) native = false;
      });
    const wheel = (event: WheelEvent) => {
      if (current.current.disabled || event.ctrlKey) return;
      const target = event.target instanceof Element ? event.target : null;
      if (native !== false) {
        if (blocked || (domAxis === 'pending' && childOwnsScroll(target, viewport, event.deltaX)))
          return;
        if (domAxis === 'pending') {
          domTravelX += Math.abs(event.deltaX);
          domTravelY += Math.abs(event.deltaY);
          domAxis = pageSwipeAxis(domTravelX, domTravelY, hasVerticalContent(target, viewport));
        }
        // Once horizontal, block ALL vertical drift too. Pending diagonal input
        // waits for ownership instead of moving content before the rail decides.
        if (domAxis !== 'vertical') {
          event.preventDefault();
          event.stopPropagation();
        }
        return;
      }
      // Discrete line/page wheels can replace a completed touchpad stream.
      if (wheelPhased && finished && event.deltaMode !== 0) reset();
      const unit =
        event.deltaMode === 1 ? 40 : event.deltaMode === 2 ? current.current.width.get() : 1;
      wheelSample(event.deltaX * unit, event.deltaY * unit, Date.now(), target);
      if (!blocked && (horizontal || stroke?.axis === 'pending')) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const unsubscribeBegin = window.electronAPI?.onScrollGestureStart?.(({ at }) => {
      if (native !== false || (wheelPhased && !finished)) return;
      clearTimers();
      wheelPhased = true;
      // A boundary may reach the renderer after its first wheel event. Split the
      // buffered samples by event receipt time instead of counting that tick twice.
      const fresh = history.filter((sample) => sample.at >= at);
      const old = history.filter((sample) => sample.at < at);
      if (stroke && old.length && fresh.length) {
        const previous = new PageSwipe(
          stroke.anchor,
          stroke.origin,
          stroke.width,
          old[0].at,
          stroke.verticalContent,
        );
        for (const sample of old) previous.move(sample.x, sample.y, sample.at);
        if (previous.axis === 'horizontal')
          current.current.release(previous.release(old[old.length - 1].at));
      } else if (stroke && !fresh.length) finish(lastAt);
      else if (fresh.length && !old.length && !finished) return;
      const wasBlocked = blocked;
      reset();
      wheelPhased = true;
      if (fresh.length) {
        source = 'wheel';
        blocked = wasBlocked;
        if (!blocked)
          stroke = new PageSwipe(
            current.current.anchor(),
            current.current.position.get(),
            Math.max(1, current.current.width.get()),
            at,
            hasVerticalContent(startTarget, viewport),
          );
        history = fresh;
        for (const sample of fresh) move(sample.x, sample.y, sample.at);
      }
    });
    const unsubscribeEnd = window.electronAPI?.onScrollGestureEnd?.(({ at }) => {
      if (native !== false || source !== 'wheel' || finished) return;
      // End is authoritative even if the inertia wheel events are already queued.
      if (stroke && lastWheelAt > at) {
        const samples = history.filter((sample) => sample.at <= at);
        const bounded = new PageSwipe(
          stroke.anchor,
          stroke.origin,
          stroke.width,
          samples[0]?.at ?? at,
          stroke.verticalContent,
        );
        for (const sample of samples) bounded.move(sample.x, sample.y, sample.at);
        stroke = bounded;
      }
      finish(at);
      if (!wheelPhased) scheduleQuiet();
    });
    const hidden = () => {
      if (document.hidden) cancel();
    };
    viewport.addEventListener('wheel', wheel, { passive: false, capture: true });
    window.addEventListener('blur', cancel);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      alive = false;
      clearTimers();
      cancelRef.current = () => {};
      unsubscribeNative?.();
      unsubscribeBegin?.();
      unsubscribeEnd?.();
      viewport.removeEventListener('wheel', wheel, true);
      window.removeEventListener('blur', cancel);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, []);
  return controls;
}
