import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SignalAnalyzer } from '../../../modules/media-signals/audio/analyzer.mjs';
import { normalizeFolia as normalizeLyrics } from '../../../modules/media-signals/lyrics/providers/folia/index.mjs';
import { lyricAt, positionAt } from '../../../modules/media-signals/lyrics/timeline.mjs';

test('PCM frame boundaries, FFT frequency and stereo anti-phase retain known calibration', () => {
  const n = 2048,
    rate = 48000,
    bytes = Buffer.alloc(n * 8);
  for (let i = 0; i < n; i++) {
    const value = 0.25 * Math.sin((2 * Math.PI * 1500 * i) / rate);
    bytes.writeFloatLE(value, i * 8);
    bytes.writeFloatLE(-value, i * 8 + 4);
  }
  const a = new SignalAnalyzer(n, rate);
  for (let i = 0; i < bytes.length; i += 13) a.push(bytes.subarray(i, i + 13));
  const result = a.snapshot();
  assert.equal(result.frames, n);
  assert.equal(a.carryLength, 0);
  assert.equal(result.dominantHz, 1500);
  assert.ok(Math.abs(result.rms[0] - 0.25 / Math.sqrt(2)) < 1e-7);
  assert.ok(Math.abs(result.peak[1] - 0.25) < 1e-7);
  assert.ok(Math.abs(a.spectrum(a.channel(a.left).values)[64] - 0.25) < 0.0001);
  assert.deepEqual(result.wave[0][0], result.wave[1][0].map((x) => -x).reverse());
});
test('silence, non-finite PCM and wraparound stay bounded', () => {
  const a = new SignalAnalyzer(64),
    bytes = Buffer.alloc(1024);
  bytes.writeFloatLE(Infinity, 0);
  bytes.writeFloatLE(NaN, 4);
  a.push(bytes);
  const result = a.snapshot();
  assert.deepEqual(result.rms, [0, 0]);
  assert.equal(result.dominantHz, 0);
  assert.ok(result.spectrum.every((bin) => bin === 0));
  assert.ok(result.wave.flat(2).every(Number.isFinite));
  assert.equal(a.left.length, 64);
  assert.equal(a.frames, 128);
  assert.throws(() => new SignalAnalyzer(65));
  assert.throws(() => new SignalAnalyzer(64.1));
});
test('Folia offsets use milliseconds while line and word timing uses seconds', () => {
  const lyrics = normalizeLyrics({
    offset: 250,
    wordByWord: true,
    lines: [
      {
        text: 'Original demo words',
        startTime: 2,
        endTime: 4,
        translation: '原创测试文字',
        words: [
          { text: 'Original ', startTime: 2, endTime: 3 },
          { text: 'demo words', startTime: 3, endTime: 4 },
        ],
      },
    ],
  });
  assert.equal(lyricAt(lyrics, 2.24), null);
  assert.equal(lyricAt(lyrics, 2.25).word, 0);
  assert.equal(lyricAt(lyrics, 3.25).word, 1);
  assert.equal(lyricAt(lyrics, 8).inGap, true);
  lyrics.offsetSeconds = -0.25;
  assert.equal(lyricAt(lyrics, 1.75).word, 0);
  assert.equal(lyricAt(lyrics, 0), null);
  assert.equal(normalizeLyrics(null), null);
  assert.throws(() =>
    normalizeLyrics({ offset: 0, lines: [{ text: 'bad', startTime: 4, endTime: 2 }] }),
  );
});
test('timeline extrapolates playing/rate but freezes pause and clamps track ends', () => {
  const anchor = { position: 4, duration: 10, playing: true, rate: 2, at: 1000 };
  assert.equal(positionAt(anchor, 2000), 6);
  assert.equal(positionAt({ ...anchor, playing: false }, 2000), 4);
  assert.equal(positionAt(anchor, 10000), 10);
  assert.equal(positionAt({ ...anchor, position: 1 }, 500), 1);
  assert.equal(positionAt(null), 0);
});
