import { expect, it, vi } from 'vitest';
import { createMediaService } from '../../../src/main/services/media';
import type { MediaSession } from '../../../src/shared/media';
import { mediaCommandSupported } from '../../../src/shared/media';
it('owns one fallback sampler for multiple renderers and stops it on closure', async () => {
  vi.useFakeTimers();
  const x = setup([session('one', 'playing')]);
  try {
    x.media.start();
    x.media.start();
    await x.media.getSnapshot();
    expect(x.backend.getMediaSessions).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(5000);
    expect(x.backend.getMediaSessions).toHaveBeenCalledTimes(2);
    x.media.close();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(x.backend.getMediaSessions).toHaveBeenCalledTimes(2);
  } finally {
    x.media.close();
    vi.useRealTimers();
  }
});
it('broadcasts native changes and manual selection to every consumer and removes its native subscription', async () => {
  let notify!: () => void;
  let items = [session('one', 'playing'), session('two', 'paused')];
  const stop = vi.fn();
  const media = createMediaService({
    getMediaSessions: async () => ({ sessions: items, failedIds: [] }),
    controlSystemMedia: async () => {},
    openMediaSession: async () => {},
    subscribe: (callback) => {
      notify = callback;
      return stop;
    },
  });
  const island = vi.fn(),
    settings = vi.fn();
  media.subscribe(island);
  media.subscribe(settings);
  await media.getSnapshot();
  media.selectSession('two');
  expect(island).toHaveBeenLastCalledWith(expect.objectContaining({ manualSessionId: 'two' }));
  expect(settings).toHaveBeenLastCalledWith(expect.objectContaining({ manualSessionId: 'two' }));
  items = [{ ...items[1], name: 'new track' }];
  notify();
  await media.getSnapshot();
  expect(island).toHaveBeenLastCalledWith(
    expect.objectContaining({ sessions: [expect.objectContaining({ name: 'new track' })] }),
  );
  media.close();
  expect(stop).toHaveBeenCalledOnce();
});
const session = (id: string, state: MediaSession['state']): MediaSession => ({
  id,
  playerName: id,
  source: id,
  name: 'Song',
  artist: 'Artist',
  state,
  capabilities: { previous: true, next: true, play: true, pause: true, toggle: true },
});
function setup(initial: MediaSession[]) {
  let sessions = initial;
  const backend = {
    getMediaSessions: vi.fn(async () => ({ sessions, failedIds: [] as string[] })),
    controlSystemMedia: vi.fn(async () => {}),
    openMediaSession: vi.fn(async () => {}),
    close: vi.fn(),
  };
  const report = vi.fn();
  return {
    backend,
    report,
    media: createMediaService(backend, report),
    set: (value: MediaSession[]) => {
      sessions = value;
    },
  };
}
it('prefers actual playback, stays stable among playing sessions, and keeps manual selection', async () => {
  const x = setup([session('Spotify', 'paused'), session('Music', 'playing')]);
  expect((await x.media.getSnapshot()).activeSessionId).toBe('Music');
  x.set([session('Spotify', 'playing'), session('Music', 'playing')]);
  expect((await x.media.getSnapshot()).activeSessionId).toBe('Music');
  await x.media.selectSession('Spotify');
  x.set([session('Spotify', 'paused'), session('Music', 'playing')]);
  expect((await x.media.getSnapshot()).activeSessionId).toBe('Spotify');
  await x.media.selectSession(null);
  expect((await x.media.getSnapshot()).activeSessionId).toBe('Music');
});
it('controls the displayed player even if another starts playing between polls', async () => {
  const spotify = session('Spotify', 'paused');
  const x = setup([spotify]);
  await x.media.getSnapshot();
  x.set([spotify, session('Music', 'playing')]);
  await x.media.control('playpause', 'Spotify');
  expect(x.backend.controlSystemMedia).toHaveBeenCalledWith('playpause', spotify);
});
it('does not redirect a command when its target exits, and clears the old manual selection', async () => {
  const x = setup([session('one', 'playing'), session('two', 'paused')]);
  await x.media.getSnapshot();
  await x.media.selectSession('one');
  x.set([session('two', 'paused')]);
  x.backend.controlSystemMedia.mockRejectedValueOnce(new Error('target exited'));
  const result = await x.media.control('next', 'one');
  expect(result.error).toBe('mediaCommandFailed');
  expect(result.snapshot.manualSessionId).toBeNull();
  expect(x.backend.controlSystemMedia).toHaveBeenCalledWith('next', session('one', 'playing'));
});
it('honors false capabilities, permits unknown capabilities, and refreshes after rejection', async () => {
  const item = session('one', 'playing');
  item.capabilities.next = false;
  expect(
    mediaCommandSupported(
      { ...item, capabilities: { ...item.capabilities, previous: null } },
      'previous',
    ),
  ).toBe(true);
  const x = setup([item]);
  await x.media.getSnapshot();
  expect((await x.media.control('next', 'one')).error).toBe('mediaCommandUnsupported');
  expect(x.backend.controlSystemMedia).not.toHaveBeenCalled();
  x.backend.controlSystemMedia.mockRejectedValueOnce(new Error('declined'));
  expect((await x.media.control('previous', 'one')).error).toBe('mediaCommandFailed');
  expect(x.report).toHaveBeenCalledTimes(1);
});
it('retains stale metadata on failure, disables it, and recovers without dropping the session', async () => {
  const x = setup([session('one', 'playing')]);
  await x.media.getSnapshot();
  x.backend.getMediaSessions.mockRejectedValueOnce(new Error('denied'));
  const failed = await x.media.getSnapshot();
  expect(failed.status).toBe('error');
  expect(failed.sessions[0].name).toBe('Song');
  expect(mediaCommandSupported(failed.sessions[0], 'playpause')).toBe(false);
  expect((await x.media.getSnapshot()).error).toBeNull();
});
it('isolates a failed player and coalesces simultaneous reads', async () => {
  const x = setup([session('one', 'playing'), session('two', 'paused')]);
  await x.media.getSnapshot();
  await x.media.selectSession('one');
  x.backend.getMediaSessions.mockResolvedValueOnce({
    sessions: [session('two', 'playing')],
    failedIds: ['one'],
  });
  const first = x.media.getSnapshot(),
    second = x.media.getSnapshot();
  expect(first).toBe(second);
  const value = await first;
  expect(value.sessions.find((s) => s.id === 'one')?.stale).toBe(true);
  expect(value.activeSessionId).toBe('one');
  expect(value.status).toBe('error');
  x.backend.getMediaSessions.mockResolvedValueOnce({
    sessions: [session('two', 'playing')],
    failedIds: ['one'],
  });
  const selected = await x.media.selectSession('two');
  expect(selected.snapshot.status).toBe('ready');
  expect(selected.snapshot.error).toBeNull();
});
it('serializes commands and reads and releases the backend on shutdown', async () => {
  const x = setup([session('one', 'playing')]);
  await x.media.getSnapshot();
  let finish: () => void = () => {};
  x.backend.controlSystemMedia.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const operation = x.media.control('next', 'one');
  await vi.waitFor(() => expect(x.backend.controlSystemMedia).toHaveBeenCalledTimes(1));
  const query = x.media.getSnapshot();
  expect(x.backend.getMediaSessions).toHaveBeenCalledTimes(1);
  finish();
  await Promise.all([operation, query]);
  x.media.close();
  expect(x.backend.close).toHaveBeenCalledTimes(1);
});
it('opens the selected session, never a replacement, and owns activation errors', async () => {
  const one = session('one', 'playing');
  const x = setup([one, session('two', 'paused')]);
  await x.media.getSnapshot();
  expect((await x.media.openSession('one')).error).toBeNull();
  expect(x.backend.openMediaSession).toHaveBeenCalledWith(one);
  x.backend.openMediaSession.mockRejectedValueOnce(new Error('activation denied'));
  expect((await x.media.openSession('two')).error).toBe('mediaOpenFailed');
  x.set([session('two', 'playing')]);
  await x.media.getSnapshot();
  expect((await x.media.openSession('one')).error).toBe('mediaSessionGone');
  expect(x.backend.openMediaSession).toHaveBeenCalledTimes(2);
});
it('opens from the last good snapshot immediately while a poll is still pending', async () => {
  const x = setup([session('one', 'playing')]);
  await x.media.getSnapshot();
  let finish: (value: { sessions: MediaSession[]; failedIds: string[] }) => void = () => {};
  x.backend.getMediaSessions.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const read = x.media.getSnapshot();
  await vi.waitFor(() => expect(x.backend.getMediaSessions).toHaveBeenCalledTimes(2));
  expect((await x.media.openSession('one')).error).toBeNull();
  expect(x.backend.openMediaSession).toHaveBeenCalledTimes(1);
  finish({ sessions: [], failedIds: [] });
  await read;
});

it('keeps an event backend idle until a native notification arrives', async () => {
  vi.useFakeTimers();
  let changed!: () => void;
  const query = vi.fn(async () => ({ sessions: [session('one', 'playing')], failedIds: [] }));
  const media = createMediaService({
    getMediaSessions: query,
    controlSystemMedia: async () => {},
    openMediaSession: async () => {},
    subscribe: (listener) => {
      changed = listener;
      return () => {};
    },
  });
  try {
    media.start();
    await media.getSnapshot();
    await vi.advanceTimersByTimeAsync(90_000);
    expect(query).toHaveBeenCalledTimes(1);
    changed();
    await media.getSnapshot();
    expect(query).toHaveBeenCalledTimes(2);
  } finally {
    media.close();
    vi.useRealTimers();
  }
});
