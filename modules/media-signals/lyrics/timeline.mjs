export function lyricAt(lyrics, playbackSeconds) {
  if (!lyrics?.lines.length) return null;
  const time = playbackSeconds - lyrics.offsetSeconds;
  let lo = 0,
    hi = lyrics.lines.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (lyrics.lines[mid].start <= time) lo = mid + 1;
    else hi = mid;
  }
  if (lo === 0) return null;
  const index = lo - 1,
    line = lyrics.lines[index];
  return {
    index,
    line,
    time,
    word: line.words.findIndex((word) => time >= word.start && time < word.end),
    inGap: time >= line.end,
  };
}
export function positionAt(anchor, now = performance.now()) {
  if (!anchor) return 0;
  const position =
    anchor.position + (anchor.playing ? (Math.max(0, now - anchor.at) / 1000) * anchor.rate : 0);
  return Math.max(0, Math.min(anchor.duration || Infinity, position));
}
