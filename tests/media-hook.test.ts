/** @vitest-environment happy-dom */
import { act, createElement, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { useMedia } from '../src/renderer/hooks/useMedia';
import type { MediaSession, MediaSnapshot } from '../src/shared/media';
vi.mock('../src/renderer/lib/diagnostics', () => ({ recordRendererError: vi.fn() }));
let root: ReturnType<typeof createRoot> | undefined;
let hook: ReturnType<typeof useMedia>;
afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
  Reflect.deleteProperty(window, 'electronAPI');
});
function snapshot(artwork: string): MediaSnapshot {
  const item: MediaSession = {
    id: 'one',
    source: 'one',
    playerName: 'one',
    name: 'Song',
    artist: 'Artist',
    state: 'playing',
    artworkUrl: artwork,
    capabilities: { previous: true, next: true, play: true, pause: true, toggle: true },
  };
  return {
    sessions: [item],
    activeSessionId: 'one',
    manualSessionId: null,
    status: 'ready',

    error: null,
  };
}
async function mount(api: unknown) {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.useFakeTimers();
  Object.defineProperty(window, 'electronAPI', { configurable: true, value: api });
  const element = document.createElement('div');
  document.body.append(element);
  root = createRoot(element);
  function Test() {
    const value = useMedia();
    useEffect(() => {
      hook = value;
    }, [value]);
    return null;
  }
  await act(async () => root!.render(createElement(Test)));
}
it('updates a changed artwork URL and distinguishes failed reading from no session', async () => {
  const read = vi
    .fn()
    .mockResolvedValueOnce(snapshot('first'))
    .mockResolvedValueOnce(snapshot('second'))
    .mockRejectedValueOnce(new Error('read failed'))
    .mockResolvedValueOnce({
      ...snapshot(''),
      sessions: [],
      activeSessionId: null,
      status: 'idle',
    });
  await mount({ getSystemMedia: read });
  expect(hook.mediaTrack?.artworkUrl).toBe('first');
  await act(async () => vi.advanceTimersByTimeAsync(5000));
  expect(hook.mediaTrack?.artworkUrl).toBe('second');
  await act(async () => vi.advanceTimersByTimeAsync(5000));
  expect(hook.mediaSnapshot.error).toBe('mediaReadFailed');
  expect(hook.mediaTrack?.stale).toBe(true);
  await act(async () => vi.advanceTimersByTimeAsync(5000));
  expect(hook.mediaTrack).toBeNull();
  expect(hook.mediaSnapshot.error).toBeNull();
});
it('ignores an old pending poll after manual selection and refreshes control results immediately', async () => {
  let complete: (snapshot: MediaSnapshot) => void = () => {};
  const selected = { ...snapshot('new'), manualSessionId: 'one' };
  const read = vi.fn(
    () =>
      new Promise<MediaSnapshot>((resolve) => {
        complete = resolve;
      }),
  );
  const select = vi.fn().mockResolvedValue({ snapshot: selected, error: null });
  const control = vi.fn().mockResolvedValue({
    snapshot: { ...selected, sessions: [{ ...selected.sessions[0], state: 'paused' }] },
    error: null,
  });
  await mount({ getSystemMedia: read, selectMediaSession: select, controlSystemMedia: control });
  await act(async () => hook.selectMediaSession('one'));
  await act(async () => complete(snapshot('old')));
  expect(hook.mediaTrack?.artworkUrl).toBe('new');
  await act(async () => hook.controlMedia('playpause', 'one'));
  expect(control).toHaveBeenCalledWith('playpause', 'one');
  expect(hook.mediaTrack?.state).toBe('paused');
});
it('serializes selection and retains the latest target while a previous selection is pending', async () => {
  let complete!: (result: { snapshot: MediaSnapshot; error: null }) => void;
  const select = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    )
    .mockResolvedValue({ snapshot: snapshot('automatic'), error: null });
  await mount({
    getSystemMedia: vi.fn().mockResolvedValue(snapshot('old')),
    selectMediaSession: select,
  });
  let operation!: Promise<void>;
  await act(async () => {
    operation = hook.selectMediaSession('one');
  });
  await act(async () => {
    void hook.selectMediaSession('two');
    void hook.selectMediaSession(null);
  });
  expect(select.mock.calls).toEqual([['one']]);
  expect(hook.mediaBusy).toBe(true);
  expect(hook.mediaPageId).toBeNull();
  await act(async () => {
    complete({ snapshot: { ...snapshot('manual'), manualSessionId: 'one' }, error: null });
    await operation;
  });
  expect(select.mock.calls).toEqual([['one'], [null]]);
  expect(hook.mediaPageId).toBeNull();
  expect(hook.mediaBusy).toBe(false);
  expect(hook.mediaTrack?.artworkUrl).toBe('automatic');
});
it('queues selection during a command and restores the confirmed page when selection fails', async () => {
  let complete!: (result: { snapshot: MediaSnapshot; error: null }) => void;
  const select = vi
    .fn()
    .mockResolvedValue({ snapshot: snapshot('current'), error: 'mediaSessionGone' });
  const control = vi.fn(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  await mount({
    getSystemMedia: vi.fn().mockResolvedValue(snapshot('current')),
    selectMediaSession: select,
    controlSystemMedia: control,
  });
  let operation!: Promise<void>;
  await act(async () => {
    operation = hook.controlMedia('playpause', 'one');
  });
  await act(async () => {
    void hook.selectMediaSession('gone');
  });
  expect(hook.mediaPageId).toBe('gone');
  expect(select).not.toHaveBeenCalled();
  await act(async () => {
    complete({ snapshot: snapshot('current'), error: null });
    await operation;
  });
  expect(select).toHaveBeenCalledWith('gone');
  expect(hook.mediaPageId).toBeNull();
  expect(hook.mediaActionError).toBe('mediaSessionGone');
});
