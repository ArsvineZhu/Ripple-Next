export interface MediaSession {
  name: string;
  artist: string;
  album?: string;
  artworkUrl?: string | null;
  source: string;
  id: string;
  playerName: string;
  state: 'playing' | 'paused' | 'stopped' | 'unknown';
  capabilities: {
    previous: boolean | null;
    play: boolean | null;
    pause: boolean | null;
    next: boolean | null;
    toggle: boolean | null;
  };
  isCurrent?: boolean;
  stale?: boolean;
}
export type MediaError =
  | 'mediaReadFailed'
  | 'mediaSessionGone'
  | 'mediaCommandUnsupported'
  | 'mediaCommandFailed'
  | 'mediaOpenFailed';
export interface MediaSnapshot {
  sessions: MediaSession[];
  activeSessionId: string | null;
  manualSessionId: string | null;
  status: 'ready' | 'idle' | 'error';
  error: MediaError | null;
}
export interface MediaOperationResult {
  snapshot: MediaSnapshot;
  error: MediaError | null;
}
export type MediaCommand = 'previous' | 'playpause' | 'next';

export const emptyMediaSnapshot: MediaSnapshot = {
  sessions: [],
  activeSessionId: null,
  manualSessionId: null,
  status: 'idle',
  error: null,
};

export function selectAutomaticSession(
  sessions: MediaSession[],
  previousId: string | null,
): MediaSession | undefined {
  const fresh = sessions.filter((session) => !session.stale);
  return (
    fresh.find((session) => session.isCurrent && session.state === 'playing') ??
    fresh.find((session) => session.id === previousId && session.state === 'playing') ??
    fresh.find((session) => session.state === 'playing') ??
    fresh.find((session) => session.id === previousId) ??
    fresh.find((session) => session.isCurrent) ??
    fresh[0]
  );
}

export function mediaCommandSupported(session: MediaSession, command: MediaCommand): boolean {
  if (session.stale) return false;
  if (command !== 'playpause') return session.capabilities[command] !== false;
  const direct =
    session.state === 'playing' ? session.capabilities.pause : session.capabilities.play;
  return direct !== false || session.capabilities.toggle !== false;
}
