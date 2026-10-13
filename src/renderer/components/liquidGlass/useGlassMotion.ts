import { useEffect, useRef, type RefObject } from 'react';
import { useReducedMotionPreference } from '../../hooks/useReducedMotionPreference';
import { rdevResponse, type Anchor, type Point } from './interaction';

interface MotionOptions {
  controlRef?: RefObject<HTMLElement | null>;
  actorRef?: RefObject<HTMLElement | null>;
  enabled?: boolean;
  slider?: boolean;
}

/** Native controls own input; motion observes their host and paints CSS variables. */
export function useGlassMotion({
  controlRef,
  actorRef,
  enabled = true,
  slider = false,
}: MotionOptions) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotionPreference();
  // Parent control refs attach after child layout effects. Subscribe after all refs commit.
  useEffect(() => {
    const material = ref.current;
    const actor = actorRef?.current ?? material;
    const control = controlRef?.current ?? actor;
    const host = actor?.closest<HTMLElement>('[data-glass-host]');
    if (!material || !actor || !control || !host || !enabled) return;
    const fine = window.matchMedia('(any-pointer: fine)');
    let pointer: Point | null = null;
    let glowPoint: Point | null = null;
    let pressed = false;
    let frame = 0;
    let anchor: Anchor = { left: 0, top: 0, width: 1, height: 1 };
    // Measure layout offsets, never the actor's already transformed bounds.
    const measure = () => {
      const parent = actor.offsetParent as HTMLElement | null;
      const box = parent?.getBoundingClientRect() ?? { left: 0, top: 0 };
      anchor = {
        left: box.left + (parent?.clientLeft ?? 0) + actor.offsetLeft - (parent?.scrollLeft ?? 0),
        top: box.top + (parent?.clientTop ?? 0) + actor.offsetTop - (parent?.scrollTop ?? 0),
        width: actor.offsetWidth,
        height: actor.offsetHeight,
      };
    };
    const paint = () => {
      frame = 0;
      measure();
      const response = rdevResponse(
        !reduced && fine.matches ? pointer : null,
        anchor,
        0.15,
        200,
        pressed,
      );
      // The range owns its value axis. Keep its centre at the native thumb centre.
      if (slider) {
        response.x = 0;
        response.y = Math.max(-2, Math.min(2, response.y));
      }
      if (reduced) {
        response.x = response.y = 0;
        response.scaleX = response.scaleY = 1;
      }
      actor.style.setProperty('--motion-x', `${response.x}px`);
      actor.style.setProperty('--motion-y', `${response.y}px`);
      actor.style.setProperty('--motion-sx', String(response.scaleX));
      actor.style.setProperty('--motion-sy', String(response.scaleY));
      material.classList.toggle('lg--pressed', pressed);
      if (glowPoint) {
        const x =
          (glowPoint.x - anchor.left - anchor.width / 2 - response.x) / response.scaleX +
          anchor.width / 2;
        const y =
          (glowPoint.y - anchor.top - anchor.height / 2 - response.y) / response.scaleY +
          anchor.height / 2;
        material.style.setProperty('--lg-px', `${(x / anchor.width) * 100}%`);
        material.style.setProperty('--lg-py', `${(y / anchor.height) * 100}%`);
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const reset = () => {
      pointer = glowPoint = null;
      pressed = false;
      schedule();
    };
    const move = (event: PointerEvent) => {
      glowPoint = { x: event.clientX, y: event.clientY };
      pointer = event.pointerType === 'mouse' ? glowPoint : null;
      schedule();
    };
    const down = (event: PointerEvent) => {
      if (event.button !== 0 || !event.isPrimary || !control.contains(event.target as Node)) return;
      pressed = true;
      move(event);
    };
    const up = () => {
      pressed = false;
      schedule();
    };
    const keydown = (event: KeyboardEvent) => {
      if (slider && control.contains(event.target as Node)) {
        pointer = null;
        schedule();
      }
      if (!slider && control.contains(event.target as Node) && ['Enter', ' '].includes(event.key)) {
        pressed = true;
        schedule();
      }
    };
    const keyup = (event: KeyboardEvent) => {
      if (['Enter', ' '].includes(event.key)) up();
    };
    const hidden = () => {
      if (document.hidden) reset();
    };
    actor.style.setProperty('--motion-duration', `${reduced ? 0 : 0.2}s`);
    const observer = new ResizeObserver(schedule);
    observer.observe(actor);
    observer.observe(host);
    host.addEventListener('pointermove', move, { passive: true });
    // Capture observes Radix controls even when their handlers stop propagation.
    host.addEventListener('pointerdown', down, { capture: true, passive: true });
    host.addEventListener('pointerleave', reset);
    window.addEventListener('pointerup', up, true);
    window.addEventListener('pointercancel', reset, true);
    window.addEventListener('blur', reset);
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('keydown', keydown, true);
    window.addEventListener('keyup', keyup, true);
    control.addEventListener('focusout', reset);
    control.addEventListener('lostpointercapture', up);
    document.addEventListener('visibilitychange', hidden);
    fine.addEventListener('change', reset);
    paint();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      host.removeEventListener('pointermove', move);
      host.removeEventListener('pointerdown', down, true);
      host.removeEventListener('pointerleave', reset);
      window.removeEventListener('pointerup', up, true);
      window.removeEventListener('pointercancel', reset, true);
      window.removeEventListener('blur', reset);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('keydown', keydown, true);
      window.removeEventListener('keyup', keyup, true);
      control.removeEventListener('focusout', reset);
      control.removeEventListener('lostpointercapture', up);
      document.removeEventListener('visibilitychange', hidden);
      fine.removeEventListener('change', reset);
      material.classList.remove('lg--pressed');
      for (const name of [
        '--motion-x',
        '--motion-y',
        '--motion-sx',
        '--motion-sy',
        '--motion-duration',
      ])
        actor.style.removeProperty(name);
    };
  }, [enabled, slider, reduced, actorRef, controlRef]);
  return ref;
}
