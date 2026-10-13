// @vitest-environment happy-dom
import { act, createElement, useRef, type RefObject } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { useGlassMotion } from '../src/renderer/components/liquidGlass/useGlassMotion';

vi.mock('../src/renderer/hooks/useReducedMotionPreference', () => ({
  useReducedMotionPreference: () => false,
}));
function Decoration({
  controlRef,
  slider,
  handle,
}: {
  controlRef: RefObject<HTMLButtonElement | null>;
  slider: boolean;
  handle: boolean;
}) {
  const ref = useGlassMotion({ controlRef, actorRef: controlRef, slider, handle });
  return createElement('div', { ref, 'data-material': true });
}
// oxlint-disable react/refs -- createElement forwards the ref; it never reads its current value.
function Control({ slider, handle }: { slider: boolean; handle: boolean }) {
  const ref = useRef<HTMLButtonElement>(null);
  return createElement(
    'div',
    { 'data-glass-host': true },
    // oxlint-disable-next-line react/refs -- createElement forwards the ref; no current value is read during render.
    createElement(
      'button',
      { ref },
      createElement(Decoration, { controlRef: ref, slider, handle }),
    ),
  );
}
// oxlint-enable react/refs
it.each([
  { slider: false, handle: false },
  { slider: false, handle: true },
  { slider: true, handle: true },
])('owns and restores button/handle geometry (%j)', async ({ slider, handle }) => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const frames = new Map<number, FrameRequestCallback>();
  let serial = 0;
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => {
    frames.set(++serial, fn);
    return serial;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  const media = vi.spyOn(window, 'matchMedia').mockImplementation(
    (query) =>
      ({
        matches: query.includes('pointer'),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }) as unknown as MediaQueryList,
  );
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(createElement(Control, { slider, handle })));
  const button = host.querySelector('button')!,
    material = host.querySelector<HTMLElement>('[data-material]')!;
  Object.defineProperties(button, {
    offsetWidth: { value: 60 },
    offsetHeight: { value: 36 },
    offsetLeft: { value: 40 },
    offsetTop: { value: 20 },
  });
  const flush = () => {
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach((fn) => fn(0));
  };
  host.querySelector('[data-glass-host]')!.dispatchEvent(
    new PointerEvent('pointermove', {
      bubbles: true,
      pointerType: 'mouse',
      clientX: 180,
      clientY: 60,
      isPrimary: true,
    }),
  );
  flush();
  if (slider) expect(button.style.getPropertyValue('--motion-x')).toBe('0px');
  else expect(parseFloat(button.style.getPropertyValue('--motion-x'))).toBeGreaterThan(0);
  expect(material.style.getPropertyValue('--motion-x')).toBe('');
  button.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      pointerType: 'mouse',
      clientX: 70,
      clientY: 38,
      isPrimary: true,
      button: 0,
    }),
  );
  flush();
  expect(button.style.getPropertyValue('--motion-sx')).toBe(handle ? '1' : '0.96');
  expect(button.style.getPropertyValue('--handle-scale')).toBe(handle ? '1.6' : '1');
  expect(button.hasAttribute('data-glass-active')).toBe(handle);
  expect(material.hasAttribute('data-glass-dragging')).toBe(slider);
  expect(material.classList.contains('lg--pressed')).toBe(true);
  window.dispatchEvent(new Event('blur'));
  flush();
  expect(button.style.getPropertyValue('--motion-sx')).toBe('1');
  expect(material.classList.contains('lg--pressed')).toBe(false);
  expect(material.hasAttribute('data-glass-dragging')).toBe(false);
  expect(button.hasAttribute('data-glass-active')).toBe(false);
  await act(async () => root.unmount());
  expect(frames.size).toBe(0);
  host.remove();
  media.mockRestore();
  vi.unstubAllGlobals();
});
