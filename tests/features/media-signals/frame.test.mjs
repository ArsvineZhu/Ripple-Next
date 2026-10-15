import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SignalAnalyzer } from '../../../modules/media-signals/audio/analyzer.mjs';
import {
  encodeFrame,
  decodeFrame,
  FrameDecoder,
  FRAME_BYTES,
} from '../../../modules/media-signals/audio/frame.mjs';

test('binary analysis preserves meters, envelope tolerance and fragmented frame boundaries', () => {
  const analyzer = new SignalAnalyzer(),
    pcm = Buffer.alloc(2048 * 8);
  for (let i = 0; i < 2048; i++) {
    pcm.writeFloatLE(0.23 * Math.sin(i / 11), i * 8);
    pcm.writeFloatLE(-0.37 * Math.sin(i / 11), i * 8 + 4);
  }
  analyzer.push(pcm);
  const original = analyzer.snapshot(),
    first = encodeFrame(original, 42, 12345),
    second = encodeFrame(original, 43, 12346);
  assert.equal(first.length, FRAME_BYTES);
  const wire = new Uint8Array(FRAME_BYTES * 2);
  wire.set(first);
  wire.set(second, FRAME_BYTES);
  const decoder = new FrameDecoder(),
    result = [];
  for (let i = 0; i < wire.length; i += 17)
    decoder.push(wire.subarray(i, i + 17), (frame) => result.push(frame));
  assert.deepEqual(
    result.map((r) => r.sequence),
    [42, 43],
  );
  assert.equal(decoder.length, 0);
  assert.equal(result[0].capturedAt, 12345);
  assert.equal(result[0].frames, 2048);
  assert.ok(Math.abs(result[0].rms[0] - original.rms[0]) < 1e-7);
  assert.deepEqual([...result[0].spectrum], [...original.spectrum]);
  for (let c = 0; c < 2; c++)
    for (let i = 0; i < 128; i++)
      for (let j = 0; j < 2; j++)
        assert.ok(Math.abs(result[0].wave[c][i][j] - original.wave[c][i][j]) <= 1 / 32767);
});
test('invalid frames reject and waveform clipping does not hide actual over-range peak', () => {
  const a = new SignalAnalyzer(),
    frame = a.snapshot();
  frame.wave[0][0] = [-2, 2];
  frame.peak[0] = 2;
  const bytes = encodeFrame(frame, 1);
  const decoded = decodeFrame(bytes);
  assert.deepEqual(decoded.wave[0][0], [-1, 1]);
  assert.equal(decoded.peak[0], 2);
  assert.throws(() => decodeFrame(bytes.subarray(1)));
  bytes[0] ^= 255;
  assert.throws(() => decodeFrame(bytes));
});
