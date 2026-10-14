import { DiagnosticError } from '../../../shared/diagnosticError';
import dbus from 'dbus-native';
import { z } from 'zod';
import type { MediaCommand, MediaSession } from '../../../shared/media';
import { mediaArtworkUrl } from '../../services/imageFiles';
const playerPath = '/org/mpris/MediaPlayer2';
const playerInterface = 'org.mpris.MediaPlayer2.Player';
let bus: ReturnType<typeof dbus.sessionBus> | undefined;
const lastIds = new Map<string, string>();
const raiseCapabilities = new Map<string, boolean>();
function connection() {
  if (!bus) {
    const current = dbus.sessionBus({ timeout: 5000, maxMessageSize: 8 * 1024 * 1024 });
    bus = current;
    current.on('error', () => {
      if (bus === current) bus = undefined;
      current.connection.end();
    });
    current.connection.on('end', () => {
      if (bus === current) bus = undefined;
    });
  }
  return bus;
}
export function close() {
  bus?.connection.end();
  bus = undefined;
  lastIds.clear();
  raiseCapabilities.clear();
}
const propertiesSchema = z.object({
  PlaybackStatus: z.enum(['Playing', 'Paused', 'Stopped']),
  Metadata: z.record(z.string(), z.unknown()),
  CanControl: z.boolean().optional(),
  CanGoNext: z.boolean().optional(),
  CanGoPrevious: z.boolean().optional(),
  CanPlay: z.boolean().optional(),
  CanPause: z.boolean().optional(),
});
export async function getMediaSessions() {
  const current = connection();
  const names = await current.invokeDbus<string[]>({ member: 'ListNames' });
  const results = await Promise.allSettled(
    names
      .filter((name) => name.startsWith('org.mpris.MediaPlayer2.'))
      .map(async (name) => {
        let id = lastIds.get(name) ?? name;
        try {
          const owner = await current.invokeDbus<string>({
            member: 'GetNameOwner',
            signature: 's',
            body: [name],
          });
          id = owner + '|' + name;
          lastIds.set(name, id);
          const props = propertiesSchema.parse(
            await current.invoke<unknown>({
              destination: owner,
              path: playerPath,
              interface: 'org.freedesktop.DBus.Properties',
              member: 'GetAll',
              signature: 's',
              body: [playerInterface],
            }),
          );
          const metadata = props.Metadata;
          const text = (key: string) =>
            typeof metadata[key] === 'string' ? (metadata[key] as string) : '';
          const capability = (value: boolean | undefined) =>
            props.CanControl === false ? false : (value ?? null);
          const identity: Record<string, unknown> = await current
            .invoke<Record<string, unknown>>({
              destination: owner,
              path: playerPath,
              interface: 'org.freedesktop.DBus.Properties',
              member: 'GetAll',
              signature: 's',
              body: ['org.mpris.MediaPlayer2'],
            })
            .catch(() => ({}));
          const session: MediaSession = {
            id,
            source:
              typeof identity.DesktopEntry === 'string'
                ? identity.DesktopEntry
                : name.slice('org.mpris.MediaPlayer2.'.length).split('.')[0],
            playerName:
              typeof identity.Identity === 'string'
                ? identity.Identity
                : name.slice('org.mpris.MediaPlayer2.'.length),
            name: text('xesam:title'),
            artist: Array.isArray(metadata['xesam:artist'])
              ? metadata['xesam:artist'].filter((item) => typeof item === 'string').join(', ')
              : text('xesam:artist'),
            album: text('xesam:album'),
            artworkUrl: await mediaArtworkUrl(text('mpris:artUrl')),
            state: props.PlaybackStatus.toLowerCase() as MediaSession['state'],
            capabilities: {
              previous: capability(props.CanGoPrevious),
              next: capability(props.CanGoNext),
              play: capability(props.CanPlay),
              pause: capability(props.CanPause),
              toggle: false,
            },
          };
          if (typeof identity.CanRaise === 'boolean') raiseCapabilities.set(id, identity.CanRaise);
          return { session, id };
        } catch (error) {
          return {
            session: null,
            id,
            error: new DiagnosticError('MPRIS player properties query failed', [], {
              cause: error,
            }),
          };
        }
      }),
  );
  const currentIds = new Set(lastIds.values());
  for (const [name, id] of lastIds) {
    if (!names.includes(name)) {
      lastIds.delete(name);
      currentIds.delete(id);
    }
  }
  for (const id of raiseCapabilities.keys()) {
    if (!currentIds.has(id)) raiseCapabilities.delete(id);
  }
  return {
    sessions: results.flatMap((result) =>
      result.status === 'fulfilled' && result.value.session ? [result.value.session] : [],
    ),
    errors: results.flatMap((result) =>
      result.status === 'rejected'
        ? [result.reason]
        : result.value.error
          ? [result.value.error]
          : [],
    ),
    failedIds: results.flatMap((result) =>
      result.status === 'fulfilled' && !result.value.session ? [result.value.id] : [],
    ),
  };
}
export async function controlSystemMedia(
  command: MediaCommand,
  session: MediaSession,
): Promise<void> {
  const destination = session.id.split('|')[0];
  if (!/^:\d+\.\d+$/.test(destination)) throw new DiagnosticError('Invalid MPRIS session');
  await connection().invoke({
    destination,
    path: playerPath,
    interface: playerInterface,
    member: {
      previous: 'Previous',
      playpause: session.state === 'playing' ? 'Pause' : 'Play',
      next: 'Next',
    }[command],
  });
}
export async function openMediaSession(session: MediaSession): Promise<void> {
  const destination = session.id.split('|')[0];
  if (!/^:\d+\.\d+$/.test(destination)) throw new DiagnosticError('Invalid MPRIS session');
  if (raiseCapabilities.get(session.id) !== false) {
    try {
      await connection().invoke({
        destination,
        path: playerPath,
        interface: 'org.mpris.MediaPlayer2',
        member: 'Raise',
      });
      return;
    } catch {
      // Some players expose Raise but require their tray's activation entry point.
    }
  }
  await connection().invoke({
    destination,
    path: '/StatusNotifierItem',
    interface: 'org.kde.StatusNotifierItem',
    member: 'Activate',
    signature: 'ii',
    body: [0, 0],
  });
}
