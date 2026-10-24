import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
const command = vi.hoisted(() => vi.fn());
const artwork = vi.hoisted(() => vi.fn());
vi.mock('../../../src/main/platform/macos/musicArtwork', () => ({ readMusicArtwork: artwork }));
vi.mock('../../../src/main/services/processes', () => ({ runCommand: command }));
import {
  close,
  subscribe,
  getMediaSessions,
  controlSystemMedia,
  openMediaSession,
} from '../../../src/main/platform/macos/media';
import type { MediaSession } from '../../../src/shared/media';
beforeEach(() => {
  command.mockReset();
  artwork.mockReset().mockResolvedValue(null);
});
afterEach(() => {
  close();
  vi.useRealTimers();
});
it('opens only the selected running application, without launching an absent player', async () => {
  command.mockResolvedValueOnce('Spotify\nMusic\n').mockResolvedValueOnce('');
  await openMediaSession({ id: 'Music' } as MediaSession);
  expect(command).toHaveBeenLastCalledWith('/usr/bin/open', ['-a', 'Music']);
  command.mockResolvedValueOnce('Music\n');
  await expect(openMediaSession({ id: 'Spotify' } as MediaSession)).rejects.toThrow('unavailable');
});
const info = (state: string) =>
  JSON.stringify({ name: 'Song || "quoted"', artist: 'Artist', album: '', artwork: '', state });
it('avoids Automation queries without supported players', async () => {
  command.mockResolvedValueOnce('/System/Applications/Notes.app/Contents/MacOS/Notes\n');
  await expect(getMediaSessions()).resolves.toEqual({ sessions: [], failedIds: [], errors: [] });
  expect(command).toHaveBeenCalledTimes(1);
});
it('reads both running players and isolates a failed dictionary response', async () => {
  command
    .mockResolvedValueOnce('Spotify\nMusic\n')
    .mockRejectedValueOnce(new Error('denied'))
    .mockResolvedValueOnce(info('playing'));
  const result = await getMediaSessions();
  expect(result.failedIds).toEqual(['Spotify']);
  expect(result.sessions[0]).toMatchObject({
    id: 'Music',
    state: 'playing',
    name: 'Song || "quoted"',
  });
  expect(command.mock.calls[1][1][1]).not.toContain('tell application "Music"');
  expect(command.mock.calls[2][1][1]).not.toContain('tell application "Spotify"');
});
it('retains stopped state and controls exactly the requested running player', async () => {
  command.mockResolvedValueOnce('Music\n').mockResolvedValueOnce(info('stopped'));
  const result = await getMediaSessions();
  expect(result.sessions[0].state).toBe('stopped');
  command.mockResolvedValueOnce('Spotify\nMusic\n').mockResolvedValueOnce('');
  await controlSystemMedia('playpause', result.sessions[0]);
  expect(command).toHaveBeenLastCalledWith('/usr/bin/osascript', [
    '-e',
    'tell application "Music" to playpause',
  ]);
});
it.runIf(process.platform === 'darwin').each(['Spotify', 'Music'])(
  'serializes %s metadata with the native AppleScript runtime',
  async (player) => {
    command.mockResolvedValueOnce(`${player}\n`).mockResolvedValueOnce(info('playing'));
    await getMediaSessions();
    const script = String(command.mock.calls[1][1][1]);
    // Supply metadata without contacting a real player or requesting Automation permission.
    // Keep the generated Foundation serialization intact so native syntax errors fail here.
    const playerBlock = /tell application "[^"]+"\n[\s\S]*?\nend tell/;
    expect(script).toMatch(playerBlock);
    const isolated = script.replace(
      playerBlock,
      String.raw`set songName to "Song \"quoted\" — 音乐"
set artistName to "Artist"
set albumName to ""
set artUrl to "https://example.com/cover.jpg"
set mediaState to "playing"
set songId to "fixture-id"`,
    );
    const output = execFileSync('/usr/bin/osascript', ['-e', isolated], {
      encoding: 'utf8',
      timeout: 10_000,
    });
    expect(JSON.parse(output)).toEqual({
      name: 'Song "quoted" — 音乐',
      artist: 'Artist',
      album: '',
      artwork: 'https://example.com/cover.jpg',
      state: 'playing',
      trackId: 'fixture-id',
    });
  },
);
it('propagates backend discovery failure and refuses an exited control target', async () => {
  const failure = new Error('missing');
  command.mockRejectedValueOnce(failure);
  await expect(getMediaSessions()).rejects.toBe(failure);
  command.mockResolvedValueOnce('Music\n');
  await expect(controlSystemMedia('playpause', { id: 'Spotify' } as MediaSession)).rejects.toThrow(
    'unavailable',
  );
});
it('publishes metadata before artwork, caches the cover, and rejects obsolete A/B/A completions', async () => {
  let name = 'A';
  command.mockImplementation(async (executable) =>
    executable === '/bin/ps'
      ? 'Music\n'
      : JSON.stringify({ name, artist: 'Artist', album: 'Album', artwork: '', state: 'playing' }),
  );
  const finish: ((url: string) => void)[] = [];
  artwork.mockImplementation(() => new Promise<string>((resolve) => finish.push(resolve)));
  const changed = vi.fn();
  const unsubscribe = subscribe(changed);
  expect((await getMediaSessions()).sessions[0]).toMatchObject({ name: 'A', artworkUrl: null });
  await getMediaSessions();
  expect(artwork).toHaveBeenCalledTimes(1);
  name = 'B';
  await getMediaSessions();
  expect(artwork.mock.calls[0][1].aborted).toBe(true);
  name = 'A';
  await getMediaSessions();
  finish[0]('old-A');
  finish[1]('old-B');
  await Promise.resolve();
  expect((await getMediaSessions()).sessions[0].artworkUrl).toBeNull();
  expect(changed).not.toHaveBeenCalled();
  finish[2]('data:image/png;base64,current');
  await vi.waitFor(() => expect(changed).toHaveBeenCalledOnce());
  expect((await getMediaSessions()).sessions[0].artworkUrl).toBe('data:image/png;base64,current');
  expect(artwork).toHaveBeenCalledTimes(3);
  unsubscribe();
});
it('keeps artwork failures local, retries missing covers, and stops polling/cover work on close', async () => {
  vi.useFakeTimers();
  command.mockImplementation(async (executable) =>
    executable === '/bin/ps' ? 'Music\n' : info('playing'),
  );
  artwork.mockRejectedValue(new Error('no artwork'));
  const changed = vi.fn();
  subscribe(changed);
  const first = await getMediaSessions();
  expect(first.failedIds).toEqual([]);
  expect(first.sessions[0].name).toBe('Song || "quoted"');
  await getMediaSessions();
  expect(artwork).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(30_001);
  expect(changed).toHaveBeenCalledTimes(6);
  await getMediaSessions();
  expect(artwork).toHaveBeenCalledTimes(2);
  close();
  expect(artwork.mock.calls[1][1].aborted).toBe(true);
  await vi.advanceTimersByTimeAsync(10_000);
  expect(changed).toHaveBeenCalledTimes(6);
});
