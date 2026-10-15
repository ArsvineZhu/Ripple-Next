import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { afterEach, expect, it, vi } from 'vitest';
import { createNativeStream } from '../../../src/main/platform/linux/nativeStream';
const launch = vi.hoisted(() => vi.fn());
vi.mock('node:child_process', () => ({ spawn: launch }));
afterEach(() => {
  vi.useRealTimers();
  launch.mockReset();
});
it('restarts failed native streams and cancels retry and stale process callbacks on closure', async () => {
  vi.useFakeTimers();
  const children: (EventEmitter & { stdout: PassThrough; kill: ReturnType<typeof vi.fn> })[] = [];
  launch.mockImplementation(() => {
    const child = Object.assign(new EventEmitter(), { stdout: new PassThrough(), kill: vi.fn() });
    children.push(child);
    return child;
  });
  const consume = vi.fn(() => true),
    failed = vi.fn(),
    reset = vi.fn();
  const stream = createNativeStream(
    () => ({ executable: 'native', args: [] }),
    consume,
    reset,
    failed,
  );
  stream.start();
  stream.start();
  expect(launch).toHaveBeenCalledTimes(1);
  children[0].stdout.write('ready');
  await vi.advanceTimersByTimeAsync(10_000);
  expect(launch).toHaveBeenCalledTimes(1);
  children[0].emit('exit', 1);
  expect(failed).toHaveBeenCalledOnce();
  await vi.advanceTimersByTimeAsync(1000);
  expect(launch).toHaveBeenCalledTimes(2);
  stream.close();
  stream.start();
  children[1].emit('exit', 0);
  children[2].stdout.write('ready');
  await vi.advanceTimersByTimeAsync(10_000);
  expect(launch).toHaveBeenCalledTimes(3);
  stream.close();
  await vi.advanceTimersByTimeAsync(60_000);
  expect(launch).toHaveBeenCalledTimes(3);
  expect(reset).toHaveBeenCalledTimes(3);
});
