[简体中文](README.zh-CN.md) · [Module](../../../README.md)

# Apple Music

Research only; no direct lyric loader. The inspected MusicKit Song reference exposes `hasLyrics`, a presence flag, not lyric text/timing. Public catalog metadata alone is insufficient for karaoke output. A macOS Music.app-specific export of stored/local lyrics or a cooperating player bridge is a candidate requiring host validation; it must not be presented as verified access to catalog word-synced lyrics. Local LRC works independently of that integration.

Sources: [MusicKit Song](https://developer.apple.com/documentation/musickit/song), [hasLyrics](https://developer.apple.com/documentation/musickit/song/haslyrics), [MusicKit](https://developer.apple.com/musickit/).

A third-party alternative is a cooperating client/provider: [Cider documents a lyrics endpoint](https://docs-api.cider.sh/reference/v1-api.cider.sh-v1) that selects independent sources such as MXM/QQ. That is not evidence of an Apple catalog lyric-text API. This run inspected its docs only; availability/authentication were not tested and no request or credentials were sent.
