import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const command = vi.hoisted(() => vi.fn());
vi.mock('../../../src/main/services/processes', () => ({ runCommand: command }));

beforeEach(() => {
  vi.resetModules();
  command.mockReset();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

it('shares a pending capture snapshot and refreshes it on the next poll', async () => {
  const devices = await import('../../../src/main/platform/macos/devices');
  let finish!: (value: string) => void;
  command.mockReturnValueOnce(
    new Promise<string>((resolve) => {
      finish = resolve;
    }),
  );
  const camera = devices.getCameraStatus();
  await vi.advanceTimersByTimeAsync(2000);
  const microphone = devices.getMicrophoneStatus();
  expect(command).toHaveBeenCalledTimes(1);
  finish('"FrontCameraActive" = Yes\n"IOAudioStreamActive" = Yes');
  await expect(camera).resolves.toBe(true);
  await expect(microphone).resolves.toBe(true);
  await expect(devices.getCameraStatus()).resolves.toBe(true);
  expect(command).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(5000);
  command.mockResolvedValueOnce('"FrontCameraActive" = No\n"IOAudioStreamActive" = No');
  await expect(devices.getCameraStatus()).resolves.toBe(false);
  await expect(devices.getMicrophoneStatus()).resolves.toBe(false);
  expect(command).toHaveBeenCalledTimes(2);
});

it('propagates a failed registry read and allows the next check to retry', async () => {
  const devices = await import('../../../src/main/platform/macos/devices');
  const denied = Object.assign(new Error('denied'), { code: 'EACCES' });
  command.mockRejectedValueOnce(denied).mockResolvedValueOnce('"IOAudioStreamActive" = Yes');
  await expect(devices.getCameraStatus()).rejects.toBe(denied);
  await expect(devices.getMicrophoneStatus()).resolves.toBe(true);
  expect(command).toHaveBeenCalledTimes(2);
});
