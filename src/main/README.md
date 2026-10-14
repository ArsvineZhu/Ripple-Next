[简体中文](README.zh-CN.md)

# Main process

`services/apps.ts` owns ordered target execution and per-target results without platform branches. `platform/apps.ts` selects the native application capability. Linux owns desktop-entry discovery and gio launch; macOS owns bundles and open activation; Windows owns shortcuts, Store activation and a shared five-minute in-memory discovery cache. Discovery starts on demand. There is no advance build-cache IPC, installed-apps JSON file, renderer launch loop or fixed inter-target sleep.

`services/media.ts` owns media-session selection, serialized queries/commands and stale/error snapshots. Automatic mode prefers an actively playing system session, then preserves a playing or paused selection; manual choice lasts for this run until the session disappears. Commands carry the displayed session ID and never fall back to another player. Windows reads GSMTC controls and artwork through a cached typed CLR bridge; macOS queries only running Spotify/Music dictionaries independently; Linux uses the bundled D-Bus client and MPRIS unique owner names, including capabilities and local artwork. Opening a session uses its cached main-owned application identity/path on Windows, the running application on macOS, or MPRIS Raise on Linux, with same-owner StatusNotifierItem Activate when CanRaise is false or Raise fails; it does not wait for another metadata query. No cloud music API is used.
Local MPRIS artwork with an unrecognized filename extension is identified by PNG/JPEG/GIF/WebP signatures and served as a data URL, subject to the existing 5 MiB limit. Missing or unsupported artwork does not discard the media session.

Main owns the app lifecycle, tray, transparent window, IPC validation and system effects. `index.ts` sets Ripple Next's user-data directory and loads typed state and secure credential storage before opening the renderer.

`appProfile.ts` selects `Ripple Next` for packaged builds and `Ripple Next Development` for development. It keeps state and Chromium caches separate, and takes Electron's native instance lock in the installed profile directory before restoring the active profile path. Linux uses the home-based configuration directory for the lock, including when `XDG_CONFIG_HOME` selects alternate data. First launch, repeated launch and application activation open the singleton settings window. Settings closure leaves the Island running.

`services/backgroundImage.ts` serves the configured local background through `ripple-background:` in development and packaged builds. It accepts absolute paths and file URLs, encodes filenames through `pathToFileURL`, and limits file requests to the current configured image. Network images remain direct renderer resources.

Services own atomic state persistence, encrypted API keys, notices, AI requests, app discovery and launch, and autostart. Platform adapters contain Linux, macOS and Windows behavior. `ipc.ts` validates sender identity and payloads against [shared contracts](../shared/README.md).

`appStateStore.ts` owns the current SQLite schema and prepared statements. Main reads one validated snapshot, commits only affected setting rows or feature lists, and publishes the next snapshot after the transaction succeeds. Related credential deletion stays in that transaction. Read failures throw and show a startup error; neither defaults nor failed writes replace stored data. Historical migrations and version dispatch have been removed.

`ai/configuration.ts` serializes graph edits and allocates stable IDs. Credential ciphertext belongs to named secure-store records, and graph deletion removes corresponding secrets in the same SQLite transaction. `ai/stream.ts` selects the Chat Completions, Responses or Anthropic adapter and resolves the selected model's system prompt and ordered enabled injections. The local context limit counts characters before sending. `services/weather.ts` owns built-in/custom credentials, request deduplication and a bounded 60-second cache. `services/licenses.ts` loads bundled license metadata and reads known records only.

`services/colorPicker.ts` owns the native RGB dialog and its helper lifetime. Settings-only IPC validates RGB hex and resolves the owner window. Windows uses an owned `ColorDialog`, macOS uses `choose color`, and Linux selects kdialog/zenity for the desktop. Closing the owner aborts the helper; cancellation returns null. Native dialogs have no command timeout. See [platform support](../../docs/platform-compatibility.md#native-integrations).

`services/processes.ts` owns bounded command execution and confirmed detached spawn. Windows uses encoded Windows PowerShell scripts and a shared WinRT async bridge. IPC diagnostics record operation outcomes and safe error metadata; operational launch feedback belongs to the renderer control. Native clipboard text reads/writes use explicit validated bridge methods. See [platform compatibility](../../docs/platform-compatibility.md).

The bundled system prompt lives in `ai/default-assistant.md`. Before each AI request, `ai/prompts.ts` resolves `{{product}}`, `{{developer}}`, `{{version}}`, `{{license}}`, `{{repository}}`, `{{issues}}`, `{{timezone}}` and `{{current_time}}`. Static metadata comes from `package.json`; `{{version}}` uses Electron's `app.getVersion()`. Time values follow the configured time zone, with `system` resolved from the operating system; `{{current_time}}` uses `YYYY-MM-DD HH:mm:ss`. Unknown variables remain unchanged, and user prompts are sent without template expansion.

On Linux, the window waits for renderer readiness and the first confirmed X11 `ShapeInput` region. Keep the X11 client statically bundled; input shaping uses `ShapeInput`.

See the [developer guide](../../docs/development.md) and [repository map](../../INDEX.md).

`services/scrollGestures.ts` forwards Chromium's fresh touchpad gesture boundary (`gestureScrollBegin` / `gestureFlingCancel`, coalescing paired signals) to preload with a timestamp only. Its listeners retain the WebContents reference and are removed on destruction and window closure. It does not forward key contents, pointer coordinates or wheel payloads.

Linux capture detection in `platform/linux/devices.ts` starts with `pactl`. Missing-command errors switch to `pw-dump` and the backend remains selected until restart. Active PipeWire capture is a running `Stream/Input/Audio` node; connection/command errors propagate to diagnostics.

New endpoints and credentials begin with an empty editable name; renderer fallback labels use protocol/key names and current display order. Main IDs remain monotonic and are never reused for display numbering.
Preference patches apply display/login-item effects before saving and broadcasting. Island creation restores its saved display directly. Autostart selection lives under platform/autostart with native Windows/macOS/Linux implementations; Windows and macOS reject development registration and check the accepted OS setting. Weather accepts WeatherPreferences and builds the provider query only when requesting.

AI configuration, request execution, provider streaming and prompt templates live together in `ai/`. Configuration resolves the active model and its encrypted credential once per request. `ai/assistant.ts` owns cancellation and returns one complete/cancelled/error result; IPC delivers text deltas only to the requesting renderer. `ai/stream.ts` consumes the SDK text stream and uses its final text result. A stream failure preserves already rendered text alongside the localized error, and resetting cancels the network request and ignores late output.

Platform selection for device sampling lives in `platform/devices.ts`; the three native adapters own their queries and caches. `services/colorPicker.ts` owns only the dialog lifetime and owner-window state. `platform/colorPicker.ts` validates and normalizes RGB, and each native adapter owns its command. Windows uses the common PowerShell runner with abort support. Database initialization failures show a localized native error with the data location before exiting; they do not reset the database.

`shared/media.ts` owns one MediaSession/MediaSnapshot contract, including artworkUrl and capabilities. `platform/media.ts` selects the native backend; the core service has no OS branches. Selecting a displayed session updates the snapshot immediately without another query. Control uses that session identity, lets the native adapter validate the actual player, and reads the current adapter snapshot afterward. Unsupported/missing/stale targets return directly. The unused last-read timestamp is removed.

Diagnostics formats all events as readable records with levels, session/operation IDs, per-role view context and bounded source-map lookup. IPC wraps execution in AsyncLocalStorage so native/AI errors share their parent operation. Typed renderer reports replace electron-log preload injection and JSON-prefix interception. See [diagnostics](../../docs/diagnostics.md).

Windows resolves custom desktop media AUMIDs against registered Start applications, caches their names/identities for five minutes, and activates the exact AppsFolder entry. Duplicate and unregistered identities remain unavailable; opening never triggers a metadata/artwork query.

Media snapshots now arrive through the optional native backend subscription. The service owns one fallback/recovery timer for all renderer windows. Windows uses the persistent executor described in [native observation](../../docs/native-observation.md); old per-query media/artwork PowerShell hosting is removed.
