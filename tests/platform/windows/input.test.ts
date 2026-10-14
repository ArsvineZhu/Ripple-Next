import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const cursor = vi.hoisted(() => ({ x: 112, y: 72 }));
vi.mock('electron', () => ({ screen: { getCursorScreenPoint: () => cursor } }));
import { createWindowsInputRegion } from '../../../src/main/platform/windows/inputRegion';

beforeEach(() => {
  vi.useFakeTimers();
  cursor.x = 112;
  cursor.y = 72;
});
afterEach(() => vi.useRealTimers());
function makeWindow() {
  return Object.assign(new EventEmitter(), {
    webContents: new EventEmitter(),
    isDestroyed: (): boolean => false,
    isVisible: () => true,
    getBounds: () => ({ x: -400, y: 0, width: 800, height: 600 }),
    setIgnoreMouseEvents: vi.fn(),
  });
}
it('restores native input inside the Island without waiting for forwarded renderer hover', () => {
  const window = makeWindow();
  const region = createWindowsInputRegion(window, { record: vi.fn() });
  region.apply({ x: 500, y: 50, width: 170, height: 40, scaleFactor: 1.5 });
  expect(window.setIgnoreMouseEvents).toHaveBeenLastCalledWith(false, { forward: true });
  cursor.x = 400;
  vi.advanceTimersByTime(32);
  expect(window.setIgnoreMouseEvents).toHaveBeenLastCalledWith(true, { forward: true });
  cursor.x = 115;
  vi.advanceTimersByTime(32);
  expect(window.setIgnoreMouseEvents).toHaveBeenLastCalledWith(false, { forward: true });
  region.close();
});
it('keeps an active drag captured until mouse-up and cleans up its polling', () => {
  const window = makeWindow();
  const region = createWindowsInputRegion(window, { record: vi.fn() });
  region.apply({ x: 500, y: 50, width: 170, height: 40, scaleFactor: 1.5 });
  window.webContents.emit('input-event', {}, { type: 'mouseDown' });
  cursor.x = 400;
  vi.advanceTimersByTime(32);
  expect(window.setIgnoreMouseEvents).toHaveBeenLastCalledWith(false, { forward: true });
  window.webContents.emit('input-event', {}, { type: 'mouseUp' });
  expect(window.setIgnoreMouseEvents).toHaveBeenLastCalledWith(true, { forward: true });
  region.close();
  window.setIgnoreMouseEvents.mockClear();
  vi.advanceTimersByTime(100);
  expect(window.setIgnoreMouseEvents).not.toHaveBeenCalled();
});

it.each(['window-close', 'app-quit'])(
  'cleans up %s without accessing a destroyed BrowserWindow',
  (path) => {
    const window = makeWindow();
    const webContents = window.webContents;
    const removeListener = vi.spyOn(webContents, 'removeListener');
    let destroyed = false;
    Object.defineProperty(window, 'webContents', {
      get() {
        if (destroyed) throw new TypeError('Object has been destroyed');
        return webContents;
      },
    });
    window.isDestroyed = () => destroyed;
    const region = createWindowsInputRegion(window, { record: vi.fn() });
    region.apply({ x: 500, y: 50, width: 170, height: 40, scaleFactor: 1.5 });
    if (path === 'app-quit') region.close();
    destroyed = true;
    expect(() => window.emit('closed')).not.toThrow();
    expect(() => region.close()).not.toThrow();
    expect(webContents.listenerCount('input-event')).toBe(0);
    expect(removeListener).toHaveBeenCalledTimes(1);
    window.setIgnoreMouseEvents.mockClear();
    vi.advanceTimersByTime(100);
    expect(window.setIgnoreMouseEvents).not.toHaveBeenCalled();
  },
);
