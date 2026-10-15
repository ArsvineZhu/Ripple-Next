[简体中文](media-signals.zh-CN.md) · [Local prototype](../experiments/media-signals/README.md)

# Lyrics and audio signals

This is a local research result and integration direction. The packaged application does not contain lyric or audio-analysis features. The independent Linux prototype is runnable from the workspace without changing the installed app.

## Decision

Keep three capabilities separate: playback identity/timeline, lyric documents, and audio analysis. A media-control session is not an audio stream, and an audio device does not supply lyric text. Use native output loopback for visualizations and a player/provider adapter for lyrics. Do not add audio-rate data to MediaSnapshot or route PCM through the settings store.

| Capability         | Linux                                                                       | Windows                                                                 | macOS                                                              |
| ------------------ | --------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Identity and clock | MPRIS owner/track ID, Position, Rate and Seeked                             | GSMTC session and timeline properties/events                            | Supported player adapters; a system tap is not a song clock        |
| Output-device PCM  | PipeWire sink monitor; PulseAudio monitor fallback is a separate adapter    | WASAPI endpoint loopback                                                | Core Audio process taps or ScreenCaptureKit                        |
| Per-player PCM     | PipeWire Stream/Output/Audio node, bound to process tree and object serial  | WASAPI application loopback, Windows build 20348+; include process tree | Core Audio taps, macOS 14.2+, process/group selection              |
| Lyrics             | Optional player text/custom metadata, local sidecars or explicit player API | GSMTC media properties have no lyric-text member; use a separate source | Player-specific source; no universal lyric output in the audio tap |

Windows/macOS entries are supported by primary platform documentation, not local runtime validation. Core Audio tap capture requires the system-audio permission and `NSAudioCaptureUsageDescription`; keep taps unmuted and release their aggregate devices. Windows per-process loopback can work independently of output endpoint selection.

## Linux evidence

The test host has PipeWire 1.6.2 and a running Folia player. Its MPRIS identity is Folia under Chromium's bus name. The observed metadata contains title, artist, album, duration and track ID, but no lyric text. Position, Rate and Seeked are usable for a clock. The existing Ripple MediaSession currently omits the timeline fields, so production integration needs an explicit timeline contract.

Both Folia's application stream and the built-in output device monitor delivered real stereo f32 PCM at 48 kHz. Each one-second probe contained 384,000 bytes; both were nonzero. Graph inspection confirmed the experiment's capture links originate at the Folia output node, while the original speaker links remain active. The source selector excludes Audio/Source nodes and disables fallback/reconnection to other targets.

MPRIS and audio PIDs differ on this host: the former belongs to Folia's main process, the latter to a child. Resolve the D-Bus owner's Unix PID, then relate it to the PipeWire client/process tree. Validate live ownership and object.serial at capture time. A display name, recycled node ID or song title is insufficient as a durable binding.

The prototype analyzes a 2048-frame window (42.67 ms at 48 kHz) and emits at most 30 reduced frames/s. Exact-bin 1500 Hz, amplitude 0.25, anti-phase stereo tests verify RMS, peak, FFT amplitude/frequency and fragmented PCM assembly. Real cost measurements belong to the local out/ report and include both analysis time and frame transport; they are not a cross-machine guarantee.

An output-loopback recording node is itself `Stream/Input/Audio` with `stream.capture.sink=true`. Class alone therefore cannot establish microphone use. The production device observer currently relies on the input-stream class; audio-analysis integration must refine it using capture mode and graph target, or the app can mistake its own output tap for a microphone.

The lab displays the current live sample window. A seekable whole-track waveform needs an authorized local file/decoded stream or a peak-index provider; output loopback cannot supply audio that has not played yet. A progressive envelope can cover already-played regions without retaining PCM. End-to-end visual latency additionally includes audio-graph, transport and paint buffering; the FFT window duration is only one part of that path.

## Lyrics source and clock

Folia's opt-in `GET http://127.0.0.1:32109/v1/lyric` is a read-only, loopback API. Live responses provide line text, optional translation, per-word intervals and a native/estimated-word flag. The observed snapshot has 99 lines; the API is actually usable independently of the MPRIS metadata.

Its time intervals are seconds; offset is milliseconds. Select by `lyricTime = playbackSeconds - offset / 1000`. Interpolate word fill within that interval. Pause freezes the MPRIS anchor, and seek/track/rate changes replace it. Re-read Position after discontinuities and use occasional correction; do not query Position at paint rate. MPRIS explicitly does not emit PropertiesChanged for ordinary Position advancement.

The HTTP API exposes snapshots, not push events or a player clock. The lab reads at 1 Hz only while a viewer is connected. A Folium mod event bridge (`lyrics.loaded` plus playback events) is a potential event-driven upgrade, requiring a separately reviewed/enabled player integration; it is not installed by this prototype.

The API has optional title/artist but no mandatory track ID/revision. Current responses omit those identity fields. Restrict to Folia, clear at metadata changes, check any supplied title, and discard obsolete requests. These guards do not prove atomic track association when the response lacks identity. A production bridge should include source session, track ID, revision and monotonic capture timestamp; that contract is preferable to heuristics.

For other players, prefer explicit exported lyrics, then user-selected local LRC/TTML or embedded tags. An optional online service such as LRCLIB can match title/artist/album/duration; it must preserve source and match confidence, distinguish instrumental/not-found/unavailable, and be opt-in. The lab does not make these requests. PCM alone cannot retrieve the player's lyric document; ASR/forced alignment would be a different capability.

## Reusable module and provider boundaries

The workspace implementation lives in [modules/media-signals](../modules/media-signals/README.md); experiments contains only the demo/benchmark runner. DSP, binary framing and normalized lyric timing are reusable, and no application entry point imports them. Each provider owns its directory and source-specific units/requests.

| Source                 | Current implementation and researched route                                                                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Folia                  | Working local HTTP adapter, isolated under `lyrics/providers/folia`; its protocol is not universal.                                                                                                    |
| Local LRC / MPRIS text | Working generic sources for any selected player clock, with untimed content kept untimed.                                                                                                              |
| NetEase                | Explicit-ID experimental LRC/translation adapter; the consumer endpoint returned 51 parsed cues in a public probe. No stable public contract or YRC implementation is claimed.                         |
| Spotify                | No public lyric-text endpoint found in the reviewed developer APIs; generic local lyrics or an independently authorized provider remain viable.                                                        |
| Apple Music            | Reviewed MusicKit Song exposes hasLyrics rather than lyric text; stored/local lyric export on Mac needs validation. Cooperating clients such as Cider document separate provider-based lyric services. |

Provider evidence and exact limits live with their [adapters](../modules/media-signals/README.md#lyric-providers). No Spotify/Apple direct loader, cookie extraction or automatic external lookup is enabled. The demo can explicitly assign a local LRC file to a track and clears it on track changes.

The fixed-PCM benchmark (same 2048 stereo samples, Node 22.23.3, five warmed rounds) measured median analysis around 0.43 ms for the saved baseline and 0.13 ms for the current module. Its 2844-byte JSON fixture packet becomes a fixed 1152-byte binary frame. Live music delivery measured roughly 33 KiB/s at 29.3 frames/s. Live CPU/music windows are observational, not an identical-input benchmark. FFT tables/scratch/output arrays are reused, metadata and lyric revisions are sent separately, and no full lyric document is repeatedly sent with each clock update.

## Production ownership

- Main: owns native capture/source identity, lyric provider requests, cancellation, resource leases, timeline anchors and stale generations. Audio processing belongs in a worker/native helper with bounded buffers, not the metadata/control queue.
- Shared: owns serializable source capabilities, timeline/lyric schemas and reduced frame contracts. Keep `plain`, `line-timed`, `native-word-timed` and `estimated-word-timed` distinct.
- Preload: exposes an explicit subscribe/unsubscribe surface. Transfer fixed-size reduced frames separately from persistence and application-state broadcasts; use source incarnation, sequence and timestamps to discard stale frames.
- Renderer: owns Canvas/WebGL drawing and word highlighting from the current anchor. Hidden/offscreen consumers release audio leases; a visible consumer can retain a shared capture. Rate-limit analysis to useful paint cadence and skip slow-consumer frames.

Keep failures source-local: missing lyrics must not stop playback or audio analysis; a disconnected device must not switch to a microphone. Preserve playback controls and original audio routing. The lab verifies these boundaries without adding packaged IPC or settings.

## Sources

- [MPRIS Player: Position, Rate and Seeked](https://specifications.freedesktop.org/mpris/latest/Player_Interface.html)
- [PipeWire pw-cat](https://docs.pipewire.org/page_man_pw-cat_1.html), [capture-sink key](https://docs.pipewire.org/group__pw__keys.html), [target and no-fallback properties](https://docs.pipewire.org/page_man_pipewire-props_7.html)
- [Windows process-loopback sample and minimum build](https://learn.microsoft.com/en-us/samples/microsoft/windows-classic-samples/applicationloopbackaudio-sample/), [GSMTC media properties](https://learn.microsoft.com/en-us/uwp/api/windows.media.control.globalsystemmediatransportcontrolssessionmediaproperties)
- [Apple Core Audio taps](https://developer.apple.com/documentation/coreaudio/capturing-system-audio-with-core-audio-taps)
- [Folia lyric API](https://github.com/chthollyphile/folia-major/blob/009d6e4bd8b40ec618d27552948b6fae05cf0327/docs/lyric-api.md), [Folium events](https://github.com/chthollyphile/folia-major/blob/009d6e4bd8b40ec618d27552948b6fae05cf0327/mods/README.md)
- [LRCLIB API](https://lrclib.net/docs)
