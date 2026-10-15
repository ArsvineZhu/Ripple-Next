[简体中文](README.zh-CN.md) · [Module](../../../README.md)

# Local LRC

Implemented: line timestamps, repeated tags, Unicode/BOM/CRLF, title/artist and offset metadata. Positive LRC offset tags advance cues and are converted to negative normalized display delay. No word timing is invented. Untimed content remains plain text. The demo binds an explicitly loaded file to the selected track and clears it at a track change.

Convention reference: [paroles offset semantics](https://github.com/Clarkkkk/paroles).
