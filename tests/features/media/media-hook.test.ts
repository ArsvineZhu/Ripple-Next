/** @vitest-environment happy-dom */
import { act, createElement, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { useMedia } from '../../../src/renderer/hooks/useMedia';
import type { MediaSession, MediaSnapshot } from '../../../src/shared/media';
vi.mock('../../../src/renderer/lib/diagnostics', () => ({ recordRendererError: vi.fn() }));
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
it('publishes native events immediately and prevents a delayed command response from restoring old metadata', async () => {
  let receive!: (value: MediaSnapshot) => void;
  let complete!: (value: { snapshot: MediaSnapshot; error: null }) => void;
  const unsubscribe = vi.fn();
  await mount({
    getSystemMedia: vi.fn().mockResolvedValue(snapshot('old')),
    systemEventCapabilities: { media: true },
    onMediaSnapshotChanged: (callback: typeof receive) => {
      receive = callback;
      return unsubscribe;
    },
    controlSystemMedia: () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  });
  let operation!: Promise<void>;
  await act(async () => {
    operation = hook.controlMedia('next', 'one');
  });
  await act(async () => receive(snapshot('new')));
  expect(hook.mediaTrack?.artworkUrl).toBe('new');
  await act(async () => {
    complete({ snapshot: snapshot('old'), error: null });
    await operation;
  });
  expect(hook.mediaTrack?.artworkUrl).toBe('new');
  await act(async () => root!.unmount());
  root = undefined;
  expect(unsubscribe).toHaveBeenCalledOnce();
});
it('updates artwork from pushed snapshots and distinguishes a failed read from no session', async () => {
  let receive!: (snapshot: MediaSnapshot) => void;
  const read = vi.fn().mockResolvedValue(snapshot('first'));
  await mount({
    getSystemMedia: read,
    onMediaSnapshotChanged: (callback: typeof receive) => {
      receive = callback;
      return () => {};
    },
  });
  expect(hook.mediaTrack?.artworkUrl).toBe('first');
  await act(async () => receive(snapshot('second')));
  expect(hook.mediaTrack?.artworkUrl).toBe('second');
  await act(async () =>
    receive({
      ...snapshot('second'),
      status: 'error',
      error: 'mediaReadFailed',
      sessions: [{ ...snapshot('second').sessions[0], stale: true }],
    }),
  );
  expect(hook.mediaSnapshot.error).toBe('mediaReadFailed');
  expect(hook.mediaTrack?.stale).toBe(true);
  await act(async () =>
    receive({ ...snapshot(''), sessions: [], activeSessionId: null, status: 'idle' }),
  );
  expect(hook.mediaTrack).toBeNull();
  expect(hook.mediaSnapshot.error).toBeNull();
  await act(async () => vi.advanceTimersByTimeAsync(30_000));
  expect(read).toHaveBeenCalledOnce();
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
