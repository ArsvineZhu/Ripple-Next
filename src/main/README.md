[简体中文](README.zh-CN.md) · [Architecture](../../docs/architecture.md)

# Main process

Main owns application lifetime, windows, tray, native effects and durable state. `index.ts` initializes the application profile, diagnostics, SQLite and secure store before renderer bootstrap. A native lock keeps one instance; launching again opens Settings. Development and installed builds use separate data/cache profiles.

`ipc.ts` validates sender roles and payloads, applies system effects before preference commits and broadcasts committed state. Settings owns editor/credential writes; Island owns daily interaction. `appStateStore.ts` owns the SQLite schema, prepared statements and transactions. Read errors remain errors; related AI graph and credential deletion is atomic.

## Domain services

- Apps executes one ordered LaunchTarget array and returns indexed results. Platform adapters own native application discovery, preparation and activation.
- Media owns automatic/manual selection, serialized commands, stale/error snapshots and shared observation. Controls and activation carry the visible session ID; metadata and cover work do not precede a control.
- AI configuration owns graph IDs and bindings; streaming resolves model prompts/injections and delegates Chat Completions, Responses or Anthropic to the SDK. Cancellation and terminal results belong to the request.
- Weather owns provider query assembly, protected credentials, request coalescing and a bounded cache. Local background images use the dedicated protocol restricted to the configured resource.
- Color picker owns its helper lifetime and Settings window. Diagnostics owns bounded readable logs, operation correlation, native failure codes and source-map resolution. Licenses returns known bundled records.

## Native boundaries

Windows uses the supervised persistent MTA executor for media/device events and native commands. Linux uses D-Bus signals, PipeWire/PulseAudio streams and the bundled inotify camera executable; property changes update cached metadata before generation-guarded local artwork. macOS owns player dictionaries, application activation and native window behavior.

Linux window input changes ShapeInput only, and first-show waits for input-region confirmation. The X11 client is statically bundled. Native discovery/caches stay within their adapters, and faults remain local to the corresponding device/session.

See [native observation](../../docs/native-observation.md), [platform support](../../docs/platform-compatibility.md), [diagnostics](../../docs/diagnostics.md) and [development](../../docs/development.md).
