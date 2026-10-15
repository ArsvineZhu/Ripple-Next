import { lyricDocument } from '../../model.mjs';
export function supports(player) {
  return player?.identity?.trim().toLowerCase() === 'folia';
}
export function normalizeFolia(input) {
  if (input === null) return null;
  if (!input || !Array.isArray(input.lines) || !Number.isFinite(input.offset))
    throw new Error('Invalid Folia lyric snapshot');
  const interval = (word) => ({ text: word.text, start: word.startTime, end: word.endTime });
  return lyricDocument({
    kind: input.wordByWord === true ? 'native-word-timed' : 'estimated-word-timed',
    offsetSeconds: input.offset / 1000,
    title: typeof input.title === 'string' ? input.title : null,
    artist: typeof input.artist === 'string' ? input.artist : null,
    source: { provider: 'folia', association: input.title ? 'title-only' : 'unverified' },
    lines: input.lines.map((line) => ({
      ...interval(line),
      translation: typeof line.translation === 'string' ? line.translation : '',
      words: (line.words ?? []).map(interval),
    })),
  });
}
export async function fetchFolia({ signal, fetchImpl = fetch } = {}) {
  const response = await fetchImpl('http://127.0.0.1:32109/v1/lyric', {
    signal,
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Folia lyrics HTTP ${response.status}`);
  const wire = await response.text();
  if (wire.length > 2 * 1024 * 1024) throw new Error('Folia lyrics response too large');
  return { document: normalizeFolia(JSON.parse(wire)), revision: wire };
}
