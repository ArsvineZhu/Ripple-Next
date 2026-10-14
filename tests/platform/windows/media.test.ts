import { beforeEach, expect, it, vi } from 'vitest';
const native = vi.hoisted(() => ({ run: vi.fn(), open: vi.fn() }));
vi.mock('../../../src/main/platform/windows/powershell', () => ({
  runPowerShell: native.run,
  powerShellLiteral: (value: string) => "'" + value.replace(/'/g, "''") + "'",
}));
vi.mock('../../../src/main/platform/windows/nativeRuntime', () => ({
  windowsRuntime: { request: native.open },
}));
const item = (source: string, id = source, path: string | null = null) => ({
  Id: id,
  Source: source,
  ApplicationPath: path,
  Title: 'Song',
  Artist: '',
  Album: '',
  Artwork: null,
  Current: true,
  Status: 'playing',
  Previous: true,
  Next: true,
  Play: true,
  Pause: true,
  Toggle: true,
});
beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
});

it('activates a registered custom AUMID through the warm executor, caches its name, and skips metadata reads on open', async () => {
  const { getMediaSessions, openMediaSession, controlSystemMedia } =
    await import('../../../src/main/platform/windows/media');
  native.open.mockResolvedValue({
    Sessions: [item('top.izuna.foliamajor')],
    FailedIds: [],
    Errors: [],
  });
  native.run.mockResolvedValue(JSON.stringify([{ AppID: 'top.izuna.foliamajor', Name: 'Folia' }]));
  const result = await getMediaSessions();
  expect(result.sessions[0].playerName).toBe('Folia');
  await openMediaSession(result.sessions[0]);
  expect(native.open).toHaveBeenLastCalledWith('open', {
    target: 'shell:AppsFolder\\top.izuna.foliamajor',
  });
  await controlSystemMedia('next', result.sessions[0]);
  expect(native.open).toHaveBeenLastCalledWith('control', {
    source: 'top.izuna.foliamajor',
    command: 'next',
  });
  expect((await getMediaSessions()).sessions[0].playerName).toBe('Folia');
  expect(native.run).toHaveBeenCalledTimes(1);
});
it('refuses unregistered and duplicate identities and discards activation paths for removed sessions', async () => {
  const { getMediaSessions, openMediaSession } =
    await import('../../../src/main/platform/windows/media');
  native.open.mockResolvedValueOnce({
    Sessions: [item('unknown.custom'), item('player.exe', 'player.exe#1', 'C:\\player.exe')],
    FailedIds: [],
    Errors: [],
  });
  native.run.mockResolvedValue('[]');
  for (const session of (await getMediaSessions()).sessions)
    await expect(openMediaSession(session)).rejects.toThrow('unavailable or ambiguous');
  native.open.mockResolvedValueOnce({
    Sessions: [item('player.exe', 'player.exe', 'C:\\player.exe')],
    FailedIds: [],
    Errors: [],
  });
  const desktop = (await getMediaSessions()).sessions[0];
  await openMediaSession(desktop);
  expect(native.open).toHaveBeenLastCalledWith('open', { target: 'C:\\player.exe' });
  native.open.mockResolvedValueOnce({ Sessions: [], FailedIds: [], Errors: [] });
  await getMediaSessions();
  await expect(openMediaSession(desktop)).rejects.toThrow('unavailable or ambiguous');
});
it('keeps playback metadata usable when native app identity discovery fails', async () => {
  const { getMediaSessions } = await import('../../../src/main/platform/windows/media');
  native.open.mockResolvedValueOnce({ Sessions: [item('custom')], FailedIds: [], Errors: [] });
  native.run.mockRejectedValueOnce(new Error('lookup failed'));
  const result = await getMediaSessions();
  expect(result.sessions).toHaveLength(1);
  expect(result.failedIds).toEqual([]);
  expect(result.errors).toHaveLength(1);
});
