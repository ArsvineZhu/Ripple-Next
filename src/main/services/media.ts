import type {
  MediaCommand,
  MediaError,
  MediaOperationResult,
  MediaSession,
  MediaSnapshot,
} from '../../shared/media';
import {
  emptyMediaSnapshot,
  mediaCommandSupported,
  selectAutomaticSession,
} from '../../shared/media';
import { nativeMedia } from '../platform/media';
import type { MediaBackend } from '../platform/media';
import { serializeDiagnosticError } from '../../shared/diagnostics';

function sameSession(left: MediaSession, right: MediaSession) {
  return (
    left.id === right.id &&
    left.source === right.source &&
    left.playerName === right.playerName &&
    left.name === right.name &&
    left.artist === right.artist &&
    left.album === right.album &&
    left.artworkUrl === right.artworkUrl &&
    left.state === right.state &&
    left.isCurrent === right.isCurrent &&
    left.stale === right.stale &&
    left.capabilities.previous === right.capabilities.previous &&
    left.capabilities.next === right.capabilities.next &&
    left.capabilities.play === right.capabilities.play &&
    left.capabilities.pause === right.capabilities.pause &&
    left.capabilities.toggle === right.capabilities.toggle
  );
}

function sameSnapshot(left: MediaSnapshot, right: MediaSnapshot) {
  return (
    left.status === right.status &&
    left.error === right.error &&
    left.activeSessionId === right.activeSessionId &&
    left.manualSessionId === right.manualSessionId &&
    left.sessions.length === right.sessions.length &&
    left.sessions.every((session, index) => sameSession(session, right.sessions[index]!))
  );
}

export function createMediaService(
  backend: MediaBackend = nativeMedia,
  reportError: (error: unknown) => void = () => {},
) {
  let snapshot: MediaSnapshot = { ...emptyMediaSnapshot };
  let pending: Promise<MediaSnapshot> | undefined;
  let closed = false;
  let queue = Promise.resolve();
  const reported = new Map<string, number>();
  const listeners = new Set<(snapshot: MediaSnapshot) => void>();
  const publish = () => {
    if (!closed) listeners.forEach((listener) => listener(snapshot));
  };
  const replaceSnapshot = (next: MediaSnapshot) => {
    if (sameSnapshot(snapshot, next)) return;
    snapshot = next;
    publish();
  };
  let dirty = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let watching = false;
  const poll = async () => {
    await getSnapshot();
    if (!closed && watching && !backend.subscribe) {
      timer = setTimeout(() => void poll(), 5000);
      timer.unref();
    }
  };
  const unsubscribe = backend.subscribe?.(() => {
    dirty = true;
    void getSnapshot();
  });
  function reportOnce(error: unknown) {
    const signature = JSON.stringify(serializeDiagnosticError(error));
    const now = Date.now();
    if (now - (reported.get(signature) ?? 0) < 60_000) return;
    if (reported.size >= 64) reported.delete(reported.keys().next().value!);
    reported.set(signature, now);
    reportError(error);
  }
  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = queue.then(operation);
    queue = result.then(
      () => {},
      () => {},
    );
    return result;
  }
  async function read(): Promise<MediaSnapshot> {
    if (closed) return snapshot;
    try {
      const { sessions, failedIds, errors } = await backend.getMediaSessions();
      errors?.forEach(reportOnce);
      if (failedIds.length && !errors?.length)
        reportOnce(
          Object.assign(new Error('Media query incomplete'), { code: 'MEDIA_PARTIAL_READ' }),
        );
      if (!failedIds.length && !errors?.length) reported.clear();
      if (closed) return snapshot;
      const stale = snapshot.sessions
        .filter((session) => failedIds.includes(session.id))
        .map((session) => ({ ...session, stale: true }));
      const available = [...sessions, ...stale];
      const manual = available.find((session) => session.id === snapshot.manualSessionId);
      const selected = manual ?? selectAutomaticSession(available, snapshot.activeSessionId);
      const lostManual = snapshot.manualSessionId !== null && !manual;
      replaceSnapshot({
        sessions: available,
        activeSessionId: selected?.id ?? null,
        manualSessionId: manual?.id ?? null,
        status:
          selected?.stale || (failedIds.length && !selected)
            ? 'error'
            : selected
              ? 'ready'
              : 'idle',
        error:
          selected?.stale || (failedIds.length && !selected)
            ? 'mediaReadFailed'
            : lostManual
              ? 'mediaSessionGone'
              : null,
      });
    } catch (error) {
      if (closed) return snapshot;
      reportOnce(error);
      replaceSnapshot({
        ...snapshot,
        sessions: snapshot.sessions.map((session) => ({ ...session, stale: true })),
        status: 'error',
        error: 'mediaReadFailed',
      });
    }
    return snapshot;
  }
  function getSnapshot() {
    if (closed) return Promise.resolve(snapshot);
    if (!pending)
      pending = enqueue(async () => {
        do {
          dirty = false;
          await read();
        } while (dirty && !closed);
        return snapshot;
      }).finally(() => {
        pending = undefined;
        if (dirty && !closed) void getSnapshot();
      });
    return pending;
  }
  function selectSession(id: string | null): MediaOperationResult {
    if (closed) return { snapshot, error: 'mediaReadFailed' };
    if (id !== null && !snapshot.sessions.some((session) => session.id === id))
      return { snapshot, error: 'mediaSessionGone' };
    const selected =
      id ?? selectAutomaticSession(snapshot.sessions, snapshot.activeSessionId)?.id ?? null;
    const selectedSession = snapshot.sessions.find((session) => session.id === selected);
    snapshot = {
      ...snapshot,
      manualSessionId: id,
      activeSessionId: selected,
      status: selectedSession?.stale ? 'error' : selectedSession ? 'ready' : 'idle',
      error: selectedSession?.stale ? 'mediaReadFailed' : selectedSession ? null : snapshot.error,
    };
    publish();
    return { snapshot, error: null };
  }
  async function control(command: MediaCommand, id: string): Promise<MediaOperationResult> {
    if (closed) return { snapshot, error: 'mediaReadFailed' };
    const session = snapshot.sessions.find((item) => item.id === id);
    let error: MediaError | null = !session
      ? 'mediaSessionGone'
      : session.stale
        ? 'mediaReadFailed'
        : !mediaCommandSupported(session, command)
          ? 'mediaCommandUnsupported'
          : null;
    if (error || !session) return { snapshot, error };
    try {
      await backend.controlSystemMedia(command, session);
    } catch (failure) {
      reportOnce(failure);
      error = 'mediaCommandFailed';
    }
    await read();
    return { snapshot, error };
  }
  return {
    start() {
      if (watching || closed) return;
      watching = true;
      void poll();
    },
    subscribe(listener: (snapshot: MediaSnapshot) => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot,
    openSession: async (id: string): Promise<MediaOperationResult> => {
      if (closed) return { snapshot, error: 'mediaReadFailed' };
      const session = snapshot.sessions.find((item) => item.id === id);
      if (!session) return { snapshot, error: 'mediaSessionGone' };
      if (session.stale) return { snapshot, error: 'mediaReadFailed' };
      try {
        await backend.openMediaSession(session);
        return { snapshot, error: null };
      } catch (failure) {
        reportOnce(failure);
        return { snapshot, error: 'mediaOpenFailed' };
      }
    },
    selectSession,
    control: (command: MediaCommand, id: string) => enqueue(() => control(command, id)),
    close: () => {
      closed = true;
      if (timer) clearTimeout(timer);
      unsubscribe?.();
      listeners.clear();
      backend.close?.();
    },
  };
}
