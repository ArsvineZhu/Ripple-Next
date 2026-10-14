import { afterEach, expect, it, vi } from 'vitest';
import dbus from 'dbus-native';
import { createDbusFixture } from './fixtures/dbus';
import { launchLinuxDesktopEntry } from '../../../src/main/platform/linux/apps';
import {
  getMediaSessions,
  controlSystemMedia,
  openMediaSession,
  close,
  subscribe,
} from '../../../src/main/platform/linux/media';
let fixture: Awaited<ReturnType<typeof createDbusFixture>> | undefined;
let player: ReturnType<typeof dbus.createClient> | undefined;
vi.mock('../../../src/main/platform/linux/apps', () => ({
  launchLinuxDesktopEntry: vi.fn().mockResolvedValue(undefined),
}));
afterEach(async () => {
  close();
  player?.connection.end();
  await fixture?.close();
  fixture = undefined;
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
it('reads capabilities and artwork over D-Bus and targets the exact unique owner', async () => {
  fixture = await createDbusFixture();
  vi.stubEnv('DBUS_SESSION_BUS_ADDRESS', fixture.address);
  player = fixture.client;
  const paused = vi.fn();
  const raised = vi.fn();
  player.exportInterface(
    { Identity: 'Fixture', DesktopEntry: 'fixture', Raise: raised },
    '/org/mpris/MediaPlayer2',
    {
      name: 'org.mpris.MediaPlayer2',
      properties: { Identity: 's', DesktopEntry: 's' },
      methods: { Raise: ['', '', [], []] },
    },
  );
  player.exportInterface(
    {
      PlaybackStatus: 'Playing',
      CanControl: true,
      CanGoNext: false,
      CanGoPrevious: true,
      CanPlay: true,
      CanPause: true,
      Metadata: {
        'xesam:title': new dbus.Variant('s', 'Song || quote'),
        'xesam:artist': new dbus.Variant('as', ['One', 'Two']),
        'mpris:artUrl': new dbus.Variant('s', 'https://example.com/art.png'),
      },
      Pause: paused,
    },
    '/org/mpris/MediaPlayer2',
    {
      name: 'org.mpris.MediaPlayer2.Player',
      methods: { Pause: ['', '', [], []] },
      properties: {
        PlaybackStatus: 's',
        CanControl: 'b',
        CanGoNext: 'b',
        CanGoPrevious: 'b',
        CanPlay: 'b',
        CanPause: 'b',
        Metadata: 'a{sv}',
      },
    },
  );
  await player.invokeDbus({
    member: 'RequestName',
    signature: 'su',
    body: ['org.mpris.MediaPlayer2.fixture', 0],
  });
  const result = await getMediaSessions();
  expect(result.sessions).toHaveLength(1);
  const session = result.sessions[0];
  expect(session.id).toMatch(/^:\d+\.\d+\|org.mpris/);
  expect(session).toMatchObject({
    name: 'Song || quote',
    artist: 'One, Two',
    artworkUrl: 'https://example.com/art.png',
    capabilities: { next: false, previous: true },
  });
  await controlSystemMedia('playpause', session);
  expect(paused).toHaveBeenCalledTimes(1);
  await openMediaSession(session);
  expect(raised).toHaveBeenCalledTimes(1);
  await player.close();
  player = undefined;
  await expect(controlSystemMedia('playpause', session)).rejects.toThrow();
  await expect(openMediaSession(session)).rejects.toThrow();
  expect(launchLinuxDesktopEntry).not.toHaveBeenCalled();
}, 10000);

async function fallbackPlayer(
  root: Record<string, unknown>,
  raise = vi.fn(),
  activate: ReturnType<typeof vi.fn> | null = vi.fn(),
) {
  fixture = await createDbusFixture();
  vi.stubEnv('DBUS_SESSION_BUS_ADDRESS', fixture.address);
  player = fixture.client;
  player.exportInterface({ ...root, Raise: raise }, '/org/mpris/MediaPlayer2', {
    name: 'org.mpris.MediaPlayer2',
    properties: {
      Identity: 's',
      ...(root.CanRaise !== undefined ? { CanRaise: 'b' } : {}),
      ...(root.DesktopEntry !== undefined ? { DesktopEntry: 's' } : {}),
    },
    methods: { Raise: ['', '', [], []] },
  });
  player.exportInterface({ PlaybackStatus: 'Playing', Metadata: {} }, '/org/mpris/MediaPlayer2', {
    name: 'org.mpris.MediaPlayer2.Player',
    properties: { PlaybackStatus: 's', Metadata: 'a{sv}' },
  });
  if (activate) {
    player.exportInterface({ Activate: activate }, '/StatusNotifierItem', {
      name: 'org.kde.StatusNotifierItem',
      methods: { Activate: ['ii', '', ['x', 'y'], []] },
    });
  }
  await player.invokeDbus({
    member: 'RequestName',
    signature: 'su',
    body: ['org.mpris.MediaPlayer2.chromium.instance123', 0],
  });
  const result = await getMediaSessions();
  return { session: result.sessions[0], raise, activate };
}

it('activates the existing Folia-style tray owner when CanRaise=false, without launching a process', async () => {
  const { session, raise, activate } = await fallbackPlayer({ Identity: 'Folia', CanRaise: false });
  await openMediaSession(session);
  expect(raise).not.toHaveBeenCalled();
  expect(activate).toHaveBeenCalledWith(
    0,
    0,
    expect.objectContaining({ destination: session.id.split('|')[0] }),
  );
  expect(launchLinuxDesktopEntry).not.toHaveBeenCalled();
  await player!.close();
  player = undefined;
  vi.clearAllMocks();
  await expect(openMediaSession(session)).rejects.toThrow();
  expect(launchLinuxDesktopEntry).not.toHaveBeenCalled();
});

it('uses the same owner tray when Raise fails', async () => {
  const raise = vi.fn(() => {
    throw new Error('Raise unsupported');
  });
  const { session, activate } = await fallbackPlayer(
    { Identity: 'Fixture', DesktopEntry: 'fixture-player', CanRaise: true },
    raise,
  );
  await openMediaSession(session);
  expect(raise).toHaveBeenCalledTimes(1);
  expect(activate).toHaveBeenCalledWith(
    0,
    0,
    expect.objectContaining({ destination: session.id.split('|')[0] }),
  );
  expect(launchLinuxDesktopEntry).not.toHaveBeenCalled();
});

it('reports unavailable activation rather than starting another application', async () => {
  const { session } = await fallbackPlayer({ Identity: 'Unknown', CanRaise: false }, vi.fn(), null);
  await expect(openMediaSession(session)).rejects.toThrow();
  expect(launchLinuxDesktopEntry).not.toHaveBeenCalled();
});

it('does not redirect an expired session to a replacement player owner', async () => {
  const { session } = await fallbackPlayer({ Identity: 'Folia', CanRaise: false });
  await player!.close();
  player = dbus.createClient({ busAddress: fixture!.address, timeout: 2000 });
  player.on('error', () => {});
  const activate = vi.fn();
  player.exportInterface({ Activate: activate }, '/StatusNotifierItem', {
    name: 'org.kde.StatusNotifierItem',
    methods: { Activate: ['ii', '', ['x', 'y'], []] },
  });
  await player.invokeDbus({
    member: 'RequestName',
    signature: 'su',
    body: ['org.mpris.MediaPlayer2.chromium.instance123', 0],
  });
  await expect(openMediaSession(session)).rejects.toThrow();
  expect(activate).not.toHaveBeenCalled();
  expect(launchLinuxDesktopEntry).not.toHaveBeenCalled();
});

it('publishes property, arrival and departure events without waiting for a polling interval', async () => {
  await fallbackPlayer({ Identity: 'Event fixture' });
  const changed = vi.fn();
  const unsubscribe = subscribe(changed);
  changed.mockClear();
  player!.sendSignal(
    '/org/mpris/MediaPlayer2',
    'org.freedesktop.DBus.Properties',
    'PropertiesChanged',
    'sa{sv}as',
    ['org.mpris.MediaPlayer2.Player', { PlaybackStatus: new dbus.Variant('s', 'Paused') }, []],
  );
  await vi.waitFor(() => expect(changed).toHaveBeenCalledTimes(1));
  expect((await getMediaSessions()).sessions[0].state).toBe('paused');
  await player!.invokeDbus({
    member: 'RequestName',
    signature: 'su',
    body: ['org.mpris.MediaPlayer2.second', 0],
  });
  await vi.waitFor(() => expect(changed).toHaveBeenCalledTimes(2));
  await player!.invokeDbus({
    member: 'ReleaseName',
    signature: 's',
    body: ['org.mpris.MediaPlayer2.second'],
  });
  await vi.waitFor(() => expect(changed).toHaveBeenCalledTimes(3));
  unsubscribe();
  await player!.invokeDbus({
    member: 'RequestName',
    signature: 'su',
    body: ['org.mpris.MediaPlayer2.third', 0],
  });
  await new Promise((resolve) => setTimeout(resolve, 30));
  expect(changed).toHaveBeenCalledTimes(3);
});
