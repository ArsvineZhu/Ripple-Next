/** Provider-neutral lyric documents. All normalized times are seconds. */
export function lyricDocument({
  lines = [],
  text = '',
  kind = 'line-timed',
  offsetSeconds = 0,
  title = null,
  artist = null,
  source,
}) {
  if (
    !source?.provider ||
    !Number.isFinite(offsetSeconds) ||
    !Array.isArray(lines) ||
    lines.length > 20000
  )
    throw new Error('Invalid lyric document');
  for (const line of lines) {
    if (
      typeof line.text !== 'string' ||
      !Number.isFinite(line.start) ||
      !Number.isFinite(line.end) ||
      line.end < line.start ||
      !Array.isArray(line.words)
    )
      throw new Error('Invalid lyric line');
    for (const word of line.words)
      if (
        typeof word.text !== 'string' ||
        !Number.isFinite(word.start) ||
        !Number.isFinite(word.end) ||
        word.end < word.start
      )
        throw new Error('Invalid lyric word');
  }
  return {
    kind,
    offsetSeconds,
    title,
    artist,
    source,
    text,
    lines: [...lines].sort((a, b) => a.start - b.start),
  };
}
export function trackKey(player) {
  return player
    ? `${player.id}|${player.trackId || [player.title, player.artist, player.album, player.anchor?.duration].join('|')}`
    : '';
}
