import { useEffect, useRef, type RefObject } from 'react';
import { useReducedMotionPreference } from '../../hooks/useReducedMotionPreference';
import { rdevResponse, type Anchor, type Point } from './interaction';

interface MotionOptions {
  controlRef?: RefObject<HTMLElement | null>;
  actorRef?: RefObject<HTMLElement | null>;
  enabled?: boolean;
  slider?: boolean;
  handle?: boolean;
  handleExpansion?: number;
  dragDeformation?: boolean;
  elasticity?: number;
  hoverOnly?: boolean;
}

/** Native controls own input; motion observes their host and paints CSS variables. */
export function useGlassMotion({
  controlRef,
  actorRef,
  enabled = true,
  slider = false,
  handle = false,
  handleExpansion = 1.6,
  dragDeformation = false,
  elasticity = 0.15,
  hoverOnly = false,
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
    let origin: Point | null = null;
    let dragged = false;
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
        !handle && !reduced && fine.matches ? pointer : null,
        anchor,
        elasticity,
        200,
        pressed && !handle,
      );
      // The range owns its value axis. Keep its centre at the native thumb centre.
      if (slider) {
        response.x = 0;
        response.y = Math.max(-2, Math.min(2, response.y));
      }
      if (handle) {
        response.x = response.y = 0;
        if (
          dragDeformation &&
          dragged &&
          pressed &&
          !reduced &&
          fine.matches &&
          pointer &&
          origin
        ) {
          const dx = pointer.x - origin.x,
            dy = pointer.y - origin.y;
          const fraction = Math.min(1, 100 / Math.max(1, Math.hypot(dx, dy)));
          const directional = rdevResponse(
            {
              x: anchor.left + anchor.width / 2 + dx * fraction,
              y: anchor.top + anchor.height / 2 + dy * fraction,
            },
            anchor,
            elasticity,
            200,
          );
          response.scaleX = Math.max(0.92, Math.min(1.08, 1 + (directional.scaleX - 1) * 4));
          response.scaleY = Math.max(0.92, Math.min(1.08, 1 + (directional.scaleY - 1) * 4));
        }
      }
      if (reduced) {
        response.x = response.y = 0;
        response.scaleX = response.scaleY = 1;
      }
      actor.style.setProperty('--motion-x', `${response.x}px`);
      actor.style.setProperty('--motion-y', `${response.y}px`);
      actor.style.setProperty('--motion-sx', String(response.scaleX));
      actor.style.setProperty('--motion-sy', String(response.scaleY));
      actor.style.setProperty(
        '--handle-scale',
        String(handle && pressed && !reduced ? handleExpansion : 1),
      );
      material.classList.toggle('lg--pressed', pressed);
      material.toggleAttribute('data-glass-dragging', slider && pressed);
      actor.toggleAttribute('data-glass-active', handle && pressed);
      if (glowPoint) {
        const width = handle ? Math.max(1, material.offsetWidth) : anchor.width;
        const height = handle ? Math.max(1, material.offsetHeight) : anchor.height;
        const x =
          (glowPoint.x - anchor.left - anchor.width / 2 - response.x) / response.scaleX + width / 2;
        const y =
          (glowPoint.y - anchor.top - anchor.height / 2 - response.y) / response.scaleY +
          height / 2;
        material.style.setProperty('--lg-px', `${(x / width) * 100}%`);
        material.style.setProperty('--lg-py', `${(y / height) * 100}%`);
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const reset = () => {
      window.removeEventListener('pointermove', heldMove);
      pointer = glowPoint = null;
      pressed = false;
      origin = null;
      dragged = false;
      schedule();
    };
    const move = (event: PointerEvent) => {
      if (handle && !pressed) return;
      if (hoverOnly && !pressed && !control.contains(event.target as Node)) {
        if (pointer || glowPoint) reset();
        return;
      }
      glowPoint = { x: event.clientX, y: event.clientY };
      if (handle && origin && Math.hypot(glowPoint.x - origin.x, glowPoint.y - origin.y) >= 3)
        dragged = true;
      pointer = event.pointerType === 'mouse' ? glowPoint : null;
      schedule();
    };
    const heldMove = (event: PointerEvent) => {
      if (pressed && !control.contains(event.target as Node)) move(event);
    };
    const down = (event: PointerEvent) => {
      if (event.button !== 0 || !event.isPrimary || !control.contains(event.target as Node)) return;
      pressed = true;
      if (hoverOnly) window.addEventListener('pointermove', heldMove, { passive: true });
      origin = { x: event.clientX, y: event.clientY };
      dragged = false;
      move(event);
    };
    const leaveControl = () => {
      if (!pressed) reset();
    };
    const up = () => {
      window.removeEventListener('pointermove', heldMove);
      if (hoverOnly && glowPoint) {
        measure();
        if (
          glowPoint.x < anchor.left ||
          glowPoint.x > anchor.left + anchor.width ||
          glowPoint.y < anchor.top ||
          glowPoint.y > anchor.top + anchor.height
        ) {
          reset();
          return;
        }
      }
      pressed = false;
      dragged = false;
      origin = null;
      schedule();
    };
    const captureLost = (event: PointerEvent) => {
      // Native range thumbs can take over capture without releasing the mouse.
      if (!(event.buttons & 1)) up();
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
    const inputHost = hoverOnly ? control : host;
    inputHost.addEventListener('pointermove', move, { passive: true });
    if (hoverOnly) {
      control.addEventListener('pointerenter', move);
      control.addEventListener('pointerleave', leaveControl);
    }
    // Capture observes Radix controls even when their handlers stop propagation.
    inputHost.addEventListener('pointerdown', down, { capture: true, passive: true });
    host.addEventListener('pointerleave', reset);
    window.addEventListener('pointerup', up, true);
    window.addEventListener('pointercancel', reset, true);
    window.addEventListener('blur', reset);
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('keydown', keydown, true);
    window.addEventListener('keyup', keyup, true);
    control.addEventListener('focusout', reset);
    control.addEventListener('lostpointercapture', captureLost);
    const position = actor.parentElement;
    const positioned = (event: TransitionEvent) => {
      if (event.target === position && ['left', 'transform'].includes(event.propertyName))
        schedule();
    };
    position?.addEventListener('transitionend', positioned);
    document.addEventListener('visibilitychange', hidden);
    fine.addEventListener('change', reset);
    paint();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      inputHost.removeEventListener('pointermove', move);
      window.removeEventListener('pointermove', heldMove);
      control.removeEventListener('pointerenter', move);
      control.removeEventListener('pointerleave', leaveControl);
      inputHost.removeEventListener('pointerdown', down, true);
      host.removeEventListener('pointerleave', reset);
      window.removeEventListener('pointerup', up, true);
      window.removeEventListener('pointercancel', reset, true);
      window.removeEventListener('blur', reset);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('keydown', keydown, true);
      window.removeEventListener('keyup', keyup, true);
      control.removeEventListener('focusout', reset);
      control.removeEventListener('lostpointercapture', captureLost);
      position?.removeEventListener('transitionend', positioned);
      document.removeEventListener('visibilitychange', hidden);
      fine.removeEventListener('change', reset);
      material.classList.remove('lg--pressed');
      material.removeAttribute('data-glass-dragging');
      actor.removeAttribute('data-glass-active');
      for (const name of [
        '--motion-x',
        '--motion-y',
        '--motion-sx',
        '--motion-sy',
        '--motion-duration',
        '--handle-scale',
      ])
        actor.style.removeProperty(name);
    };
  }, [
    enabled,
    slider,
    handle,
    handleExpansion,
    dragDeformation,
    reduced,
    actorRef,
    controlRef,
    elasticity,
    hoverOnly,
  ]);
  return ref;
}
