import { DiagnosticError } from '../../../shared/diagnosticError';
import { createSignalBus } from './signalBus';
import type { MessageBus } from 'dbus-native';
import { z } from 'zod';
import type { MediaCommand, MediaSession } from '../../../shared/media';
import { mediaArtworkUrl } from '../../services/imageFiles';

const playerPath = '/org/mpris/MediaPlayer2';
const playerInterface = 'org.mpris.MediaPlayer2.Player';
const propertiesSchema = z.object({
  PlaybackStatus: z.enum(['Playing', 'Paused', 'Stopped']),
  Metadata: z.record(z.string(), z.unknown()),
  CanControl: z.boolean().optional(),
  CanGoNext: z.boolean().optional(),
  CanGoPrevious: z.boolean().optional(),
  CanPlay: z.boolean().optional(),
  CanPause: z.boolean().optional(),
});
type Player = {
  id: string;
  name: string;
  owner: string;
  props?: z.infer<typeof propertiesSchema>;
  identity: Record<string, unknown>;
  session?: MediaSession;
  error?: unknown;
  loading?: Promise<void>;
  revision: number;
  artworkGeneration: number;
  artworkIdentity?: string;
  artwork?: Promise<void>;
  dirty: boolean;
  retry?: ReturnType<typeof setTimeout>;
  failures: number;
};
const players = new Map<string, Player>();
const ownerRevisions = new Map<string, number>();
const raiseCapabilities = new Map<string, boolean>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
let currentBus: MessageBus | undefined;
let discoveryDirty = true;
let unsubscribeEvents: (() => void) | undefined;

function updateSession(player: Player, metadataChanged = false) {
  const props = player.props;
  if (!props) return;
  const metadata = props.Metadata;
  const text = (key: string) =>
    typeof metadata[key] === 'string' ? (metadata[key] as string) : '';
  const capability = (value: boolean | undefined) =>
    props.CanControl === false ? false : (value ?? null);
  const artworkUrl = text('mpris:artUrl');
  const artworkIdentity = JSON.stringify([
    text('mpris:trackid'),
    text('xesam:title'),
    metadata['xesam:artist'],
    text('xesam:album'),
    artworkUrl,
  ]);
  const changed = metadataChanged || player.artworkIdentity !== artworkIdentity;
  player.session = {
    id: player.id,
    source:
      typeof player.identity.DesktopEntry === 'string'
        ? player.identity.DesktopEntry
        : player.name.slice('org.mpris.MediaPlayer2.'.length).split('.')[0],
    playerName:
      typeof player.identity.Identity === 'string'
        ? player.identity.Identity
        : player.name.slice('org.mpris.MediaPlayer2.'.length),
    name: text('xesam:title'),
    artist: Array.isArray(metadata['xesam:artist'])
      ? metadata['xesam:artist'].filter((item) => typeof item === 'string').join(', ')
      : text('xesam:artist'),
    album: text('xesam:album'),
    artworkUrl: changed
      ? /^file:/i.test(artworkUrl)
        ? null
        : artworkUrl || null
      : player.session?.artworkUrl,
    state: props.PlaybackStatus.toLowerCase() as MediaSession['state'],
    capabilities: {
      previous: capability(props.CanGoPrevious),
      next: capability(props.CanGoNext),
      play: capability(props.CanPlay),
      pause: capability(props.CanPause),
      toggle: false,
    },
  };
  if (typeof player.identity.CanRaise === 'boolean')
    raiseCapabilities.set(player.id, player.identity.CanRaise);
  player.error = undefined;
  if (!changed) return;
  player.artworkIdentity = artworkIdentity;
  const generation = ++player.artworkGeneration;
  if (!/^file:/i.test(artworkUrl)) return;
  // Metadata is already current. Local file I/O never gates its publication or commands.
  player.artwork = mediaArtworkUrl(artworkUrl)
    .catch(() => null)
    .then((url) => {
      if (
        players.get(player.name) !== player ||
        generation !== player.artworkGeneration ||
        !player.session
      )
        return;
      player.session = { ...player.session, artworkUrl: url };
      emit();
    });
}

const events = createSignalBus(
  'session',
  [
    "type='signal',interface='org.freedesktop.DBus',member='NameOwnerChanged',arg0namespace='org.mpris.MediaPlayer2'",
    "type='signal',interface='org.freedesktop.DBus.Properties',member='PropertiesChanged',path='/org/mpris/MediaPlayer2'",
  ],
  (message) => {
    if (message.interface === 'org.freedesktop.DBus' && message.member === 'NameOwnerChanged') {
      const name = message.body?.[0];
      if (typeof name !== 'string' || !name.startsWith('org.mpris.MediaPlayer2.')) return false;
      ownerRevisions.set(name, (ownerRevisions.get(name) ?? 0) + 1);
      const previous = players.get(name);
      if (previous) {
        if (previous.retry) clearTimeout(previous.retry);
        players.delete(name);
        raiseCapabilities.delete(previous.id);
      }
      discoveryDirty = true;
      return true;
    }
    if (message.path !== playerPath || message.member !== 'PropertiesChanged') return false;
    const iface = message.body?.[0];
    if (iface !== playerInterface && iface !== 'org.mpris.MediaPlayer2') return false;
    const changes = z.record(z.string(), z.unknown()).safeParse(message.body?.[1]);
    const invalidated = message.body?.[2];
    for (const player of players.values()) {
      if (player.owner !== message.sender) continue;
      player.revision++;
      if (!changes.success || !player.props || (Array.isArray(invalidated) && invalidated.length)) {
        player.dirty = true;
        continue;
      }
      if (iface === playerInterface) {
        const next = propertiesSchema.safeParse({ ...player.props, ...changes.data });
        if (!next.success) {
          player.dirty = true;
          continue;
        }
        player.props = next.data;
      } else player.identity = { ...player.identity, ...changes.data };
      updateSession(player, Object.hasOwn(changes.data, 'Metadata'));
    }
    return true;
  },
);
export function subscribe(listener: () => void) {
  listeners.add(listener);
  unsubscribeEvents ??= events.subscribe(emit);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      unsubscribeEvents?.();
      unsubscribeEvents = undefined;
    }
  };
}
export function close() {
  unsubscribeEvents?.();
  unsubscribeEvents = undefined;
  listeners.clear();
  events.close();
  for (const player of players.values()) if (player.retry) clearTimeout(player.retry);
  players.clear();
  ownerRevisions.clear();
  raiseCapabilities.clear();
  currentBus = undefined;
  discoveryDirty = true;
}
function refreshPlayer(bus: MessageBus, player: Player) {
  if (player.loading) return player.loading;
  player.loading = (async () => {
    do {
      const revision = player.revision;
      player.dirty = false;
      try {
        const [props, identity] = await Promise.all([
          bus.invoke<unknown>({
            destination: player.owner,
            path: playerPath,
            interface: 'org.freedesktop.DBus.Properties',
            member: 'GetAll',
            signature: 's',
            body: [playerInterface],
          }),
          bus
            .invoke<Record<string, unknown>>({
              destination: player.owner,
              path: playerPath,
              interface: 'org.freedesktop.DBus.Properties',
              member: 'GetAll',
              signature: 's',
              body: ['org.mpris.MediaPlayer2'],
            })
            .catch(() => ({})),
        ]);
        if (players.get(player.name) !== player) return;
        if (revision !== player.revision) {
          player.dirty = true;
          continue;
        }
        player.props = propertiesSchema.parse(props);
        player.identity = identity;
        updateSession(player);
        player.failures = 0;
        if (player.retry) clearTimeout(player.retry);
        player.retry = undefined;
      } catch (cause) {
        if (players.get(player.name) !== player) return;
        player.error = new DiagnosticError('MPRIS player properties query failed', [], { cause });
        if (!player.retry && listeners.size) {
          player.retry = setTimeout(
            () => {
              player.retry = undefined;
              if (players.get(player.name) !== player) return;
              player.dirty = true;
              emit();
            },
            Math.min(30_000, 1000 * 2 ** Math.min(player.failures++, 5)),
          );
          player.retry.unref();
        }
      }
    } while (player.dirty && players.get(player.name) === player);
    emit();
  })().finally(() => {
    player.loading = undefined;
  });
  return player.loading;
}
export async function getMediaSessions() {
  const bus = await events.get();
  if (currentBus !== bus) {
    currentBus = bus;
    for (const player of players.values()) if (player.retry) clearTimeout(player.retry);
    players.clear();
    ownerRevisions.clear();
    raiseCapabilities.clear();
    discoveryDirty = true;
  }
  if (discoveryDirty) {
    discoveryDirty = false;
    try {
      const names = (await bus.invokeDbus<string[]>({ member: 'ListNames' })).filter((name) =>
        name.startsWith('org.mpris.MediaPlayer2.'),
      );
      for (const name of players.keys())
        if (!names.includes(name)) {
          const removed = players.get(name)!;
          if (removed.retry) clearTimeout(removed.retry);
          raiseCapabilities.delete(removed.id);
          players.delete(name);
        }
      await Promise.all(
        names.map(async (name) => {
          if (players.has(name)) return;
          try {
            const revision = ownerRevisions.get(name) ?? 0;
            const owner = await bus.invokeDbus<string>({
              member: 'GetNameOwner',
              signature: 's',
              body: [name],
            });
            if (players.has(name) || revision !== (ownerRevisions.get(name) ?? 0)) return;
            players.set(name, {
              name,
              owner,
              id: owner + '|' + name,
              identity: {},
              revision: 0,
              artworkGeneration: 0,
              failures: 0,
              dirty: true,
            });
          } catch (error) {
            discoveryDirty = true;
            if (
              (error as { dbusName?: string }).dbusName !==
              'org.freedesktop.DBus.Error.NameHasNoOwner'
            )
              throw error;
          }
        }),
      );
    } catch (error) {
      discoveryDirty = true;
      throw error;
    }
  }
  const reads = [...players.values()]
    .filter((player) => player.dirty)
    .map((player) => refreshPlayer(bus, player));
  if (!listeners.size) {
    await Promise.all(reads);
    await Promise.all([...players.values()].map((player) => player.artwork));
  }
  return {
    sessions: [...players.values()].flatMap((player) =>
      player.session && !player.error ? [player.session] : [],
    ),
    failedIds: [...players.values()].filter((player) => player.error).map((player) => player.id),
    errors: [...players.values()].flatMap((player) => (player.error ? [player.error] : [])),
  };
}
export async function controlSystemMedia(
  command: MediaCommand,
  session: MediaSession,
): Promise<void> {
  const destination = session.id.split('|')[0];
  if (!/^:\d+\.\d+$/.test(destination)) throw new DiagnosticError('Invalid MPRIS session');
  await (
    await events.get()
  ).invoke({
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
      await (
        await events.get()
      ).invoke({
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
  await (
    await events.get()
  ).invoke({
    destination,
    path: '/StatusNotifierItem',
    interface: 'org.kde.StatusNotifierItem',
    member: 'Activate',
    signature: 'ii',
    body: [0, 0],
  });
}
