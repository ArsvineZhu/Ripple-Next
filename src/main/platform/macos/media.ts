import { z } from 'zod';
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
  state: z.enum(['playing', 'paused', 'stopped']),
});
async function readPlayer(player: string): Promise<MediaSession> {
  const script = `use framework "Foundation"
use scripting additions
tell application "${player}"
  set mediaState to player state as string
  set songName to ""
  set artistName to ""
  set albumName to ""
  set artUrl to ""
  try
    set songName to name of current track
    set artistName to artist of current track
    set albumName to album of current track
    ${player === 'Spotify' ? 'set artUrl to artwork url of current track' : ''}
  end try
end tell
set info to current application's NSMutableDictionary's dictionary()
info's setObject:songName forKey:"name"
info's setObject:artistName forKey:"artist"
info's setObject:albumName forKey:"album"
info's setObject:artUrl forKey:"artwork"
info's setObject:mediaState forKey:"state"
set data to current application's NSJSONSerialization's dataWithJSONObject:info options:0 |error|:(missing value)
return (current application's NSString's alloc()'s initWithData:data encoding:4) as text`;
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
    artworkUrl: info.artwork || null,
    capabilities: { previous: null, next: null, play: true, pause: true, toggle: true },
  };
}
export async function getMediaSessions() {
  const players = await runningPlayers();
  const results = await Promise.allSettled(players.map(readPlayer));
  return {
    sessions: results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : [])),
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
    throw new Error('Media session unavailable');
  const operation = command === 'playpause' ? 'playpause' : command + ' track';
  await runCommand('/usr/bin/osascript', [
    '-e',
    `tell application "${session.id}" to ${operation}`,
  ]);
}
export async function openMediaSession(session: MediaSession): Promise<void> {
  if (!['Spotify', 'Music'].includes(session.id) || !(await runningPlayers()).includes(session.id))
    throw new Error('Media session unavailable');
  await runCommand('/usr/bin/open', ['-a', session.id]);
}
