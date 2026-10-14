import { beforeEach, expect, it, vi } from 'vitest';
const command = vi.hoisted(() => vi.fn());
vi.mock('../src/main/services/processes', () => ({ runCommand: command }));
import {
  getMediaSessions,
  controlSystemMedia,
  openMediaSession,
} from '../src/main/platform/macos/media';
import type { MediaSession } from '../src/shared/media';
beforeEach(() => command.mockReset());
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
it('propagates backend discovery failure and refuses an exited control target', async () => {
  const failure = new Error('missing');
  command.mockRejectedValueOnce(failure);
  await expect(getMediaSessions()).rejects.toBe(failure);
  command.mockResolvedValueOnce('Music\n');
  await expect(controlSystemMedia('playpause', { id: 'Spotify' } as MediaSession)).rejects.toThrow(
    'unavailable',
  );
});
