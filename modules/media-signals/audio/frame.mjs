/** Versioned, little-endian reduced analysis frames; never raw audio. */
export const FRAME_BYTES = 1152;
const MAGIC = 0x314c5052;
export function encodeFrame(frame, sequence, capturedAt = Date.now()) {
  if (frame.wave[0].length !== 128 || frame.wave[1].length !== 128 || frame.spectrum.length !== 64)
    throw new Error('Frame geometry must be 2 x 128 envelopes and 64 bands');
  const bytes = new Uint8Array(FRAME_BYTES),
    view = new DataView(bytes.buffer);
  view.setUint32(0, MAGIC, true);
  view.setUint16(4, FRAME_BYTES, true);
  view.setUint16(6, 1, true);
  view.setUint32(8, sequence >>> 0, true);
  view.setUint32(12, frame.rate, true);
  view.setFloat64(16, frame.frames, true);
  view.setFloat64(24, capturedAt, true);
  view.setUint32(32, frame.fftSize, true);
  view.setFloat32(36, frame.dominantHz, true);
  for (let i = 0; i < 2; i++) {
    view.setFloat32(40 + i * 4, frame.rms[i], true);
    view.setFloat32(48 + i * 4, frame.peak[i], true);
  }
  bytes.set(frame.spectrum, 64);
  let offset = 128;
  for (const channel of frame.wave)
    for (const [min, max] of channel)
      for (const value of [min, max]) {
        view.setInt16(offset, Math.round(Math.max(-1, Math.min(1, value)) * 32767), true);
        offset += 2;
      }
  return bytes;
}
export function decodeFrame(bytes) {
  if (bytes.byteLength !== FRAME_BYTES) throw new Error('Invalid analysis frame length');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (
    view.getUint32(0, true) !== MAGIC ||
    view.getUint16(4, true) !== FRAME_BYTES ||
    view.getUint16(6, true) !== 1
  )
    throw new Error('Unsupported analysis frame');
  let offset = 128;
  const wave = Array.from({ length: 2 }, () =>
    Array.from({ length: 128 }, () => {
      const pair = [view.getInt16(offset, true) / 32767, view.getInt16(offset + 2, true) / 32767];
      offset += 4;
      return pair;
    }),
  );
  return {
    sequence: view.getUint32(8, true),
    rate: view.getUint32(12, true),
    frames: view.getFloat64(16, true),
    capturedAt: view.getFloat64(24, true),
    fftSize: view.getUint32(32, true),
    dominantHz: view.getFloat32(36, true),
    rms: [view.getFloat32(40, true), view.getFloat32(44, true)],
    peak: [view.getFloat32(48, true), view.getFloat32(52, true)],
    spectrum: bytes.slice(64, 128),
    wave,
  };
}
export class FrameDecoder {
  constructor() {
    this.pending = new Uint8Array(FRAME_BYTES);
    this.length = 0;
  }
  push(chunk, accept) {
    let offset = 0;
    while (offset < chunk.length) {
      const count = Math.min(FRAME_BYTES - this.length, chunk.length - offset);
      this.pending.set(chunk.subarray(offset, offset + count), this.length);
      this.length += count;
      offset += count;
      if (this.length === FRAME_BYTES) {
        accept(decodeFrame(this.pending));
        this.length = 0;
      }
    }
  }
}
