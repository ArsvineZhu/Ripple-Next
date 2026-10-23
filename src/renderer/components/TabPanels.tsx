import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import type { MotionValue } from 'motion/react';
import { useReducedMotionPreference } from '../hooks/useReducedMotionPreference';
import { nextTabId } from '../lib/navigation';
import {
  isClearVerticalSample,
  isResumedWheelPush,
  isTailDecay,
  isVerticalStroke,
  isVerticalTakeover,
  wheelEventAxis,
} from '../lib/wheelGesture';
import styles from './TabPanels.module.css';

interface Props<Id extends string | number> {
  tabs: Id[];
  activeId: Id;
  direction: number;
  width: MotionValue<number>;
  disabled: boolean;
  onSelect(id: Id, direction?: number): void;
  onProgress(from: Id, to: Id, progress: number, moving: boolean): void;
  renderTab(id: Id): ReactNode;
}

function tabAt<Id>(tabs: Id[], index: number): Id {
  return tabs[((index % tabs.length) + tabs.length) % tabs.length]!;
}

/**
 * Island motion. Two different models, because that is what the platform does.
 *
 * 1. The rubber band (a swipe running past a page) tracks the finger with a spring, then releases
 *    along Apple's closed-form curve - the Lion-era fallback that Chromium still ships
 *    (`ui/events/blink/input_scroll_elasticity_controller.cc`, mirrored from WebKit's
 *    `ScrollElasticityController.mm`):
 *
 *      kRubberbandStiffness = 20     kRubberbandAmplitude = 0.31     kRubberbandPeriod = 1.6
 *      x(t) = (x0 + v * t * 0.31) * e^(-12.5 * t)      // 12.5 = 20 / 1.6
 *
 *    `v` is the stretch velocity in px/s, positive while still pulling outward. The offset is
 *    rounded toward zero, so the release ends when it reaches zero (24 ms guard). Apple publishes
 *    no {k, c, m} for this, so the curve is evaluated per frame instead of integrated as a spring.
 *
 * 2. The page snap uses the only open WebKit page-transition curve
 *    (`ViewGestureControllerGtk.cpp`): easeOutCubic with a velocity-scaled duration clamped to
 *    100-400 ms. macOS Safari hands the same gesture to AppKit, whose curve is not public; the
 *    velocity multiplier is not in the WebKit source either, so 1 is used here.
 */
// The band has to reach the mapped stretch inside a flick, which lasts 30-70 ms: measured, the
// shipped 500/35 (response 0.20 s) only reached 7.5 px of the 28 px target at 32 ms and 16.8 px at
// 64 ms, which is why a fast swipe showed almost no rebound. 1974/63 is response 0.10 s, ζ1.00, so
// it is at 25.5 px by 64 ms and holds the full stretch until the release takes over.
const REBOUND_SPRING = { stiffness: 1974, damping: 63, mass: 0.5 };
const RUBBER_BAND_AMPLITUDE = 0.31;
const RUBBER_BAND_DECAY = 20 / 1.6;
const RUBBER_BAND_STOP = 0.5;
const RUBBER_BAND_MIN_SECONDS = 0.024;
const PAGE_SLIDE_MIN_SECONDS = 0.1;
const PAGE_SLIDE_MAX_SECONDS = 0.4;
const PAGE_SLIDE_VELOCITY_SCALE = 1;

function rubberBandAt(initial: number, velocity: number, seconds: number): number {
  return (
    (initial + velocity * seconds * RUBBER_BAND_AMPLITUDE) * Math.exp(-RUBBER_BAND_DECAY * seconds)
  );
}

/** First frame where the rounded offset is zero, with the platform's 24 ms guard. */
function rubberBandReleaseSeconds(initial: number, velocity: number): number {
  let seconds = RUBBER_BAND_MIN_SECONDS;
  while (seconds < 1.2 && Math.abs(rubberBandAt(initial, velocity, seconds)) > RUBBER_BAND_STOP)
    seconds += 0.008;
  return seconds;
}

function easeOutCubic(progress: number): number {
  const shifted = progress - 1;
  return shifted * shifted * shifted + 1;
}

function Page({
  id,
  index,
  count,
  position,
  width,
  elastic,
  active,
  children,
}: {
  id: string | number;
  index: number;
  count: number;
  position: MotionValue<number>;
  width: MotionValue<number>;
  elastic: MotionValue<number>;
  active: boolean;
  children: ReactNode;
}) {
  const distance = useTransform(() => {
    const cursor = position.get();
    return index + Math.round((cursor - index) / Math.max(1, count)) * count - cursor;
  });
  const x = useTransform(() => distance.get() * width.get() - elastic.get());
  // Only the two pages straddling the live position can paint. Extra elastic
  // displacement exposes empty edge space, never an unsolicited third page.
  const display = useTransform(() => (Math.abs(distance.get()) < 1 ? 'flex' : 'none'));
  return (
    <motion.div
      className={styles.page}
      data-tab-page={id}
      role="tabpanel"
      aria-hidden={!active}
      inert={!active}
      style={{ x, display }}
    >
      {children}
    </motion.div>
  );
}

export function TabPanels<Id extends string | number = number>(props: Props<Id>) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef(props);
  const initialIndex = Math.max(0, props.tabs.indexOf(props.activeId));
  const position = useMotionValue(initialIndex);
  const requested = useRef({
    id: props.activeId,
    position: initialIndex,
    tabs: props.tabs.join(','),
  });
  const [visualId, setVisualId] = useState(props.activeId);
  const visualRef = useRef(visualId);
  const elastic = useMotionValue(0);
  const elasticAnimation = useRef<ReturnType<typeof animate> | null>(null);
  const animation = useRef<ReturnType<typeof animate> | null>(null);
  const generation = useRef(0);
  const wheelTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const axisTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const axis = useRef<{
    startedAt: number;
    lastWheelAt: number;
    accumulatedX: number;
    accumulatedY: number;
    vertical: boolean;
  } | null>(null);
  const gesture = useRef<{
    anchor: Id;
    next: Id;
    direction: number;
    intent: Id;
    distance: number;
    peak: number;
    startedAt: number;
    lastWheelAt: number;
    lastIntentAt: number;
    previousIntent: Id;
    lastDirection: number;
    lastDelta: number;
    tailMin: number;
    decayed: boolean;
    quiet: boolean;
    risingSamples: number;
  } | null>(null);
  const reducedMotion = useReducedMotionPreference();

  // Release the band along the platform curve, seeded with the stretch velocity it has right now.
  const releaseElastic = useCallback(() => {
    elasticAnimation.current?.stop();
    elasticAnimation.current = null;
    const initial = elastic.get();
    if (reducedMotion || Math.abs(initial) < RUBBER_BAND_STOP) {
      elastic.set(0);
      return;
    }
    const velocity = elastic.getVelocity();
    const duration = rubberBandReleaseSeconds(initial, velocity);
    const token = generation.current;
    elasticAnimation.current = animate(elastic, 0, {
      duration,
      // Follow the closed form exactly: progress = 1 - x(t) / x0.
      ease: (progress) => 1 - rubberBandAt(initial, velocity, progress * duration) / initial,
      onComplete: () => {
        if (generation.current === token) elastic.set(0);
      },
    });
  }, [elastic, reducedMotion]);

  // While the finger drives the stroke the band tracks it with a spring, so the value never jumps.
  const trackElastic = useCallback(
    (target: number) => {
      if (reducedMotion) return;
      elasticAnimation.current?.stop();
      elasticAnimation.current = animate(elastic, target, { type: 'spring', ...REBOUND_SPRING });
    },
    [elastic, reducedMotion],
  );

  // Note: only the page position animation. The band owns its own lifecycle (track, release), and
  // stopping it here would freeze the band whenever a page retargets.
  const stop = useCallback(() => {
    generation.current++;
    animation.current?.stop();
    animation.current = null;
  }, []);
  const endGesture = useCallback(() => {
    wheelTimer.current = undefined;
    gesture.current = null;
    releaseElastic();
  }, [releaseElastic]);
  const paint = useCallback((cursor: number, moving: boolean) => {
    const { tabs, onProgress } = propsRef.current;
    if (!tabs.length) return;
    const base = Math.floor(cursor);
    const progress = cursor - base;
    const current = tabAt(tabs, Math.round(cursor));
    if (visualRef.current !== current) {
      visualRef.current = current;
      setVisualId(current);
    }
    const viewport = viewportRef.current;
    if (viewport) {
      viewport.dataset.tabPosition = String(cursor);
      viewport.dataset.tabProgress = String(progress);
    }
    if (moving) onProgress(tabAt(tabs, base), tabAt(tabs, base + 1), progress, true);
    else onProgress(current, current, 0, false);
  }, []);

  useLayoutEffect(() => {
    if (gesture.current && props.activeId !== gesture.current.intent) {
      clearTimeout(wheelTimer.current);
      endGesture();
    }
    propsRef.current = props;
  });
  useLayoutEffect(() => {
    if (!reducedMotion) return;
    stop();
    position.jump(requested.current.position);
    paint(requested.current.position, false);
    releaseElastic();
  }, [reducedMotion, releaseElastic, stop, position, paint]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.dataset.tabPosition = String(position.get());
    viewport.dataset.tabProgress = String(position.get() - Math.floor(position.get()));
    viewport.dataset.tabElastic = String(elastic.get());
    const unsubscribe = position.on('change', (cursor) => paint(cursor, true));
    const unsubscribeElastic = elastic.on('change', (value) => {
      viewport.dataset.tabElastic = String(value);
    });
    const unsubscribeNative = window.electronAPI?.onScrollGestureStart?.(({ at }) => {
      const lane = axis.current;
      if (lane && lane.startedAt < at) {
        clearTimeout(axisTimer.current);
        if (lane.lastWheelAt >= at) {
          lane.startedAt = at;
          lane.accumulatedX = 0;
          lane.accumulatedY = 0;
          lane.vertical = false;
          axisTimer.current = setTimeout(
            () => {
              axis.current = null;
            },
            Math.max(0, 150 - (Date.now() - lane.lastWheelAt)),
          );
        } else axis.current = null;
      }
      const current = gesture.current;
      // IPC may arrive after the first wheel tick of the same native gesture.
      // Keep a selection already made after this boundary; otherwise release
      // the old momentum stream so fresh input can select the next neighbor.
      if (!current || current.startedAt >= at) return;
      if (current.lastIntentAt >= at) {
        current.anchor = current.previousIntent;
        current.next = current.intent;
        current.direction = current.lastDirection;
        current.startedAt = at;
        current.distance = current.lastDelta;
        current.peak = current.lastDelta;
        current.tailMin = current.lastDelta;
        current.decayed = false;
        current.quiet = false;
        current.risingSamples = 0;
      } else {
        gesture.current = null;
      }
      clearTimeout(wheelTimer.current);
      wheelTimer.current = undefined;
      releaseElastic();
      if (gesture.current)
        wheelTimer.current = setTimeout(
          endGesture,
          Math.max(0, 150 - (Date.now() - current.lastWheelAt)),
        );
    });
    const wheel = (event: WheelEvent) => {
      if (propsRef.current.disabled || (!event.deltaX && !event.deltaY)) return;
      const now = Date.now();
      const pageWidth = Math.max(1, propsRef.current.width.get());
      const unit = event.deltaMode === 1 ? 40 : event.deltaMode === 2 ? pageWidth : 1;
      const delta = event.deltaX * unit;
      const deltaY = event.deltaY * unit;
      if (!axis.current)
        axis.current = {
          startedAt: now,
          lastWheelAt: now,
          accumulatedX: 0,
          accumulatedY: 0,
          vertical: false,
        };
      const lane = axis.current;
      lane.lastWheelAt = now;
      lane.accumulatedX += Math.abs(delta);
      lane.accumulatedY += Math.abs(deltaY);
      const diagonal = isVerticalTakeover(delta, deltaY);
      // A diagonal hands the stroke to the content, and a clearly vertical sample or a stroke
      // dominated by vertical movement keeps it until the input stops. Small drift never qualifies,
      // so one noisy tick cannot lock a sideways swipe away from the rail.
      if (
        diagonal ||
        isClearVerticalSample(delta, deltaY) ||
        isVerticalStroke(lane.accumulatedX, lane.accumulatedY)
      )
        lane.vertical = true;
      clearTimeout(axisTimer.current);
      axisTimer.current = setTimeout(() => {
        axis.current = null;
      }, 150);
      if (lane.vertical) {
        if (diagonal) {
          // Cancel a horizontal request from this stroke rather than letting a diagonal gesture
          // flip a tab.
          const current = gesture.current;
          if (current && propsRef.current.activeId === current.intent)
            propsRef.current.onSelect(current.anchor, -current.direction);
          clearTimeout(wheelTimer.current);
          endGesture();
        }
        return;
      }
      if (wheelEventAxis(delta, deltaY) !== 'horizontal') return;
      // Native vertical areas and nested horizontal controls keep their input.
      let child = event.target instanceof HTMLElement ? event.target : null;
      while (child && child !== viewport) {
        const overflow = getComputedStyle(child).overflowX;
        const limit = child.scrollWidth - child.clientWidth;
        if (
          (overflow === 'auto' || overflow === 'scroll') &&
          limit > 1 &&
          (event.deltaX < 0 ? child.scrollLeft > 0 : child.scrollLeft < limit)
        )
          return;
        child = child.parentElement;
      }
      event.preventDefault();
      const direction = Math.sign(delta);
      const magnitude = Math.abs(delta);
      const previous = gesture.current;
      if (previous) {
        if (direction !== previous.direction && magnitude < Math.min(2, previous.peak * 0.2))
          return;
        previous.risingSamples = magnitude > previous.lastDelta ? previous.risingSamples + 1 : 0;
        // The tail is measured against the stroke peak and the lowest sample since the last page,
        // not against the previous sample: a quick flick has no room to decay twice.
        if (isTailDecay(magnitude, previous.peak)) previous.decayed = true;
        // The band is only released once the input is genuinely quiet, not at the first sample that
        // drops below the resume threshold: cutting it loose there left a fast flick with 8px of a
        // 17px stretch because the spring was still rising.
        if (magnitude <= previous.peak * 0.15) previous.quiet = true;
        if (magnitude < previous.tailMin) previous.tailMin = magnitude;
        if (
          direction !== previous.direction ||
          // The tail has to have decayed deeply, not merely dipped: a single swipe whose samples
          // spike back up (300 -> 150 -> 200 -> 400) otherwise reads as a fresh push and turns two
          // pages.
          (previous.tailMin <= previous.peak * 0.25 &&
            isResumedWheelPush({
              magnitude,
              tailMagnitude: previous.tailMin,
              risingSamples: previous.risingSamples,
              decayed: previous.decayed,
            }))
        ) {
          clearTimeout(wheelTimer.current);
          endGesture();
        }
      }
      if (!gesture.current) {
        const anchor = propsRef.current.activeId;
        const next = nextTabId(propsRef.current.tabs, anchor, direction);
        gesture.current = {
          anchor,
          next,
          direction,
          intent: anchor,
          distance: 0,
          peak: magnitude,
          startedAt: now,
          lastWheelAt: now,
          lastIntentAt: -Infinity,
          previousIntent: anchor,
          lastDirection: direction,
          lastDelta: magnitude,
          tailMin: magnitude,
          decayed: false,
          quiet: false,
          risingSamples: 0,
        };
      }
      const current = gesture.current;
      const intent = direction === current.direction ? current.next : current.anchor;
      if (intent !== current.intent) {
        current.previousIntent = current.intent;
        current.intent = intent;
        current.lastIntentAt = now;
        current.distance = 0;
        current.peak = magnitude;
        current.tailMin = magnitude;
        current.decayed = false;
        current.quiet = false;
        // Direction is the trigger. Distance changes only the bounded elastic
        // response; it never decides whether another page should be selected.
        propsRef.current.onSelect(intent, direction);
      }
      // Low-energy momentum must lose accumulated pressure even while wheel
      // events keep arriving. It must not keep the edge pinned until silence.
      if (magnitude < current.peak * 0.5) {
        current.distance *= Math.exp(-(now - current.lastWheelAt) / 120);
      }
      current.distance += magnitude;
      current.peak = Math.max(current.peak, magnitude);
      current.lastWheelAt = now;
      current.lastDirection = direction;
      current.lastDelta = magnitude;
      const excess = Math.max(0, current.distance - pageWidth);
      // The band is held while the finger drives the stroke. Once the samples decay, only momentum
      // is left, so release it right there instead of holding it until the 150 ms input gap: the
      // page then finishes its slide as one movement instead of passing its centre and creeping
      // back.
      if (reducedMotion || current.quiet) releaseElastic();
      else trackElastic(direction * 28 * (1 - Math.exp(-excess / pageWidth)));
      clearTimeout(wheelTimer.current);
      wheelTimer.current = setTimeout(endGesture, 150);
    };
    viewport.addEventListener('wheel', wheel, { passive: false });
    return () => {
      stop();
      clearTimeout(wheelTimer.current);
      clearTimeout(axisTimer.current);
      unsubscribe();
      unsubscribeElastic();
      unsubscribeNative?.();
      viewport.removeEventListener('wheel', wheel);
    };
  }, [position, elastic, reducedMotion, stop, paint, endGesture, releaseElastic, trackElastic]);

  useLayoutEffect(() => {
    const order = props.tabs.join(',');
    if (requested.current.tabs !== order) {
      stop();
      requested.current = { id: props.activeId, position: initialIndex, tabs: order };
      position.jump(initialIndex);
      paint(initialIndex, false);
      return;
    }
    if (requested.current.id === props.activeId) return;
    const previousIndex = props.tabs.indexOf(requested.current.id);
    const targetIndex = props.tabs.indexOf(props.activeId);
    if (targetIndex < 0 || !props.tabs.length) return;
    const direction = props.direction || 1;
    const count = props.tabs.length;
    const steps =
      direction > 0
        ? (targetIndex - previousIndex + count) % count
        : (previousIndex - targetIndex + count) % count;
    const destination = requested.current.position + direction * steps;
    requested.current = { id: props.activeId, position: destination, tabs: order };
    stop();
    const token = generation.current;
    // Retarget the continuous position, including the pages already on screen.
    // Never replace an entering page or reset to an integer during interruption.
    paint(position.get(), true);
    const remaining = Math.abs(destination - position.get());
    const speed = Math.abs(position.getVelocity());
    const seconds = reducedMotion
      ? 0
      : Math.min(
          PAGE_SLIDE_MAX_SECONDS,
          Math.max(
            PAGE_SLIDE_MIN_SECONDS,
            speed > 1 ? (remaining / speed) * PAGE_SLIDE_VELOCITY_SCALE : PAGE_SLIDE_MAX_SECONDS,
          ),
        );
    animation.current = animate(position, destination, {
      duration: seconds,
      ease: easeOutCubic,
      onComplete: () => {
        if (generation.current === token) paint(destination, false);
      },
    });
  }, [
    props.activeId,
    props.direction,
    props.tabs,
    initialIndex,
    position,
    reducedMotion,
    stop,
    paint,
  ]);

  return (
    <div
      className={styles.viewport}
      ref={viewportRef}
      data-tab-viewport
      data-island-interactive
      onWheel={(event) => event.stopPropagation()}
    >
      {props.tabs.map((id, index) => (
        <Page
          key={id}
          id={id}
          index={index}
          count={props.tabs.length}
          position={position}
          width={props.width}
          elastic={elastic}
          active={id === visualId}
        >
          {props.renderTab(id)}
        </Page>
      ))}
    </div>
  );
}
