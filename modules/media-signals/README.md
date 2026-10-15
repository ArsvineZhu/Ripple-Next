[简体中文](README.zh-CN.md) · [Demo](../../experiments/media-signals/README.md) · [Research](../../docs/media-signals.md)

# Media signals

Research is tracked in [#15](https://github.com/ArsvineZhu/Ripple-Next/issues/15).

Reusable local module, independent of Electron application entry points, state and IPC. It is not bundled or enabled in Ripple Next.

| Owner                                     | Implementation                                                                          |
| ----------------------------------------- | --------------------------------------------------------------------------------------- |
| `audio/analyzer.mjs`                      | Fixed stereo ring, precomputed FFT tables/window/bands and reused scratch/output arrays |
| `audio/frame.mjs`                         | Versioned binary analysis-frame encoder/decoder, independent of transport               |
| `platform/linux`                          | PipeWire output discovery/capture and MPRIS observation/clock; no microphone fallback   |
| `lyrics/model.mjs`, `lyrics/timeline.mjs` | Provider-neutral documents, source identity and second-based timing                     |
| `lyrics/providers/<provider>`             | Format conversion, requests and provenance owned by each source                         |

## Lyric providers

- [Folia](lyrics/providers/folia/README.md): working local HTTP adapter; Folia-specific protocol.
- [Local LRC](lyrics/providers/local-lrc/README.md): working file/text parser for any player clock.
- [MPRIS text](lyrics/providers/mpris/README.md): working optional player-exported text/LRC source.
- [NetEase](lyrics/providers/netease/README.md): explicit-ID experimental LRC fetch, live-probed; undocumented upstream endpoint.
- [Spotify](lyrics/providers/spotify/README.md), [Apple Music](lyrics/providers/apple-music/README.md): researched routes/limitations, no direct lyric loader implemented.

A document distinguishes plain, line-timed, native-word-timed and estimated-word-timed content. `offsetSeconds` means display delay; adapters convert their own offset conventions. Folia's positive millisecond offset delays, while the LRC adapter interprets positive offset tags as advance. Source association is explicit: session-bound, manual file/ID, title-only or unverified. Title matching alone does not prove a source track identity.

## Audio contract

Call `push(Buffer)` with interleaved stereo f32le PCM; `snapshot()` returns a borrowed view valid until the next snapshot. A consumer retaining history must copy it. Two FFT channel powers are combined so anti-phase stereo does not cancel. Values use a Hann window with coherent amplitude compensation; the readout is the strongest bin rather than fundamental pitch.

Analysis frames contain no PCM. Version 1 is 1152 bytes, little-endian: a 64-byte header (magic/version/length, sequence, rate, sample count, timestamp, FFT size, dominant bin frequency and stereo RMS/peaks), 64 byte-sized spectrum bands, then 1024 bytes of signed-16 stereo min/max envelopes (128 pairs/channel). Waveform values clip to ±1 for display; float peak/RMS preserve over-range measurements. Envelope quantization error is at most 1/32767. Framing validates length/version and reassembles arbitrary stream fragments within one fixed frame buffer.

The demo uses a separate binary HTTP stream for audio and SSE for metadata/lyric revisions. Hidden/closed consumers abort both. Native children are supervised by the Linux adapter; original speaker links remain intact.

## Verify

```sh
node --test tests/features/media-signals/*.test.mjs
node experiments/media-signals/benchmark.mjs
```

The fixed-input benchmark uses 2048 stereo samples at 48 kHz, 500 warmups and five rounds of 1000 analyses. Optional `--baseline <local-analyzer.mjs>` compares a saved implementation. This workspace's comparison measured about 0.43 → 0.13 ms median; the fixture's JSON analysis packet was 2844 bytes versus 1152 binary bytes. Real music produces different costs; live evidence remains in ignored out/.

No cookies, user credentials or private service sessions are read. External lyric calls occur only when a caller explicitly invokes the NetEase adapter with a numeric song ID. The demo itself uses only local/player sources. Tests use synthetic PCM and original lyric text.
