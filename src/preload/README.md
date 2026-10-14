[简体中文](README.zh-CN.md) · [Shared contracts](../shared/README.md)

# Preload bridge

The sandbox-compatible CommonJS bundle exposes a typed electronAPI through contextBridge. Every operation uses a named method; renderer code receives neither raw ipcRenderer nor arbitrary channel access.

The bridge covers application bootstrap/committed updates, feature patches, validated AI graph/credential operations, assistant stream events, weather, native launch/media/device operations, clipboard, color picker, window input/preview and diagnostics. Main validates window identity and operation payloads.

Media events deliver the same snapshot/selection to both windows. Device events wake one observer; capability flags describe the selected native backend. Every event method returns an unsubscribe function. Scroll gesture events and renderer diagnostic payloads are bounded schemas.

Settings alone edits AI configuration/credentials, requests the native color dialog and controls the transient Island preview. Credential plaintext never returns through bootstrap/status. See [architecture](../../docs/architecture.md) and [development](../../docs/development.md).
