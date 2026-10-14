import { afterEach, expect, it, vi } from 'vitest';
import dbus from 'dbus-native';
import { createDbusFixture } from './fixtures/dbus';
import * as media from '../../../src/main/platform/linux/media';
const artwork = vi.hoisted(() => vi.fn());
vi.mock('../../../src/main/services/imageFiles', () => ({ mediaArtworkUrl: artwork }));
let fixture: Awaited<ReturnType<typeof createDbusFixture>> | undefined;
let player: ReturnType<typeof dbus.createClient>;
afterEach(async () => {
  media.close();
  await fixture?.close();
  fixture = undefined;
  vi.unstubAllEnvs();
  artwork.mockReset();
});
it('publishes metadata before local artwork and discards obsolete A to B to A image generations', async () => {
  fixture = await createDbusFixture();
  vi.stubEnv('DBUS_SESSION_BUS_ADDRESS', fixture.address);
  player = fixture.client;
  const metadata = (title: string) => ({
    'xesam:title': new dbus.Variant('s', title),
    'mpris:artUrl': new dbus.Variant('s', 'file:///same-temporary-cover'),
  });
  player.exportInterface({ Identity: 'Fixture' }, '/org/mpris/MediaPlayer2', {
    name: 'org.mpris.MediaPlayer2',
    properties: { Identity: 's' },
  });
  player.exportInterface(
    { PlaybackStatus: 'Playing', Metadata: metadata('A') },
    '/org/mpris/MediaPlayer2',
    {
      name: 'org.mpris.MediaPlayer2.Player',
      properties: { PlaybackStatus: 's', Metadata: 'a{sv}' },
    },
  );
  await player.invokeDbus({
    member: 'RequestName',
    signature: 'su',
    body: ['org.mpris.MediaPlayer2.fixture', 0],
  });
  const finish: ((url: string) => void)[] = [];
  artwork.mockImplementation(() => new Promise<string>((resolve) => finish.push(resolve)));
  const unsubscribe = media.subscribe(() => {});
  await vi.waitFor(async () =>
    expect((await media.getMediaSessions()).sessions[0]?.name).toBe('A'),
  );
  expect((await media.getMediaSessions()).sessions[0].artworkUrl).toBeNull();
  expect(finish).toHaveLength(1);
  const update = async (title: string) => {
    player.sendSignal(
      '/org/mpris/MediaPlayer2',
      'org.freedesktop.DBus.Properties',
      'PropertiesChanged',
      'sa{sv}as',
      [
        'org.mpris.MediaPlayer2.Player',
        { Metadata: new dbus.Variant('a{sv}', metadata(title)) },
        [],
      ],
    );
    await vi.waitFor(async () =>
      expect((await media.getMediaSessions()).sessions[0].name).toBe(title),
    );
  };
  await update('B');
  await update('A');
  expect(finish).toHaveLength(3);
  finish[1]('old-B');
  finish[0]('old-A');
  await Promise.resolve();
  expect((await media.getMediaSessions()).sessions[0].artworkUrl).toBeNull();
  finish[2]('current-A');
  await vi.waitFor(async () =>
    expect((await media.getMediaSessions()).sessions[0].artworkUrl).toBe('current-A'),
  );
  unsubscribe();
});
