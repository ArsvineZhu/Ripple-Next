// @vitest-environment happy-dom
import { act, createElement, useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
const scheduled = vi.hoisted(() => new Set<() => void>());
vi.mock('motion/react', () => ({
  frame: { postRender: (callback: () => void) => scheduled.add(callback) },
  cancelFrame: (callback: () => void) => scheduled.delete(callback),
}));
import { useWindowInput } from '../../../src/renderer/hooks/useWindowInput';
afterEach(() => {
  scheduled.clear();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(window, 'electronAPI');
});
it('coalesces frame measurements, preserves geometry exits and input shaping, and cancels on unmount', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const shape = vi.fn();
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: { platform: 'linux', setWindowInputShape: shape },
  });
  let input: ReturnType<typeof useWindowInput>;
  const exit = vi.fn();
  function Harness() {
    const current = useWindowInput(exit);
    useLayoutEffect(() => {
      input = current;
    });
    return createElement('div', { ref: current.islandElementRef });
  }
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(createElement(Harness)));
  shape.mockClear();
  const measure = vi.spyOn(host.firstElementChild!, 'getBoundingClientRect');
  let bounds = new DOMRect(10, 10, 300, 100);
  measure.mockImplementation(() => bounds);
  const flush = () => {
    const callbacks = [...scheduled];
    scheduled.clear();
    callbacks.forEach((callback) => callback());
  };
  input!.syncWindowInputRegion();
  input!.syncWindowInputRegion();
  input!.syncWindowInputRegion();
  expect(measure).not.toHaveBeenCalled();
  flush();
  expect(measure).toHaveBeenCalledOnce();
  expect(shape).toHaveBeenCalledOnce();
  input!.trackPointerPosition({ clientX: 250, clientY: 50 });
  bounds = new DOMRect(10, 10, 100, 100);
  input!.syncWindowInputRegion();
  flush();
  expect(exit).toHaveBeenCalledOnce();
  expect(shape).toHaveBeenCalledTimes(2);
  input!.syncWindowInputRegion();
  flush();
  expect(shape).toHaveBeenCalledTimes(2);
  input!.syncWindowInputRegion();
  await act(async () => root.unmount());
  expect(scheduled.size).toBe(0);
  host.remove();
});
