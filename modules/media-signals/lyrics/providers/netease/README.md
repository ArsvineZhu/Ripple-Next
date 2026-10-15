[简体中文](README.zh-CN.md) · [Module](../../../README.md)

# NetEase Cloud Music

Implemented, experimental: `fetchNetease(id)` reads the consumer `/api/song/lyric` endpoint with an explicit numeric song ID and returns normalized line LRC plus timestamp-matched translation. A public sample returned 51 parsed cues in the local probe. No cookies/login, search or automatic requests are used. The endpoint is undocumented and may change or be restricted. A MPRIS track ID is not a NetEase catalog ID.

Evidence endpoint: [public read probe](https://music.163.com/api/song/lyric?id=33894312&lv=-1&kv=-1&tv=-1). Live response text stays under ignored out/, not in tests.
