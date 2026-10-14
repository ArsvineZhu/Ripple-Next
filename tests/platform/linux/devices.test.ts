import { beforeEach, expect, it, vi } from 'vitest';
const command = vi.hoisted(() => vi.fn());
vi.mock('../../../src/main/services/processes', () => ({ runCommand: command }));
beforeEach(() => {
  vi.resetModules();
  command.mockReset();
});
const stream = (state = 'running', mediaClass = 'Stream/Input/Audio') => ({
  type: 'PipeWire:Interface:Node',
  info: { state, props: { 'media.class': mediaClass } },
});
it('uses PulseAudio when pactl exists', async () => {
  const devices = await import('../../../src/main/platform/linux/devices');
  command.mockResolvedValueOnce('Source #2\n').mockResolvedValueOnce('');
  await expect(devices.getMicrophoneStatus()).resolves.toBe(true);
  await expect(devices.getMicrophoneStatus()).resolves.toBe(false);
  expect(command.mock.calls).toEqual([
    ['pactl', ['list', 'source-outputs']],
    ['pactl', ['list', 'source-outputs']],
  ]);
});
it('switches to PipeWire when pactl is missing and does not retry the absent command each poll', async () => {
  const devices = await import('../../../src/main/platform/linux/devices');
  command
    .mockRejectedValueOnce(Object.assign(new Error('Missing command'), { code: 'ENOENT' }))
    .mockResolvedValueOnce(JSON.stringify([stream()]))
    .mockResolvedValueOnce(
      JSON.stringify([
        stream('idle'),
        stream('running', 'Stream/Output/Audio'),
        stream('running', 'Audio/Source'),
      ]),
    );
  await expect(devices.getMicrophoneStatus()).resolves.toBe(true);
  await expect(devices.getMicrophoneStatus()).resolves.toBe(false);
  expect(command.mock.calls).toEqual([
    ['pactl', ['list', 'source-outputs']],
    ['pw-dump', ['--no-colors']],
    ['pw-dump', ['--no-colors']],
  ]);
});
it('preserves pactl server and permission failures instead of switching backends or reporting inactivity', async () => {
  const devices = await import('../../../src/main/platform/linux/devices');
  const error = Object.assign(new Error('Connection refused'), { code: 1 });
  command.mockRejectedValueOnce(error);
  await expect(devices.getMicrophoneStatus()).rejects.toBe(error);
  expect(command).toHaveBeenCalledTimes(1);
});
it('propagates a PipeWire failure and retries on the next poll', async () => {
  const devices = await import('../../../src/main/platform/linux/devices');
  const error = new Error('PipeWire unavailable');
  command
    .mockRejectedValueOnce(Object.assign(new Error('Missing command'), { code: 'ENOENT' }))
    .mockRejectedValueOnce(error)
    .mockResolvedValueOnce('[]');
  await expect(devices.getMicrophoneStatus()).rejects.toBe(error);
  await expect(devices.getMicrophoneStatus()).resolves.toBe(false);
});
it.each(['not JSON', '{}', '[{"type":"PipeWire:Interface:Node","info":{"props":false}}]'])(
  'rejects malformed PipeWire output %s',
  async (output) => {
    const devices = await import('../../../src/main/platform/linux/devices');
    command
      .mockRejectedValueOnce(Object.assign(new Error('Missing command'), { code: 'ENOENT' }))
      .mockResolvedValueOnce(output);
    await expect(devices.getMicrophoneStatus()).rejects.toThrow();
  },
);
