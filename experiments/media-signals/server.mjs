import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { SignalAnalyzer } from '../../modules/media-signals/audio/analyzer.mjs';
import { encodeFrame, FRAME_BYTES } from '../../modules/media-signals/audio/frame.mjs';
import {
  audioSources,
  PlayerObserver,
  captureOutput,
} from '../../modules/media-signals/platform/linux/index.mjs';
import { trackKey } from '../../modules/media-signals/lyrics/model.mjs';
import {
  supports as supportsFolia,
  fetchFolia,
} from '../../modules/media-signals/lyrics/providers/folia/index.mjs';
import { parseLrc } from '../../modules/media-signals/lyrics/providers/local-lrc/index.mjs';
import { fromMpris } from '../../modules/media-signals/lyrics/providers/mpris/index.mjs';

if (process.platform !== 'linux')
  throw new Error(
    'This capture prototype requires Linux/PipeWire. See the research notes for other platforms.',
  );
const clients = new Set(),
  audioClients = new Set();
let localLyrics = null,
  lyricVersion = 0;
let sources = [],
  lyrics = null,
  lyricStatus = 'waiting',
  lyricHash = '',
  lyricRequest = false,
  lyricTrack = '',
  origin = '',
  capture = { active: false },
  child,
  analyzer,
  timer,
  generation = 0,
  sequence = 0,
  slowFrames = 0,
  lastFrames = 0;
const started = performance.now();
const meter = { frames: 0, analysisMs: 0, maxAnalysisMs: 0, payloadBytes: 0, captureSeconds: 0 };
const player = new PlayerObserver(() => {
  publish();
  void refreshLyrics();
});
const currentPlayer = () => player.players.find((p) => p.id === player.selected);
function send(res, type, data) {
  if (res.destroyed || res.writableLength > 65536) {
    slowFrames++;
    return;
  }
  res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
}
function state() {
  const selected = currentPlayer();
  const publicPlayer = (p) => ({
    ...p,
    inlineLyrics: undefined,
    anchor: { ...p.anchor, at: undefined, ageMs: Math.max(0, performance.now() - p.anchor.at) },
  });
  return {
    players: player.players.map(publicPlayer),
    selected: player.selected,
    playerKey: trackKey(selected),
    player: selected ? publicPlayer(selected) : null,
    sources,
    capture,
    lyrics,
    lyricVersion,
    lyricStatus,
    meter: {
      ...meter,
      captureSeconds: capture.active ? (Date.now() - capture.started) / 1000 : meter.captureSeconds,
      slowFrames,
      uptime: (performance.now() - started) / 1000,
    },
  };
}
function publish() {
  if (clients.size) {
    const snapshot = { ...state(), lyrics: undefined };
    for (const res of clients) send(res, 'state', snapshot);
  }
}
function stopCapture() {
  if (capture.active) meter.captureSeconds = (Date.now() - capture.started) / 1000;
  generation++;
  clearInterval(timer);
  timer = undefined;
  const old = child;
  child = undefined;
  old?.close();
  analyzer = undefined;
  capture = { active: false };
  publish();
}
async function startCapture(serial) {
  stopCapture();
  const version = generation;
  sources = await audioSources();
  if (generation !== version) return;
  const source = sources.find((s) => s.serial === serial);
  if (!source) throw new Error('Output source disappeared; refresh sources and choose again.');
  if (!clients.size) throw new Error('Open the local page before capturing.');
  Object.assign(meter, {
    frames: 0,
    analysisMs: 0,
    maxAnalysisMs: 0,
    payloadBytes: 0,
    captureSeconds: 0,
  });
  analyzer = new SignalAnalyzer();
  lastFrames = 0;
  capture = {
    active: true,
    source,
    samples: 0,
    format: 'stereo f32le / 48 kHz',
    started: Date.now(),
  };
  child = captureOutput(source, {
    onPCM: (bytes) => {
      if (generation === version) analyzer?.push(bytes);
    },
    onEnded: (reason) => {
      if (generation !== version) return;
      stopCapture();
      capture = { active: false, error: reason };
      publish();
    },
  });
  timer = setInterval(
    () => {
      if (!analyzer || analyzer.frames === lastFrames) return;
      lastFrames = analyzer.frames;
      const t = performance.now(),
        frame = analyzer.snapshot(),
        elapsed = performance.now() - t;
      meter.frames++;
      meter.analysisMs += elapsed;
      meter.maxAnalysisMs = Math.max(meter.maxAnalysisMs, elapsed);
      capture.samples = frame.frames;
      const packet = encodeFrame(frame, ++sequence);
      meter.payloadBytes += packet.byteLength;
      for (const res of audioClients) {
        if (res.destroyed || res.writableLength > 8 * FRAME_BYTES) {
          slowFrames++;
          continue;
        }
        res.write(packet);
      }
    },
    Math.ceil(1000 / 30),
  );
  publish();
}
function setLyrics(document, status, revision) {
  if (lyricHash === revision && lyricStatus === status) return;
  lyrics = document;
  lyricStatus = status;
  lyricHash = revision;
  lyricVersion++;
  for (const res of clients)
    send(res, 'lyrics', { document, status, version: lyricVersion, trackKey: lyricTrack });
}
async function refreshLyrics() {
  if (!clients.size) return;
  const selected = currentPlayer(),
    key = trackKey(selected);
  if (key !== lyricTrack) {
    lyricTrack = key;
    localLyrics = null;
    setLyrics(null, 'Loading lyrics', 'track:' + key);
  }
  if (localLyrics) return;
  if (!supportsFolia(selected)) {
    const document = fromMpris(selected);
    setLyrics(
      document,
      document ? 'Player metadata' : 'No lyrics exported; load a local LRC file',
      'mpris:' + key + '|' + (selected?.inlineLyrics || ''),
    );
    return;
  }
  if (lyricRequest) return;
  lyricRequest = true;
  try {
    const { document, revision } = await fetchFolia({ signal: AbortSignal.timeout(1500) });
    if (trackKey(currentPlayer()) !== key || localLyrics) return;
    const titleMatches =
      !document?.title || document.title.toLowerCase() === selected.title.toLowerCase();
    const status = !document
      ? 'No lyrics loaded'
      : !titleMatches
        ? 'Folia title differs; hidden'
        : document.title
          ? 'Folia local API · title matched'
          : 'Folia local API · track identity not supplied';
    setLyrics(titleMatches ? document : null, status, revision);
  } catch (error) {
    if (trackKey(currentPlayer()) === key && !localLyrics)
      setLyrics(null, error.message, 'error:' + key);
  } finally {
    lyricRequest = false;
  }
}
const files = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/client.mjs': ['client.mjs', 'text/javascript'],
  '/core/timeline.mjs': ['../../modules/media-signals/lyrics/timeline.mjs', 'text/javascript'],
  '/core/frame.mjs': ['../../modules/media-signals/audio/frame.mjs', 'text/javascript'],
};
const server = http.createServer(async (req, res) => {
  try {
    if (
      req.headers.host !== new URL(origin).host ||
      (req.headers.origin && req.headers.origin !== origin)
    ) {
      res.writeHead(403).end();
      return;
    }
    const pathname = new URL(req.url, origin).pathname;
    if (req.method === 'GET' && files[pathname]) {
      res.writeHead(200, {
        'Content-Type': files[pathname][1],
        'Cache-Control': 'no-store',
        'Content-Security-Policy':
          "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'",
      });
      res.end(await readFile(new URL(files[pathname][0], import.meta.url)));
      return;
    }
    if (req.method === 'GET' && pathname === '/api/state') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(state()));
      return;
    }
    if (req.method === 'GET' && pathname === '/api/audio') {
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      res.flushHeaders();
      audioClients.add(res);
      res.on('close', () => audioClients.delete(res));
      return;
    }
    if (req.method === 'GET' && pathname === '/api/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-store',
        Connection: 'keep-alive',
      });
      clients.add(res);
      send(res, 'state', state());
      void player.refresh();
      void refreshLyrics();
      res.on('close', () => {
        clients.delete(res);
        if (!clients.size) stopCapture();
      });
      return;
    }
    if (req.method === 'POST' && req.headers['content-type'] === 'application/json') {
      req.setEncoding('utf8');
      let text = '',
        bytes = 0;
      for await (const chunk of req) {
        text += chunk;
        bytes += Buffer.byteLength(chunk);
        if (bytes > (pathname === '/api/lyrics' ? 2 * 1024 * 1024 : 4096))
          throw new Error('Request too large');
      }
      const body = JSON.parse(text || '{}');
      if (pathname === '/api/capture') {
        if (body.source) await startCapture(String(body.source));
        else stopCapture();
      } else if (pathname === '/api/player') {
        if (!player.players.some((p) => p.id === body.id)) throw new Error('Player disappeared');
        player.selected = body.id;
        await player.syncPosition();
        await refreshLyrics();
      } else if (pathname === '/api/lyrics') {
        if (body.text === null) {
          localLyrics = null;
          lyricHash = '';
          await refreshLyrics();
        } else {
          const selected = currentPlayer();
          if (!selected) throw new Error('Select a player before loading local lyrics');
          localLyrics = parseLrc(body.text, {
            duration: selected.anchor.duration,
            reference: trackKey(selected),
          });
          lyricTrack = trackKey(selected);
          setLyrics(
            localLyrics,
            'Local LRC · explicitly assigned to selected track',
            'local:' + lyricVersion,
          );
        }
      } else if (pathname === '/api/refresh') {
        sources = await audioSources();
        await player.refresh();
      } else {
        res.writeHead(404).end();
        return;
      }
      publish();
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ ok: true }));
      return;
    }
    res.writeHead(404).end();
  } catch (e) {
    if (!res.headersSent) res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
});
const lyricTimer = setInterval(() => void refreshLyrics(), 1000);
const positionTimer = setInterval(() => {
  if (clients.size) void player.syncPosition();
}, 5000);
const heartbeat = setInterval(() => {
  for (const res of clients) res.write(': heartbeat\n\n');
}, 15000);
let closing = false;
function close() {
  if (closing) return;
  closing = true;
  clearInterval(lyricTimer);
  clearInterval(positionTimer);
  clearInterval(heartbeat);
  stopCapture();
  player.close();
  for (const res of [...clients, ...audioClients]) res.end();
  server.close();
}
process.once('SIGINT', close);
process.once('SIGTERM', close);
sources = await audioSources();
server.listen(Number(process.env.RIPPLE_LAB_PORT || 0), '127.0.0.1', () => {
  origin = `http://127.0.0.1:${server.address().port}`;
  console.log(
    JSON.stringify({
      url: origin,
      pid: process.pid,
      directory: fileURLToPath(new URL('.', import.meta.url)),
    }),
  );
  void player.start();
});
