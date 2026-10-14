[简体中文](README.zh-CN.md)

# Shared contracts

`launch.ts` owns one `Application` and `LaunchTarget` model for discovery, quick apps and workflows. A workflow persists `targets`, with type resolution at editing time. Installed applications carry an opaque platform identity in `native`; commands keep argv and an optional working directory. `launch-targets` sends the selected target array once and returns indexed failures. Platform adapters own interpretation and activation of native identities.

`MediaSnapshot` describes all sessions, automatic/manual selection, freshness and errors. `MediaSession` includes playback state and nullable control capabilities. `media.ts` owns pure automatic selection and capability rules. The control IPC requires a session ID; selection and control return a refreshed snapshot plus a domain error instead of treating failure as an empty player list.

`pages.ts` owns stable page IDs, default order and built-in layout policies. Persisted page IDs are strings; the state schema accepts additional named pages independently of their navigation position.

`backgroundImage.ts` normalizes background settings and encodes local paths into the dedicated image URL without CSS backslash escaping. It performs no file access.

Shared defines serializable IPC and domain contracts, Zod schemas for persisted app state and quick-app targets, and pure input-geometry helpers. Main, preload and renderer consume these definitions; runtime services stay in their owning layers.

`contracts.ts` owns request, response, notice and assistant-stream shapes. `appState.ts` owns persisted defaults, the structured AI graph, the canonical weather preferences. `aiConfiguration.ts` validates stable IDs, endpoint/key/model references, customization patches and ordered injections; context awareness is fixed off. `weather.ts` separates reading, detected address and bounded errors. `licenses.ts` describes license metadata and text. Runtime services stay outside shared. `i18n/` supplies complete bundled catalogs to main and renderer.

`color.ts` parses persisted RGB/hex CSS colors and preserves alpha when a native RGB choice is applied. The `show-color-picker` contract returns hex or null; `colorPickerFailed` belongs to Settings.

See the [developer guide](../../docs/development.md) and [repository map](../../INDEX.md).

`diagnostics.ts` defines safe error metadata and structured IPC, capability and lifecycle events. Native clipboard methods are explicit members of the shared IPC contract; diagnostics never include their text payloads.

`ScrollGestureStartSchema` validates the native touchpad boundary's timestamp-only payload. Main produces it, preload validates it, and renderer uses it to separate fresh gestures from older momentum.

`fonts.ts` validates uiFont choices. i18n owns original playful Chinese overlays; localeForFormatting normalizes internal/private language variants before Intl. Font and glass defaults apply to new settings without overwriting saved choices.
