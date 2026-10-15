# Media signal module

Keep DSP/framing and lyric timeline/model code platform/provider neutral. Put each lyric provider in lyrics/providers/<provider> and native discovery/capture in platform/<os>. Folia seconds/ms conversions and HTTP details belong only to its adapter.

Capture output nodes only, preserve speaker links and forbid input fallback. Keep streams/buffers bounded and release native resources when consumers disconnect. No credentials, authenticated browser sessions or external lyric requests by default. Preserve timed/untimed and native/estimated word distinctions and source association metadata.

The module is not enabled in the packaged app. The local demo owns HTTP/UI orchestration; do not add product IPC, settings or imports under src during this research.
