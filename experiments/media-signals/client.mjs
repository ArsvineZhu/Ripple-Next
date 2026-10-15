import { lyricAt, positionAt } from '/core/timeline.mjs';
import { FrameDecoder } from '/core/frame.mjs';
const elements = new Map();
const $ = (id) => {
  if (!elements.has(id)) elements.set(id, document.getElementById(id));
  return elements.get(id);
};
const text = (id, value) => {
  const element = $(id);
  if (element.textContent !== value) element.textContent = value;
};
let state = {},
  audio = null,
  anchor = null,
  received = 0,
  events,
  lyricsKey = '',
  lineKey = '',
  words = [],
  selectedSource = '',
  raf;
let audioAbort = null,
  audioConnecting = false,
  audioRetry;
const labels = {
  plain: 'Plain lyrics (untimed)',
  'line-timed': 'Line timing',
  'native-word-timed': 'Native word timing',
  'estimated-word-timed': 'Estimated word timing',
};
const smoothed = new Float32Array(64);
async function post(path, body = {}) {
  const response = await fetch('/api/' + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
}
function options(select, items, value, label) {
  const key = JSON.stringify(items.map((i) => [i.serial || i.id, label(i)]));
  if (select.dataset.key !== key) {
    select.replaceChildren(
      ...items.map((item) => {
        const option = document.createElement('option');
        option.value = item.serial || item.id;
        option.textContent = label(item);
        return option;
      }),
    );
    select.dataset.key = key;
  }
  if (value && items.some((i) => (i.serial || i.id) === value)) select.value = value;
}
function apply(next) {
  state = next = {
    ...next,
    lyrics:
      next.lyrics === undefined
        ? next.playerKey === state.playerKey
          ? state.lyrics
          : null
        : next.lyrics,
  };
  const p = next.player;
  if (p) {
    anchor = { ...p.anchor, at: performance.now() - p.anchor.ageMs };
    $('title').textContent = p.title || p.identity;
    $('artist').textContent = [p.artist, p.album].filter(Boolean).join(' · ');
  } else {
    anchor = null;
    $('title').textContent = 'No player selected';
    $('artist').textContent = 'Start your music player';
  }
  options(
    $('source'),
    next.sources,
    next.capture.source?.serial ||
      selectedSource ||
      next.sources.find((s) => s.label.toLowerCase() === 'folia')?.serial,
    (s) => `${s.label} · ${s.kind === 'player' ? 'application only' : 'device mix'}`,
  );
  selectedSource = $('source').value;
  options(
    $('player'),
    next.players,
    next.selected,
    (p) => p.identity + (p.anchor.playing ? ' · playing' : ' · paused'),
  );
  $('capture').textContent = next.capture.active ? 'Stop capture' : 'Start capture';
  $('captureStatus').textContent = next.capture.active ? next.capture.format : 'Capture stopped';
  $('error').textContent = next.capture.error || '';
  $('lyricStatus').textContent = next.lyricStatus;
  $('lyricKind').textContent = labels[next.lyrics?.kind] || 'No lyrics';
  const key = p?.trackId + '|' + next.lyricVersion;
  if (key !== lyricsKey) {
    lyricsKey = key;
    lineKey = '';
  }
  if (next.meter.frames)
    $('stats').textContent =
      `FFT analysis ${(next.meter.analysisMs / next.meter.frames).toFixed(2)} ms avg · ${next.meter.maxAnalysisMs.toFixed(2)} ms max · ${next.meter.frames} frames · ${(next.meter.payloadBytes / Math.max(1, next.meter.captureSeconds) / 1024).toFixed(1)} audio KB/s · ${next.meter.slowFrames} slow-client skips`;
}
function connect() {
  events = new EventSource('/api/events');
  events.addEventListener('state', (event) => apply(JSON.parse(event.data)));
  events.addEventListener('lyrics', (event) => {
    const value = JSON.parse(event.data);
    if (value.trackKey !== state.playerKey) return;
    apply({
      ...state,
      lyrics: value.document,
      lyricStatus: value.status,
      lyricVersion: value.version,
    });
  });
  void readAudio();
  events.onopen = () => {
    $('connection').textContent = 'LOCAL PIPELINE CONNECTED';
    $('connection').className = 'live';
  };
  events.onerror = () => {
    $('connection').textContent = 'Reconnecting to local server…';
    $('connection').className = 'off';
  };
}
async function readAudio() {
  if (audioConnecting || document.hidden) return;
  audioConnecting = true;
  audioAbort = new AbortController();
  try {
    const response = await fetch('/api/audio', { signal: audioAbort.signal });
    if (!response.ok) throw new Error('Audio stream unavailable');
    const reader = response.body.getReader(),
      decoder = new FrameDecoder();
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      decoder.push(result.value, (frame) => {
        audio = frame;
        received = performance.now();
      });
    }
  } catch {
    /* reconnect only while the view is visible */
  } finally {
    audioConnecting = false;
    if (!document.hidden) audioRetry = setTimeout(() => void readAudio(), 1000);
  }
}
const db = (value) => `${(20 * Math.log10(Math.max(value, 1e-6))).toFixed(1)} dBFS`;
const time = (seconds) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
const canvases = new Map();
const resize = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const value = canvases.get(entry.target.id);
    if (value) {
      value.width = entry.contentRect.width;
      value.height = entry.contentRect.height;
    }
  }
});
function canvas(id) {
  const element = $(id),
    dpr = Math.min(devicePixelRatio || 1, 2);
  if (!canvases.has(id)) {
    canvases.set(id, {
      context: element.getContext('2d'),
      width: element.clientWidth,
      height: element.clientHeight,
    });
    resize.observe(element);
  }
  const value = canvases.get(id),
    { context, width, height } = value;
  if (element.width !== Math.round(width * dpr) || element.height !== Math.round(height * dpr)) {
    element.width = Math.round(width * dpr);
    element.height = Math.round(height * dpr);
  }
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);
  return value;
}
function showLine(index) {
  const lyrics = state.lyrics;
  if (lyrics?.kind === 'plain') {
    words = [];
    const key = 'plain|' + lyricsKey;
    if (lineKey !== key) {
      lineKey = key;
      const p = document.createElement('p');
      p.className = 'empty';
      p.style.whiteSpace = 'pre-wrap';
      p.textContent = lyrics.text;
      $('lyrics').replaceChildren(p);
    }
    return;
  }
  if (!lyrics?.lines.length) {
    words = [];
    const status = 'empty|' + state.lyricStatus;
    if (lineKey !== status) {
      lineKey = status;
      const p = document.createElement('p');
      p.className = 'empty';
      p.textContent = state.lyricStatus;
      $('lyrics').replaceChildren(p);
    }
    return;
  }
  if (index < 0) {
    words = [];
    if (lineKey !== 'before|' + lyricsKey) {
      lineKey = 'before|' + lyricsKey;
      const p = document.createElement('p');
      p.className = 'empty';
      p.textContent = 'Waiting for the first lyric line…';
      $('lyrics').replaceChildren(p);
    }
    return;
  }
  const key = lyricsKey + '|' + index;
  if (key === lineKey) return;
  lineKey = key;
  words = [];
  const elements = [index - 1, index, index + 1]
    .filter((i) => lyrics.lines[i])
    .map((i) => {
      const line = lyrics.lines[i],
        div = document.createElement('div');
      div.className = 'line ' + (i < index ? 'previous' : i > index ? 'next' : 'current');
      if (i === index && line.words.length)
        for (const word of line.words) {
          const span = document.createElement('span');
          span.className = 'word';
          span.textContent = word.text;
          div.append(span);
          words.push({ span, word });
        }
      else {
        div.textContent = line.text;
        if (i === index) div.style.color = '#d6fff1';
      }
      if (i === index && line.translation) {
        const p = document.createElement('p');
        p.className = 'translation';
        p.textContent = line.translation;
        div.append(p);
      }
      return div;
    });
  $('lyrics').replaceChildren(...elements);
}
function draw() {
  const active = state.capture?.active && performance.now() - received < 300;
  const s = canvas('spectrum'),
    c = s.context;
  c.strokeStyle = '#223340';
  c.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    const y = (i * s.height) / 4;
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(s.width, y);
    c.stroke();
  }
  const gap = 3,
    width = (s.width - gap * 63) / 64;
  for (let i = 0; i < 64; i++) {
    const target = active ? audio.spectrum[i] / 255 : 0;
    smoothed[i] += (target - smoothed[i]) * (target > smoothed[i] ? 0.7 : 0.13);
    const height = Math.max(2, smoothed[i] * (s.height - 6));
    c.fillStyle = `hsl(${155 + (i / 64) * 47} 49% ${55 + smoothed[i] * 15}%)`;
    c.fillRect(i * (width + gap), s.height - height, width, height);
  }
  const w = canvas('wave');
  for (let channel = 0; channel < 2; channel++) {
    const center = w.height * (channel ? 0.75 : 0.25);
    w.context.strokeStyle = '#263946';
    w.context.beginPath();
    w.context.moveTo(0, center);
    w.context.lineTo(w.width, center);
    w.context.stroke();
    w.context.strokeStyle = channel ? '#79bced' : '#9be2c9';
    w.context.lineWidth = 1.6;
    w.context.beginPath();
    if (active)
      for (let i = 0; i < audio.wave[channel].length; i++) {
        const [low, high] = audio.wave[channel][i],
          x = (i * w.width) / 128;
        w.context.moveTo(x, center - high * w.height * 0.22);
        w.context.lineTo(x, center - low * w.height * 0.22);
      }
    else {
      w.context.moveTo(0, center);
      w.context.lineTo(w.width, center);
    }
    w.context.stroke();
  }
  text('rms', active ? audio.rms.map(db).join(' / ') : '—');
  text('peak', active ? db(Math.max(...audio.peak)) : '—');
  text('dominant', active ? `${Math.round(audio.dominantHz)} Hz` : '—');
  const seconds = positionAt(anchor),
    current = lyricAt(state.lyrics, seconds);
  text('elapsed', time(seconds));
  text('duration', time(anchor?.duration || 0));
  $('progress').style.transform =
    `scaleX(${anchor?.duration ? Math.min(1, seconds / anchor.duration) : 0})`;
  showLine(current?.index ?? -1);
  for (const { span, word } of current ? words : []) {
    const fraction = (current.time - word.start) / Math.max(0.001, word.end - word.start);
    const fill = `${Math.round(Math.max(0, Math.min(1, fraction)) * 1000) / 10}%`;
    if (span.dataset.fill !== fill) {
      span.dataset.fill = fill;
      span.style.setProperty('--fill', fill);
    }
  }
  raf = requestAnimationFrame(draw);
}
async function guarded(action) {
  try {
    $('error').textContent = '';
    await action();
  } catch (error) {
    $('error').textContent = error.message;
  }
}
$('lrc').onchange = () =>
  guarded(async () => {
    const file = $('lrc').files[0];
    if (file) await post('lyrics', { text: await file.text() });
    $('lrc').value = '';
  });
$('automatic').onclick = () => guarded(() => post('lyrics', { text: null }));
$('refresh').onclick = () => guarded(() => post('refresh'));
$('capture').onclick = () =>
  guarded(() => post('capture', state.capture?.active ? {} : { source: $('source').value }));
$('source').onchange = () => {
  selectedSource = $('source').value;
  if (state.capture?.active) void guarded(() => post('capture', { source: selectedSource }));
};
$('player').onchange = () => guarded(() => post('player', { id: $('player').value }));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    cancelAnimationFrame(raf);
    events.close();
    clearTimeout(audioRetry);
    audioAbort?.abort();
  } else {
    connect();
    draw();
  }
});
window.addEventListener('pagehide', () => {
  events.close();
  clearTimeout(audioRetry);
  audioAbort?.abort();
});
connect();
draw();
