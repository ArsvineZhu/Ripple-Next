import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { afterEach, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ spawn: vi.fn() }));
vi.mock('node:child_process', () => ({ spawn: mock.spawn }));
import { createNativeRuntime } from '../../../src/main/platform/windows/nativeRuntime';
afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});
function child() {
  return Object.assign(new EventEmitter(), {
    stdin: new PassThrough(),
    stdout: new PassThrough(),
    stderr: new PassThrough(),
    kill: vi.fn(),
  });
}
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};
it('shares one executor, parses fragmented frames, and correlates out-of-order responses', async () => {
  const process = child();
  mock.spawn.mockReturnValue(process);
  const runtime = createNativeRuntime(async () => 'native.exe'),
    events = vi.fn();
  const unsubscribe = runtime.subscribe(events);
  await flush();
  process.stdout.write('{"kind":"rea');
  process.stdout.write('dy"}\n');
  await flush();
  const one = runtime.request('media'),
    two = runtime.request('devices');
  await flush();
  const requests = process.stdin.read().toString().trim().split('\n').map(JSON.parse);
  process.stdout.write(
    JSON.stringify({ kind: 'response', id: requests[1].id, ok: true, value: 'two' }) + '\n',
  );
  process.stdout.write(JSON.stringify({ kind: 'media', value: { sessions: [] } }) + '\n');
  process.stdout.write(
    JSON.stringify({ kind: 'response', id: requests[0].id, ok: true, value: 'one' }) + '\n',
  );
  expect(await one).toBe('one');
  expect(await two).toBe('two');
  expect(mock.spawn).toHaveBeenCalledTimes(1);
  expect(events).toHaveBeenCalledWith({ kind: 'media', value: { sessions: [] } });
  unsubscribe();
  runtime.close();
  expect(process.kill).toHaveBeenCalled();
});
it('rejects pending commands on crash, reconnects listeners, and never replays the command', async () => {
  vi.useFakeTimers();
  const old = child(),
    next = child();
  mock.spawn.mockReturnValueOnce(old).mockReturnValueOnce(next);
  const runtime = createNativeRuntime(async () => 'native.exe'),
    events = vi.fn();
  runtime.subscribe(events);
  await flush();
  old.stdout.write('{"kind":"ready"}\n');
  await flush();
  const operation = runtime.request('control', { command: 'next', source: 'player' });
  const rejected = expect(operation).rejects.toThrow('executor unavailable');
  await flush();
  old.emit('exit', 1);
  await rejected;
  await vi.advanceTimersByTimeAsync(1000);
  next.stdout.write('{"kind":"ready"}\n');
  await flush();
  expect(mock.spawn).toHaveBeenCalledTimes(2);
  expect(next.stdin.read()).toBeNull();
  expect(events).toHaveBeenCalledWith({ kind: 'error', scope: 'runtime', code: -1 });
  runtime.close();
});
