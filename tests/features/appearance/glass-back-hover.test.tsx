// @vitest-environment happy-dom
import { act, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { useGlassMotion } from '../../../src/renderer/components/liquidGlass/useGlassMotion';
vi.mock('../../../src/renderer/hooks/useReducedMotionPreference', () => ({
  useReducedMotionPreference: () => false,
}));
function Harness() {
  const button = useRef<HTMLButtonElement>(null);
  const material = useGlassMotion({ controlRef: button, actorRef: button, hoverOnly: true });
  return (
    <div data-glass-host>
      <button ref={button}>
        <div ref={material} />
      </button>
      <span data-neighbor />
    </div>
  );
}
it('keeps a back button still outside hover, follows while hovered or held, and resets on leave and release outside', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const frames = new Map<number, FrameRequestCallback>();
  let sequence = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(++sequence, callback);
    return sequence;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.spyOn(window, 'matchMedia').mockReturnValue({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as unknown as MediaQueryList);
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const flush = () => {
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach((callback) => callback(0));
  };
  try {
    await act(async () => root.render(<Harness />));
    const button = host.querySelector('button')!,
      neighbor = host.querySelector('[data-neighbor]')!;
    Object.defineProperties(button, {
      offsetWidth: { value: 60 },
      offsetHeight: { value: 36 },
      offsetLeft: { value: 40 },
      offsetTop: { value: 20 },
    });
    const event = (type: string, x: number, buttons = 0) =>
      new PointerEvent(type, {
        bubbles: true,
        pointerType: 'mouse',
        clientX: x,
        clientY: 38,
        button: 0,
        buttons,
        isPrimary: true,
      });
    neighbor.dispatchEvent(event('pointermove', 180));
    flush();
    expect(button.style.getPropertyValue('--motion-x')).toBe('0px');
    button.dispatchEvent(event('pointerenter', 95));
    flush();
    expect(Number.parseFloat(button.style.getPropertyValue('--motion-x'))).toBeGreaterThan(0);
    button.dispatchEvent(event('pointerleave', 105));
    flush();
    expect(button.style.getPropertyValue('--motion-x')).toBe('0px');
    button.dispatchEvent(event('pointerdown', 70, 1));
    neighbor.dispatchEvent(event('pointermove', 115, 1));
    flush();
    expect(Number.parseFloat(button.style.getPropertyValue('--motion-x'))).toBeGreaterThan(0);
    expect(button.style.getPropertyValue('--motion-sx')).toBe('0.96');
    window.dispatchEvent(event('pointerup', 115));
    flush();
    expect(button.style.getPropertyValue('--motion-x')).toBe('0px');
    expect(button.style.getPropertyValue('--motion-sx')).toBe('1');
  } finally {
    await act(async () => root.unmount());
    host.remove();
    expect(frames.size).toBe(0);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  }
});
