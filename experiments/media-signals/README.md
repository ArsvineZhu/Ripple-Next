[简体中文](README.zh-CN.md) · [Research](../../docs/media-signals.md)

# Media Signal Lab

A standalone Linux research prototype for live output audio and word-timed lyrics. It does not modify Ripple's IPC, application state or packaged application. Research tracking: [#15](https://github.com/ArsvineZhu/Ripple-Next/issues/15).

## Run

Use the repository's Node version and installed dependencies. The host needs `pw-cat`, `pw-dump`, a working PipeWire session and an MPRIS player. For Folia lyrics, enable Settings → Connections and integrations → Lyrics API in Folia, at `http://127.0.0.1:32109/v1/lyric`.

```sh
node experiments/media-signals/server.mjs
```

The process prints a loopback URL with a free port. Open it, choose an application output or device mix, and click **Start capture**. Folia is initially preferred when available. Audio and lyric/timeline selections are independent and explicitly labelled. Set `RIPPLE_LAB_PORT=43143` for a fixed port when needed. Ctrl+C stops the server and its capture child.

The page shows stereo min/max waveforms, a 64-band spectrum, RMS/peak dBFS, dominant FFT-bin frequency, player progress, and original/translated lyrics with progressive word highlighting. It distinguishes native word timings from estimated timings. The frequency readout is a strongest-bin measurement, not a pitch or musical-note detector.

## Data paths and lifecycle

- PipeWire `pw-cat`: stereo 48 kHz f32le from a verified output node's `object.serial`. Applications use their output stream; devices use monitor output. Microphone/input nodes are absent from the selector. No fallback to the default input is permitted.
- [`modules/media-signals/audio`](../../modules/media-signals/README.md): fixed 2048-frame stereo ring, Hann-windowed FFT, channel-power combination to preserve anti-phase stereo, 128 min/max envelope points per channel. At most 30 analysis frames/s go to browser consumers, with bounded slow-client handling. PCM is not saved or sent to the browser. Reduced frames use a separate fixed-size binary stream; metadata/lyrics use SSE and lyric documents are sent only on revision changes.
- MPRIS: initial snapshot, property/owner/seek signals and a five-second position-only correction. The browser extrapolates a monotonic position anchor at the reported rate; pause freezes it. Property signals do not provide a continuously updating Position value.
- Folia: one local snapshot request per second while a viewer is connected. Seconds are used for line/word times, milliseconds for the exported offset. No cloud lyric lookup is made.
- Closing the last viewer or hiding the page releases audio capture. Returning reconnects metadata/lyrics; starting audio again is explicit. No app volume, playback command or persistent preference is changed.

The lyric API may omit title/artist and has no track revision. The page limits it to a Folia MPRIS selection, clears on track changes and rejects a supplied title mismatch. **Without an identity in the response, exact track association is not proven**; the page displays that limitation. API failure clears lyrics without affecting audio.

## Other lyric sources

Load a local .lrc/.txt file to assign plain or line-timed lyrics to any selected player; Use player lyrics restores automatic selection. Files remain local and reset at track changes. Folia is one isolated [provider](../../modules/media-signals/README.md), not the module-wide protocol. The separate NetEase adapter is opt-in by explicit song ID; Spotify/Apple Music directories document researched routes without claiming working direct loaders. The demo never requests these remote services automatically.

## Verify

```sh
node --test tests/features/media-signals/*.test.mjs
pnpm exec oxlint --config .config/oxlint.json --deny-warnings modules experiments
node experiments/media-signals/benchmark.mjs
pnpm exec prettier --config .config/prettier.json --check 'experiments/**/*.{mjs,html,md}' 'modules/**/*.{mjs,md}'
```

Tests use original text and calibrated synthetic PCM, never songs or a host microphone. Live checks cover both output choices, actual PipeWire links, changing frames/lyrics, visibility/disconnect cleanup and resource cost. Keep screenshots, live metadata and measured reports under ignored out/; do not add acquired lyrics/audio to fixtures.

Windows and macOS capture routes are researched but not implemented or host-tested here. See the [integration decisions](../../docs/media-signals.md).
