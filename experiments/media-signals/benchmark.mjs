import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { SignalAnalyzer } from '../../modules/media-signals/audio/analyzer.mjs';
import { encodeFrame } from '../../modules/media-signals/audio/frame.mjs';
const pcm = Buffer.alloc(2048 * 8);
for (let i = 0; i < 2048; i++) {
  pcm.writeFloatLE(0.3 * Math.sin((2 * Math.PI * 1500 * i) / 48000), i * 8);
  pcm.writeFloatLE(0.2 * Math.sin((2 * Math.PI * 3000 * i) / 48000), i * 8 + 4);
}
const variants = [['optimized', SignalAnalyzer]];
const baseline = process.argv.indexOf('--baseline');
if (baseline !== -1)
  variants.unshift([
    'baseline',
    (await import(pathToFileURL(resolve(process.argv[baseline + 1])).href)).SignalAnalyzer,
  ]);
const report = {
  node: process.version,
  samples: 2048,
  sampleRate: 48000,
  warmup: 500,
  rounds: 5,
  iterationsPerRound: 1000,
  results: {},
};
for (const [name, Analyzer] of variants) {
  const a = new Analyzer();
  a.push(pcm);
  for (let i = 0; i < 500; i++) a.snapshot();
  const rounds = [];
  for (let round = 0; round < 5; round++) {
    const at = performance.now();
    for (let i = 0; i < 1000; i++) a.snapshot();
    rounds.push((performance.now() - at) / 1000);
  }
  const frame = a.snapshot();
  const bytes =
    name === 'baseline'
      ? Buffer.byteLength(JSON.stringify({ ...frame, sequence: 1, capturedAt: 1000 }))
      : encodeFrame(frame, 1, 1000).byteLength;
  report.results[name] = {
    analysisMedianMs: rounds.sort((a, b) => a - b)[2],
    analysisRoundMs: rounds,
    payloadBytes: bytes,
  };
}
console.log(JSON.stringify(report, null, 2));
