import { useState, useEffect, useRef, useCallback } from 'react';
import type { MediaCommand, MediaError, MediaSnapshot } from '../../shared/media';
import { emptyMediaSnapshot } from '../../shared/media';
import { recordRendererError } from '../lib/diagnostics';

export function useMedia() {
  const [mediaSnapshot, setMediaSnapshot] = useState<MediaSnapshot>(emptyMediaSnapshot);
  const [mediaActionError, setMediaActionError] = useState<MediaError | null>(null);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [mediaSelection, setMediaSelection] = useState<{ id: string | null } | null>(null);
  const pendingSelection = useRef<{ id: string | null } | null>(null);
  const [showPausedQuickView, setShowPausedQuickView] = useState(false);
  const mounted = useRef(false);
  const busy = useRef(false);
  const requestVersion = useRef(0);
  const mediaTrack =
    mediaSnapshot.sessions.find((session) => session.id === mediaSnapshot.activeSessionId) ?? null;
  useEffect(() => {
    setShowPausedQuickView(mediaTrack?.state === 'paused');
    const timer = setTimeout(() => setShowPausedQuickView(false), 3000);
    return () => clearTimeout(timer);
  }, [mediaTrack?.state, mediaTrack?.id]);
  useEffect(() => {
    mounted.current = true;
    let active = true;
    const unsubscribe = window.electronAPI.onMediaSnapshotChanged?.((snapshot) => {
      requestVersion.current++;
      if (active) setMediaSnapshot(snapshot);
    });
    const poll = async () => {
      if (!busy.current) {
        const version = requestVersion.current;
        try {
          const snapshot = await window.electronAPI.getSystemMedia();
          if (active && version === requestVersion.current) setMediaSnapshot(snapshot);
        } catch (error) {
          recordRendererError('media', error);
          if (active && version === requestVersion.current)
            setMediaSnapshot((current) => ({
              ...current,
              status: 'error',
              error: 'mediaReadFailed',
              sessions: current.sessions.map((session) => ({ ...session, stale: true })),
            }));
        }
      }
    };
    void poll();
    return () => {
      mounted.current = false;
      pendingSelection.current = null;
      active = false;
      unsubscribe?.();
    };
  }, []);
  const perform = useCallback(
    async (operation: () => ReturnType<typeof window.electronAPI.selectMediaSession>) => {
      if (busy.current) return;
      busy.current = true;
      requestVersion.current++;
      setMediaBusy(true);
      setMediaActionError(null);
      const apply = async (request: typeof operation) => {
        const version = requestVersion.current;
        try {
          const result = await request();
          if (mounted.current) {
            if (version === requestVersion.current) setMediaSnapshot(result.snapshot);
            setMediaActionError(result.error);
          }
        } catch (error) {
          recordRendererError('media', error);
          if (mounted.current) setMediaActionError('mediaCommandFailed');
        }
      };
      await apply(operation);
      while (pendingSelection.current && mounted.current) {
        const target = pendingSelection.current;
        pendingSelection.current = null;
        requestVersion.current++;
        await apply(() => window.electronAPI.selectMediaSession(target.id));
      }
      busy.current = false;
      if (mounted.current) {
        setMediaSelection(null);
        setMediaBusy(false);
      }
    },
    [],
  );
  const controlMedia = useCallback(
    (command: MediaCommand, id: string) =>
      perform(() => window.electronAPI.controlSystemMedia(command, id)),
    [perform],
  );
  const selectMediaSession = useCallback(
    (id: string | null) => {
      pendingSelection.current = { id };
      setMediaSelection({ id });
      return perform(() => {
        const target = pendingSelection.current!;
        pendingSelection.current = null;
        return window.electronAPI.selectMediaSession(target.id);
      });
    },
    [perform],
  );
  const openMediaSession = useCallback(
    (id: string) => perform(() => window.electronAPI.openMediaSession(id)),
    [perform],
  );
  return {
    mediaTrack,
    mediaSnapshot,
    mediaActionError,
    mediaBusy,
    mediaPageId: mediaSelection ? mediaSelection.id : mediaSnapshot.manualSessionId,
    controlMedia,
    selectMediaSession,
    openMediaSession,
    showPausedQuickView,
  };
}
