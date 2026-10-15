import dbus from 'dbus-native';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
const execute = promisify(execFile);
const path = '/org/mpris/MediaPlayer2',
  playerInterface = 'org.mpris.MediaPlayer2.Player';
export async function audioSources() {
  const { stdout } = await execute('pw-dump', [], { maxBuffer: 8 * 1024 * 1024, timeout: 3000 });
  return JSON.parse(stdout)
    .filter((object) => object.type === 'PipeWire:Interface:Node')
    .flatMap((object) => {
      const p = object.info?.props ?? {};
      if (
        !['Audio/Sink', 'Stream/Output/Audio'].includes(p['media.class']) ||
        String(p['node.name']).startsWith('RippleSignalLab')
      )
        return [];
      return [
        {
          serial: String(p['object.serial']),
          name: p['node.name'],
          label: p['application.name'] || p['node.description'] || p['node.name'],
          kind: p['media.class'] === 'Audio/Sink' ? 'device' : 'player',
          state: object.info?.state,
        },
      ];
    });
}
export class PlayerObserver {
  constructor(changed) {
    this.changed = changed;
    this.players = [];
    this.bus = null;
    this.stopped = false;
    this.selected = null;
    this.pending = false;
    this.dirty = false;
    this.failures = 0;
  }
  async start() {
    if (this.stopped) return;
    const bus = dbus.sessionBus({ timeout: 2000, maxMessageSize: 2 * 1024 * 1024 });
    this.bus = bus;
    const lost = () => {
      if (this.bus !== bus || this.stopped) return;
      this.bus = null;
      bus.close();
      this.players = [];
      this.changed();
      this.retry = setTimeout(() => void this.start(), Math.min(10000, 500 * 2 ** this.failures++));
    };
    bus.on('error', lost);
    bus.connection.on('close', lost);
    bus.connection.on('message', (message) => {
      if (message.type !== 4) return;
      if (
        message.interface === 'org.freedesktop.DBus' ||
        this.players.some((p) => p.owner === message.sender)
      )
        void this.refresh();
    });
    try {
      await Promise.all(
        [
          "type='signal',interface='org.freedesktop.DBus',member='NameOwnerChanged',arg0namespace='org.mpris.MediaPlayer2'",
          "type='signal',interface='org.freedesktop.DBus.Properties',member='PropertiesChanged',path='/org/mpris/MediaPlayer2'",
          "type='signal',interface='org.mpris.MediaPlayer2.Player',member='Seeked',path='/org/mpris/MediaPlayer2'",
        ].map((rule) => bus.addMatch(rule)),
      );
      this.failures = 0;
      await this.refresh();
    } catch {
      lost();
    }
  }
  async refresh() {
    this.dirty = true;
    if (this.pending || !this.bus || this.stopped) return;
    this.pending = true;
    const bus = this.bus;
    try {
      do {
        this.dirty = false;
        const names = (await bus.invokeDbus({ member: 'ListNames' })).filter((name) =>
          name.startsWith('org.mpris.MediaPlayer2.'),
        );
        const players = (
          await Promise.all(
            names.map(async (name) => {
              try {
                const owner = await bus.invokeDbus({
                  member: 'GetNameOwner',
                  signature: 's',
                  body: [name],
                });
                const at = performance.now();
                const [identity, properties] = await Promise.all(
                  ['org.mpris.MediaPlayer2', playerInterface].map((iface) =>
                    bus.invoke({
                      destination: owner,
                      path,
                      interface: 'org.freedesktop.DBus.Properties',
                      member: 'GetAll',
                      signature: 's',
                      body: [iface],
                    }),
                  ),
                );
                const m = properties.Metadata ?? {};
                return {
                  id: owner + '|' + name,
                  owner,
                  name,
                  identity: identity.Identity || name,
                  title: m['xesam:title'] || '',
                  artist: (m['xesam:artist'] || []).join(', '),
                  album: m['xesam:album'] || '',
                  trackId: String(m['mpris:trackid'] || ''),
                  inlineLyrics: typeof m['xesam:asText'] === 'string' ? m['xesam:asText'] : null,
                  anchor: {
                    position: Number(properties.Position || 0) / 1e6,
                    duration: Number(m['mpris:length'] || 0) / 1e6,
                    rate: Number(properties.Rate || 1),
                    playing: properties.PlaybackStatus === 'Playing',
                    at: (at + performance.now()) / 2,
                  },
                };
              } catch {
                return null;
              }
            }),
          )
        ).filter(Boolean);
        if (this.bus !== bus || this.stopped) return;
        this.players = players;
        if (!players.some((p) => p.id === this.selected))
          this.selected =
            (
              players.find((p) => p.identity.toLowerCase() === 'folia') ||
              players.find((p) => p.anchor.playing) ||
              players[0]
            )?.id ?? null;
        this.changed();
      } while (this.dirty && this.bus === bus);
    } catch {
      /* A vanished player is removed by the next owner event. */
    } finally {
      this.pending = false;
    }
  }
  async syncPosition() {
    const player = this.players.find((p) => p.id === this.selected),
      bus = this.bus;
    if (!player || !bus || this.syncing) return;
    this.syncing = true;
    try {
      const at = performance.now();
      const position = await bus.invoke({
        destination: player.owner,
        path,
        interface: 'org.freedesktop.DBus.Properties',
        member: 'Get',
        signature: 'ss',
        body: [playerInterface, 'Position'],
      });
      if (this.bus === bus && this.players.includes(player)) {
        player.anchor = {
          ...player.anchor,
          position: Number(position) / 1e6,
          at: (at + performance.now()) / 2,
        };
        this.changed();
      }
    } catch {
      /* Stale session; owner changes reconcile discovery. */
    } finally {
      this.syncing = false;
    }
  }
  close() {
    this.stopped = true;
    clearTimeout(this.retry);
    this.bus?.close();
    this.bus = null;
  }
}

/** source is an output descriptor from audioSources(); no default-input fallback. */
export function captureOutput(source, { onPCM, onEnded }) {
  if (!['player', 'device'].includes(source?.kind) || !/^\d+$/.test(source.serial))
    throw new Error('An explicit output source is required');
  const child = spawn(
    'pw-cat',
    [
      '--record',
      '--raw',
      '--format',
      'f32',
      '--rate',
      '48000',
      '--channels',
      '2',
      '--latency',
      '512',
      '--target',
      source.serial,
      '--properties',
      JSON.stringify({
        'stream.capture.sink': true,
        'stream.dont-remix': true,
        'node.name': `RippleSignalLab-${process.pid}`,
        'node.description': 'Ripple media research',
        'node.passive': true,
        'node.dont-fallback': true,
        'node.dont-reconnect': true,
      }),
      '-',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
  let closed = false,
    error = '';
  const ended = (reason) => {
    if (closed) return;
    closed = true;
    child.kill();
    onEnded(reason);
  };
  child.stdout.on('data', (bytes) => {
    if (!closed) onPCM(bytes);
  });
  child.stderr.on('data', (bytes) => {
    error = (error + bytes.toString()).slice(-500);
  });
  child.on('error', (e) => ended(e.message));
  child.on('exit', (code) =>
    ended(error.trim() || `Capture ended (${code}); source may have disconnected.`),
  );
  return {
    pid: child.pid,
    close() {
      if (!closed) {
        closed = true;
        child.kill();
      }
    },
  };
}
