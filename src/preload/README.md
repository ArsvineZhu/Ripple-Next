[简体中文](README.zh-CN.md)

# Preload bridge

Media reads return a session snapshot. `selectMediaSession` chooses Automatic or a known session, and `controlSystemMedia` requires that displayed session's ID; both return refreshed state and an operation error. `openMediaSession` uses the known session identity to activate its player without waiting for another metadata read, and returns the current snapshot plus an operation error. The renderer has no raw D-Bus or PowerShell access.

Preload exposes the isolated `electronAPI` through explicit `contextBridge` methods. It maps typed calls and events to named IPC channels from [shared contracts](../shared/README.md); renderer code never receives raw `ipcRenderer` access.

The bridge covers state snapshots and patches, typed AI graph commands, named credential writes, credential-presence flags, main-owned weather snapshots, license listing/reading, AI streams and native controls. Only Settings can mutate AI configuration or write credentials; plaintext keys never return through bootstrap or status. Preload validates request and event shapes and exposes no raw invoke API.

Keep this bundle sandbox-compatible and keep each bridge method aligned with its shared request, response and event contract.

`showColorPicker(initialColor)` opens the Settings-owned native RGB chooser and returns a six-digit hex color or null on Cancel. Main validates the sender and payload.

See the [developer guide](../../docs/development.md) and [repository map](../../INDEX.md).

The bridge also exposes `readClipboardText()` and `writeClipboardText(text)` so desktop clipboard operations use Electron's native API without browser focus/permission assumptions.

`onScrollGestureStart(callback)` delivers validated native touchpad start timestamps through `scroll-gesture-start` and returns an unsubscribe function. It exposes no raw input events or pointer/key data.

`setIslandPreview(active)` is restricted to the Settings role. `getIslandPreview()` and `onIslandPreviewChanged()` synchronize transient preview visibility with Island; subscriptions return cleanup functions. Preview is not persisted.
