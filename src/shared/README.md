[简体中文](README.zh-CN.md)

# Shared contracts

`MediaSnapshot` describes all sessions, automatic/manual selection, freshness and errors. `MediaSession` includes playback state and nullable control capabilities. `media.ts` owns pure automatic selection and capability rules. The control IPC requires a session ID; selection and control return a refreshed snapshot plus a domain error instead of treating failure as an empty player list.

`pages.ts` owns stable page IDs, default order and built-in layout policies. Persisted page IDs are strings; the state schema accepts additional named pages independently of their navigation position.

`backgroundImage.ts` normalizes background settings and encodes local paths into the dedicated image URL without CSS backslash escaping. It performs no file access.

Shared defines serializable IPC and domain contracts, Zod schemas for persisted app state and quick-app targets, and pure input-geometry helpers. Main, preload and renderer consume these definitions; runtime services stay in their owning layers.

`contracts.ts` owns request, response, notice and assistant-stream shapes. `appState.ts` owns the persisted schema and fresh defaults. `i18n/` owns locale types, language resolution and bundled catalogs; renderer initializes i18next, while main uses the catalog for tray labels.

See the [developer guide](../../docs/development.md) and [repository map](../../INDEX.md).

`diagnostics.ts` defines safe error metadata and structured IPC, capability and lifecycle events. Native clipboard methods are explicit members of the shared IPC contract; diagnostics never include their text payloads.

`ScrollGestureStartSchema` validates the native touchpad boundary's timestamp-only payload. Main produces it, preload validates it, and renderer uses it to separate fresh gestures from older momentum.
