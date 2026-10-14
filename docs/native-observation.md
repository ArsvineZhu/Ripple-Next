[简体中文](native-observation.zh-CN.md) · [Architecture](architecture.md)

# Native observation and command execution

Windows media and device integration uses one supervised, persistent MTA process. Main owns snapshots and selection; renderer windows subscribe to changes. Commands address the displayed session and return when the native API accepts or declines the operation. Metadata and cover decoding run separately from control execution.

## Why the old path was slow

A media control previously started PowerShell, acquired GSMTC, sent the command, then started another metadata/artwork read. Renderer polling could add five seconds to an external track change. Bluetooth polling added up to fifteen seconds. Camera and microphone reads created additional PowerShell hosts. The repeated process/runtime initialization and independent renderer schedules were the principal avoidable costs.

The replacement uses Windows system events:

| Source                        | Native owner                                        | Update policy                                                             |
| ----------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------- |
| Media sessions/current player | GSMTC manager SessionsChanged/CurrentSessionChanged | Reconcile subscriptions and publish the current snapshot                  |
| Playback state/capabilities   | PlaybackInfoChanged                                 | Read the inexpensive current playback info; retain track artwork          |
| Title/artist/album/artwork    | MediaPropertiesChanged                              | Coalesce bursts for 35ms, publish metadata, decode artwork asynchronously |
| Bluetooth Classic and LE      | DeviceWatcher with connected-device selectors       | Added/Removed/Updated events maintain the connected set                   |
| Camera and microphone         | RegNotifyChangeKeyValue on ConsentStore             | Re-arm subtree notification before reading capture activity               |

References: [GSMTC events](https://learn.microsoft.com/en-us/uwp/api/windows.media.control.globalsystemmediatransportcontrolssession), [Bluetooth selectors](https://learn.microsoft.com/en-us/uwp/api/windows.devices.bluetooth.bluetoothdevice.getdeviceselectorfromconnectionstatus), [DeviceWatcher](https://learn.microsoft.com/en-us/windows/apps/develop/devices-sensors/enumerate-devices), [registry notification](https://learn.microsoft.com/en-us/windows/win32/api/winreg/nf-winreg-regnotifychangekeyvalue).

## Ownership and lifecycle

`platform/windows/nativeRuntime.cs` owns WinRT objects, listeners, command execution and capture registry notification. `nativeRuntime.ts` compiles the bundled source with the installed .NET Framework compiler once per source hash, caches the executable in the user's temporary directory, and supervises its JSON-lines transport. No Windows SDK or additional runtime is downloaded. The source file is passed by path to keep the compiler launch within Windows command-line limits.

The transport shares startup, bounds frames and outstanding requests, correlates responses, and times out a command after five seconds. A crash rejects pending operations and reconnects listeners with bounded backoff. Commands are never replayed automatically. EOF, application shutdown or parent-process exit terminates the executor. Diagnostic records contain fixed reasons/native codes, not protocol payloads or song data.

Media and device adapters interpret native snapshots. The media service owns one observation/recovery schedule for every renderer: events plus a 30-second health read on Windows; one five-second query schedule on current macOS/Linux backends. Opening Settings does not create another media sampler. `onMediaSnapshotChanged` broadcasts automatic/manual selection and native updates to both windows. Devices retain their own native failure scope and a slow cached health check.

Every properties event refreshes artwork, including events whose title/artist/album remain unchanged. A monotonic per-session generation invalidates older metadata and image work immediately; A → B → A does not authorize an old A image to overwrite the new A generation. Track text changes clear the previous cover while the current one loads. Decode failure retains the music placeholder and playback controls.

## Measurements and acceptance

On this Windows host with Folia on 2026-10-14, a warm native read took about 0.2–0.7ms. Pause/play/next/previous command acknowledgements took 2.4–8.4ms; corresponding player state or track events arrived in 22–471ms. The packaged renderer measured about 6–8ms for play/pause acknowledgement. These are local observations; player decoding and notification timing remain part of the end-to-end latency.

Two next/previous cycles matched song metadata and artwork against a separate fresh GSMTC reader, and the renderer image matched the current snapshot. The original track was restored. An interrupted executor produced stale disabled media state and recovered in about 1.16 seconds. Bluetooth/capture initialization returned valid native states; hardware connect/disconnect and actual capture transitions still require matching-device acceptance.

The current macOS dictionary queries and Linux MPRIS backend retain their existing native behavior. Their future event adapters can implement the same optional backend subscription: MPRIS PropertiesChanged/NameOwnerChanged on Linux, and player-specific native notifications on macOS. Core selection, IPC and UI do not need platform branches for that extension.
