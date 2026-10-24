import { EventEmitter } from 'node:events';
import { expect, it, vi } from 'vitest';
import { installScrollGestureBridge } from '../../../src/main/services/scrollGestures';

it('forwards fresh gesture boundaries only and removes its listener once', () => {
  const contents = Object.assign(new EventEmitter(), { isDestroyed: () => false, send: vi.fn() });
  const close = installScrollGestureBridge(contents);
  contents.emit('input-event', {}, { type: 'mouseWheel', deltaX: 100 });
  contents.emit('input-event', {}, { type: 'keyDown', key: 'private' });
  expect(contents.send).not.toHaveBeenCalled();
  contents.emit('input-event', {}, { type: 'gestureScrollBegin', other: 'excluded' });
  expect(contents.send).toHaveBeenCalledWith('scroll-gesture-start', { at: expect.any(Number) });
  contents.emit('destroyed');
  close();
  expect(contents.listenerCount('input-event')).toBe(0);
  contents.emit('input-event', {}, { type: 'gestureFlingCancel' });
  expect(contents.send).toHaveBeenCalledTimes(1);
});
it('uses ScrollBegin once and does not mistake FlingCancel for another physical gesture', () => {
  vi.useFakeTimers();
  const contents = Object.assign(new EventEmitter(), { isDestroyed: () => false, send: vi.fn() });
  const close = installScrollGestureBridge(contents);
  contents.emit('input-event', {}, { type: 'gestureScrollBegin' });
  expect(contents.send).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(100);
  contents.emit('input-event', {}, { type: 'gestureFlingCancel' });
  vi.advanceTimersByTime(16);
  contents.emit('input-event', {}, { type: 'gestureScrollBegin' });
  expect(contents.send).toHaveBeenCalledTimes(2);
  vi.advanceTimersByTime(16);
  contents.emit('input-event', {}, { type: 'gestureScrollBegin' });
  expect(contents.send).toHaveBeenCalledTimes(3);
  vi.advanceTimersByTime(16);
  contents.emit('input-event', {}, { type: 'gestureFlingCancel' });
  expect(contents.send).toHaveBeenCalledTimes(3);
  close();
  vi.useRealTimers();
});

it('forwards release/fling boundaries without interpreting wheel magnitudes', () => {
  const contents = Object.assign(new EventEmitter(), { isDestroyed: () => false, send: vi.fn() });
  const close = installScrollGestureBridge(contents);
  contents.emit('input-event', {}, { type: 'gestureScrollEnd' });
  contents.emit('input-event', {}, { type: 'gestureFlingStart' });
  expect(contents.send).toHaveBeenNthCalledWith(1, 'scroll-gesture-end', {
    at: expect.any(Number),
  });
  expect(contents.send).toHaveBeenNthCalledWith(2, 'scroll-gesture-end', {
    at: expect.any(Number),
  });
  close();
});
