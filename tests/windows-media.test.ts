import { beforeEach, expect, it, vi } from 'vitest';
const native = vi.hoisted(() => ({ run: vi.fn(), open: vi.fn() }));
vi.mock('../src/main/platform/windows/powershell', () => ({
  runPowerShell: native.run,
  winrtAsync: '',
  powerShellLiteral: (value: string) => "'" + value.replace(/'/g, "''") + "'",
}));
vi.mock('../src/main/platform/windows/mediaArtwork', () => ({
  mediaArtworkBridge: async () => '',
}));
vi.mock('electron', () => ({ shell: { openPath: native.open } }));
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

it('activates a registered custom desktop AUMID, caches its name, and never re-reads media on open', async () => {
  const { getMediaSessions, openMediaSession } = await import('../src/main/platform/windows/media');
  native.run
    .mockResolvedValueOnce(
      JSON.stringify({ Sessions: [item('top.izuna.foliamajor')], FailedIds: [], Errors: [] }),
    )
    .mockResolvedValueOnce(JSON.stringify([{ AppID: 'top.izuna.foliamajor', Name: 'Folia' }]));
  const result = await getMediaSessions();
  expect(result.sessions[0].playerName).toBe('Folia');
  native.run.mockResolvedValueOnce('');
  await openMediaSession(result.sessions[0]);
  expect(native.run).toHaveBeenLastCalledWith(
    "Start-Process -FilePath 'shell:AppsFolder\\top.izuna.foliamajor'",
  );
  native.run.mockResolvedValueOnce(
    JSON.stringify({ Sessions: [item('top.izuna.foliamajor')], FailedIds: [], Errors: [] }),
  );
  expect((await getMediaSessions()).sessions[0].playerName).toBe('Folia');
  expect(native.run).toHaveBeenCalledTimes(4);
  expect(native.open).not.toHaveBeenCalled();
});
it('refuses unregistered and duplicate identities and discards activation paths for removed sessions', async () => {
  const { getMediaSessions, openMediaSession } = await import('../src/main/platform/windows/media');
  native.run
    .mockResolvedValueOnce(
      JSON.stringify({
        Sessions: [item('unknown.custom'), item('player.exe', 'player.exe#1', 'C:\\player.exe')],
        FailedIds: [],
        Errors: [],
      }),
    )
    .mockResolvedValueOnce('[]');
  const result = await getMediaSessions();
  for (const session of result.sessions)
    await expect(openMediaSession(session)).rejects.toThrow('unavailable or ambiguous');
  native.run.mockResolvedValueOnce(
    JSON.stringify({
      Sessions: [item('player.exe', 'player.exe', 'C:\\player.exe')],
      FailedIds: [],
      Errors: [],
    }),
  );
  const desktop = (await getMediaSessions()).sessions[0];
  native.open.mockResolvedValueOnce('');
  await openMediaSession(desktop);
  expect(native.open).toHaveBeenCalledWith('C:\\player.exe');
  native.run.mockResolvedValueOnce(JSON.stringify({ Sessions: [], FailedIds: [], Errors: [] }));
  await getMediaSessions();
  await expect(openMediaSession(desktop)).rejects.toThrow('unavailable or ambiguous');
});
it('keeps playback metadata usable when native app identity discovery fails', async () => {
  const { getMediaSessions } = await import('../src/main/platform/windows/media');
  native.run
    .mockResolvedValueOnce(
      JSON.stringify({ Sessions: [item('custom')], FailedIds: [], Errors: [] }),
    )
    .mockRejectedValueOnce(new Error('lookup failed'));
  const result = await getMediaSessions();
  expect(result.sessions).toHaveLength(1);
  expect(result.failedIds).toEqual([]);
  expect(result.errors).toHaveLength(1);
});
