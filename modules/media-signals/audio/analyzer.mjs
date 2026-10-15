/** Bounded stereo PCM analysis. snapshot() views are borrowed until the next snapshot. */
export class SignalAnalyzer {
  constructor(size = 2048, rate = 48000) {
    if (!Number.isInteger(size) || size < 64 || size > 65536 || size & (size - 1))
      throw new Error('FFT size must be a power of two between 64 and 65536');
    if (!Number.isFinite(rate) || rate <= 0) throw new Error('Invalid sample rate');
    this.size = size;
    this.rate = rate;
    this.mask = size - 1;
    this.head = this.frames = 0;
    this.left = new Float64Array(size);
    this.right = new Float64Array(size);
    this.carry = Buffer.alloc(8);
    this.carryLength = 0;
    this.window = Float64Array.from(
      { length: size },
      (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1)),
    );
    this.gain = this.window.reduce((a, b) => a + b);
    this.reverse = new Uint32Array(size);
    for (let i = 1, j = 0; i < size; i++) {
      let bit = size >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      this.reverse[i] = j;
    }
    this.cos = Float64Array.from({ length: size / 2 }, (_, i) =>
      Math.cos((-2 * Math.PI * i) / size),
    );
    this.sin = Float64Array.from({ length: size / 2 }, (_, i) =>
      Math.sin((-2 * Math.PI * i) / size),
    );
    this.re = new Float64Array(size);
    this.im = new Float64Array(size);
    this.values = [new Float64Array(size), new Float64Array(size)];
    this.magnitude = new Float64Array(size / 2);
    this.power = new Float64Array(size / 2);
    this.bandRanges = Array.from({ length: 64 }, (_, i) => {
      const maximum = Math.min(18000, rate / 2),
        minimum = Math.min(25, maximum / 2);
      const lo = Math.max(
        1,
        Math.min(
          size / 2 - 1,
          Math.floor((minimum * (maximum / minimum) ** (i / 64) * size) / rate),
        ),
      );
      return [
        lo,
        Math.min(
          size / 2,
          Math.max(
            lo + 1,
            Math.ceil((minimum * (maximum / minimum) ** ((i + 1) / 64) * size) / rate),
          ),
        ),
      ];
    });
    const points = Math.min(128, size);
    this.result = {
      frames: 0,
      rate,
      fftSize: size,
      rms: [0, 0],
      peak: [0, 0],
      dominantHz: 0,
      spectrum: new Uint8Array(64),
      wave: [
        Array.from({ length: points }, () => [0, 0]),
        Array.from({ length: points }, () => [0, 0]),
      ],
    };
  }
  sample(bytes, offset) {
    const left = bytes.readFloatLE(offset),
      right = bytes.readFloatLE(offset + 4);
    this.left[this.head] = Number.isFinite(left) ? left : 0;
    this.right[this.head] = Number.isFinite(right) ? right : 0;
    this.head = (this.head + 1) & this.mask;
    this.frames++;
  }
  push(bytes) {
    let offset = 0;
    if (this.carryLength) {
      const count = Math.min(8 - this.carryLength, bytes.length);
      bytes.copy(this.carry, this.carryLength, 0, count);
      this.carryLength += count;
      offset = count;
      if (this.carryLength < 8) return;
      this.sample(this.carry, 0);
      this.carryLength = 0;
    }
    for (; offset + 8 <= bytes.length; offset += 8) this.sample(bytes, offset);
    this.carryLength = bytes.length - offset;
    if (this.carryLength) bytes.copy(this.carry, 0, offset);
  }
  channel(buffer, index = 0) {
    const values = this.values[index];
    let energy = 0,
      peak = 0;
    for (let i = 0; i < this.size; i++) {
      const value = buffer[(this.head + i) & this.mask];
      values[i] = value;
      energy += value * value;
      peak = Math.max(peak, Math.abs(value));
    }
    return { values, rms: Math.sqrt(energy / this.size), peak };
  }
  spectrum(values) {
    const n = this.size,
      re = this.re,
      im = this.im;
    let mean = 0;
    for (let i = 0; i < n; i++) mean += values[i];
    mean /= n;
    for (let i = 0; i < n; i++) {
      const j = this.reverse[i];
      re[j] = (values[i] - mean) * this.window[i];
      im[j] = 0;
    }
    for (let length = 2; length <= n; length *= 2) {
      const half = length / 2,
        stride = n / length;
      for (let start = 0; start < n; start += length)
        for (let j = 0; j < half; j++) {
          const a = start + j,
            b = a + half,
            k = j * stride;
          const br = re[b] * this.cos[k] - im[b] * this.sin[k],
            bi = re[b] * this.sin[k] + im[b] * this.cos[k];
          re[b] = re[a] - br;
          im[b] = im[a] - bi;
          re[a] += br;
          im[a] += bi;
        }
    }
    const scale = 2 / this.gain;
    for (let i = 0; i < n / 2; i++) this.magnitude[i] = Math.hypot(re[i], im[i]) * scale;
    return this.magnitude;
  }
  snapshot() {
    const r = this.result,
      n = this.size;
    for (let channel = 0; channel < 2; channel++) {
      const current = this.channel(channel ? this.right : this.left, channel),
        magnitude = this.spectrum(current.values);
      r.rms[channel] = current.rms;
      r.peak[channel] = current.peak;
      for (let i = 0; i < n / 2; i++) {
        const value = (magnitude[i] * magnitude[i]) / 2;
        this.power[i] = channel ? this.power[i] + value : value;
      }
      const wave = r.wave[channel];
      for (let i = 0; i < wave.length; i++) {
        const start = Math.floor((i * n) / wave.length),
          end = Math.floor(((i + 1) * n) / wave.length);
        let min = Infinity,
          max = -Infinity;
        for (let k = start; k < end; k++) {
          min = Math.min(min, current.values[k]);
          max = Math.max(max, current.values[k]);
        }
        wave[i][0] = min;
        wave[i][1] = max;
      }
    }
    let strongest = 1;
    for (let i = 2; i < n / 2; i++) if (this.power[i] > this.power[strongest]) strongest = i;
    r.frames = this.frames;
    r.dominantHz = this.power[strongest] > 1e-10 ? (strongest * this.rate) / n : 0;
    for (let i = 0; i < 64; i++) {
      const [lo, hi] = this.bandRanges[i];
      let max = 0;
      for (let k = lo; k < hi; k++) max = Math.max(max, this.power[k]);
      r.spectrum[i] = Math.round(
        Math.max(0, Math.min(1, (10 * Math.log10(Math.max(1e-12, max)) + 90) / 90)) * 255,
      );
    }
    return r;
  }
}
