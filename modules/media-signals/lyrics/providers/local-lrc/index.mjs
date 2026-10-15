import { lyricDocument } from '../../model.mjs';
/** Standard line LRC; deliberately does not invent word timestamps. */
export function parseLrc(
  text,
  { provider = 'local-lrc', duration = 0, association = 'manual', reference = null } = {},
) {
  if (typeof text !== 'string' || text.length > 2 * 1024 * 1024)
    throw new Error('Invalid LRC text');
  const lines = [],
    plain = [];
  let offsetSeconds = 0,
    title = null,
    artist = null;
  for (const row of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const tag = row.match(/^\[([a-z][\w-]*):([^\]]*)\]\s*$/i);
    if (tag) {
      const key = tag[1].toLowerCase();
      if (key === 'offset' && Number.isFinite(Number(tag[2])))
        offsetSeconds = -Number(tag[2]) / 1000;
      if (key === 'ti') title = tag[2];
      if (key === 'ar') artist = tag[2];
      continue;
    }
    const pattern = /\[(\d{1,4}):([0-5]?\d(?:\.\d{1,3})?)\]/g,
      stamps = [...row.matchAll(pattern)];
    if (!stamps.length) {
      plain.push(row);
      continue;
    }
    const value = row.replace(pattern, '').trim();
    for (const stamp of stamps)
      lines.push({
        text: value,
        start: Number(stamp[1]) * 60 + Number(stamp[2]),
        end: 0,
        words: [],
        translation: '',
      });
  }
  lines.sort((a, b) => a.start - b.start);
  for (let i = 0; i < lines.length; i++)
    lines[i].end = Math.max(lines[i].start, lines[i + 1]?.start ?? duration);
  return lyricDocument({
    kind: lines.length ? 'line-timed' : 'plain',
    text: lines.length ? '' : plain.join('\n'),
    lines,
    title,
    artist,
    offsetSeconds,
    source: { provider, association, reference },
  });
}
