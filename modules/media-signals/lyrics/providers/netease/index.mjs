import { parseLrc } from '../local-lrc/index.mjs';
/** Explicit song ID only. This consumer endpoint is undocumented and optional. */
export async function fetchNetease(id, { signal, fetchImpl = fetch, duration = 0 } = {}) {
  const reference = String(id);
  if (!/^[1-9]\d{0,18}$/.test(reference)) throw new Error('A numeric NetEase song ID is required');
  const url = new URL('https://music.163.com/api/song/lyric');
  url.search = new URLSearchParams({ id: reference, lv: '-1', kv: '-1', tv: '-1' });
  const response = await fetchImpl(url, {
    signal: signal ?? AbortSignal.timeout(5000),
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`NetEase lyrics HTTP ${response.status}`);
  const wire = await response.text();
  if (wire.length > 2 * 1024 * 1024) throw new Error('NetEase lyrics response too large');
  const body = JSON.parse(wire);
  if (body.code !== 200) throw new Error(`NetEase lyric service code ${body.code}`);
  if (body.nolyric || body.uncollected || !body.lrc?.lyric) return null;
  const document = parseLrc(body.lrc.lyric, {
    provider: 'netease',
    reference,
    duration,
    association: 'manual-song-id',
  });
  if (body.tlyric?.lyric) {
    const translated = parseLrc(body.tlyric.lyric, { duration });
    const byTime = new Map(
      translated.lines.map((line) => [
        Math.round((line.start + translated.offsetSeconds) * 1000),
        line.text,
      ]),
    );
    for (const line of document.lines)
      line.translation = byTime.get(Math.round((line.start + document.offsetSeconds) * 1000)) || '';
  }
  return document;
}
