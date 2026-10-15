[简体中文](README.zh-CN.md) · [Module](../../../README.md)

# Spotify

Research only; no direct lyric loader. Spotify's official developer answer states there is no public lyrics API. Current public track/playback structures provide identifiers and timing, not lyric text. Use a platform timeline plus an explicitly selected local LRC or opt-in independent provider. Private web-session lyric routes are a different, unsupported integration; this module does not read browser cookies or session tokens.

Sources: [official developer answer](https://community.spotify.com/forum/en/discussion/5355493/update-endpoint-for-lyrics), [Track reference](https://developer.spotify.com/documentation/web-api/reference/get-track), [Playback SDK state](https://developer.spotify.com/documentation/web-playback-sdk/reference#webplaybackstate-object).
