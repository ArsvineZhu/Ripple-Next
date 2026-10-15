import { trackKey } from '../../model.mjs';
import { parseLrc } from '../local-lrc/index.mjs';
export function fromMpris(player) {
  return typeof player?.inlineLyrics === 'string' && player.inlineLyrics.trim()
    ? parseLrc(player.inlineLyrics, {
        provider: 'mpris-text',
        association: 'session',
        reference: trackKey(player),
        duration: player.anchor?.duration,
      })
    : null;
}
