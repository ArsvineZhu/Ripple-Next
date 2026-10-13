// @vitest-environment happy-dom
import { act, createElement, useRef, type RefObject } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { useGlassMotion } from '../src/renderer/components/liquidGlass/useGlassMotion';

vi.mock('../src/renderer/hooks/useReducedMotionPreference', () => ({
  useReducedMotionPreference: () => false,
}));
function Decoration({ controlRef }: { controlRef: RefObject<HTMLButtonElement | null> }) {
  const ref = useGlassMotion({ controlRef, actorRef: controlRef });
  return createElement('div', { ref, 'data-material': true });
}
function Control() {
  const ref = useRef<HTMLButtonElement>(null);
  return createElement(
    'div',
    { 'data-glass-host': true },
    // oxlint-disable-next-line react/refs -- createElement forwards the ref; no current value is read during render.
    createElement('button', { ref }, createElement(Decoration, { controlRef: ref })),
  );
}
it('waits for the parent control ref and paints the complete control instead of its decoration', async () => {
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
  await act(async () => root.render(createElement(Control)));
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
  expect(parseFloat(button.style.getPropertyValue('--motion-x'))).toBeGreaterThan(0);
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
  expect(button.style.getPropertyValue('--motion-sx')).toBe('0.96');
  expect(material.classList.contains('lg--pressed')).toBe(true);
  window.dispatchEvent(new Event('blur'));
  flush();
  expect(button.style.getPropertyValue('--motion-sx')).toBe('1');
  expect(material.classList.contains('lg--pressed')).toBe(false);
  await act(async () => root.unmount());
  expect(frames.size).toBe(0);
  host.remove();
  media.mockRestore();
  vi.unstubAllGlobals();
});
