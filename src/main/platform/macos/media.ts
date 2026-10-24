import { DiagnosticError } from '../../../shared/diagnosticError';
import { z } from 'zod';
import { readMusicArtwork } from './musicArtwork';
import { runCommand } from '../../services/processes';
import type { MediaCommand, MediaSession } from '../../../shared/media';
async function runningPlayers() {
  const names = (await runCommand('/bin/ps', ['-A', '-o', 'comm=']))
    .split('\n')
    .map((name) => name.trim().split('/').at(-1));
  return ['Spotify', 'Music'].filter((name) => names.includes(name));
}
const trackSchema = z.object({
  name: z.string(),
  artist: z.string(),
  album: z.string(),
  artwork: z.string(),
  trackId: z.string().default(''),
  state: z.enum(['playing', 'paused', 'stopped']),
});
const listeners = new Set<() => void>();
let lifecycle = 0;
let pollTimer: ReturnType<typeof setInterval> | undefined;
let cover:
  | {
      key: string;
      url: string | null;
      pending: boolean;
      retryAt: number;
      controller: AbortController;
    }
  | undefined;
const notify = () => listeners.forEach((listener) => listener());
function clearCover() {
  cover?.controller.abort();
  cover = undefined;
}
function musicArtwork(track: z.infer<typeof trackSchema>): string | null {
  if (!track.name || track.state === 'stopped') {
    clearCover();
    return null;
  }
  const key = JSON.stringify([track.trackId, track.name, track.artist, track.album]);
  if (cover?.key === key && (cover.pending || cover.url || Date.now() < cover.retryAt))
    return cover.url;
  clearCover();
  const entry = {
    key,
    url: null as string | null,
    pending: true,
    retryAt: 0,
    controller: new AbortController(),
  };
  cover = entry;
  // Publish metadata immediately. A late cover can only update its own song generation.
  void readMusicArtwork(track, entry.controller.signal)
    .catch(() => null)
    .then((url) => {
      if (cover !== entry) return;
      entry.pending = false;
      entry.url = url;
      entry.retryAt = Date.now() + 30_000;
      if (url) notify();
    });
  return null;
}
export function subscribe(listener: () => void) {
  listeners.add(listener);
  // Music/Spotify dictionaries have no shared event stream. Covers notify immediately;
  // this adapter owns the fallback sample while the media service observes it.
  pollTimer ??= setInterval(notify, 5000);
  pollTimer.unref();
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      clearInterval(pollTimer);
      pollTimer = undefined;
    }
  };
}
export function close() {
  lifecycle++;
  clearInterval(pollTimer);
  pollTimer = undefined;
  listeners.clear();
  clearCover();
}
async function readPlayer(player: string): Promise<MediaSession> {
  const generation = lifecycle;
  const script = `use framework "Foundation"
use scripting additions
tell application "${player}"
  set mediaState to player state as string
  set songName to ""
  set artistName to ""
  set albumName to ""
  set artUrl to ""
  set songId to ""
  try
    set songName to name of current track
    set artistName to artist of current track
    set albumName to album of current track
    ${player === 'Spotify' ? 'set artUrl to artwork url of current track' : 'set songId to persistent ID of current track'}
  end try
end tell
set info to current application's NSMutableDictionary's dictionary()
info's setObject:songName forKey:"name"
info's setObject:artistName forKey:"artist"
info's setObject:albumName forKey:"album"
info's setObject:artUrl forKey:"artwork"
info's setObject:songId forKey:"trackId"
info's setObject:mediaState forKey:"state"
set jsonData to current application's NSJSONSerialization's dataWithJSONObject:info options:0 |error|:(missing value)
return (current application's NSString's alloc()'s initWithData:jsonData encoding:4) as text`;
  const info = trackSchema.parse(
    JSON.parse(await runCommand('/usr/bin/osascript', ['-e', script])),
  );
  return {
    id: player,
    playerName: player,
    source: player,
    name: info.name,
    artist: info.artist,
    album: info.album,
    state: info.state,
    artworkUrl:
      player === 'Music'
        ? generation === lifecycle
          ? musicArtwork(info)
          : null
        : info.artwork || null,
    capabilities: { previous: null, next: null, play: true, pause: true, toggle: true },
  };
}
export async function getMediaSessions() {
  const players = await runningPlayers();
  if (!players.includes('Music')) clearCover();
  const results = await Promise.allSettled(players.map(readPlayer));
  return {
    sessions: results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : [])),
    errors: results.flatMap((result, index) =>
      result.status === 'rejected'
        ? [
            new DiagnosticError(players[index] + ' media query failed', [], {
              cause: result.reason,
            }),
          ]
        : [],
    ),
    failedIds: results.flatMap((result, index) =>
      result.status === 'rejected' ? [players[index]] : [],
    ),
  };
}
export async function controlSystemMedia(
  command: MediaCommand,
  session: MediaSession,
): Promise<void> {
  if (!['Spotify', 'Music'].includes(session.id) || !(await runningPlayers()).includes(session.id))
    throw new DiagnosticError('Media session unavailable');
  const operation = command === 'playpause' ? 'playpause' : command + ' track';
  await runCommand('/usr/bin/osascript', [
    '-e',
    `tell application "${session.id}" to ${operation}`,
  ]);
}
export async function openMediaSession(session: MediaSession): Promise<void> {
  if (!['Spotify', 'Music'].includes(session.id) || !(await runningPlayers()).includes(session.id))
    throw new DiagnosticError('Media session unavailable');
  await runCommand('/usr/bin/open', ['-a', session.id]);
}
