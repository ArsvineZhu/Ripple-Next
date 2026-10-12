[简体中文](platform-compatibility.zh-CN.md)

# Platform support and troubleshooting

Ripple Next shares one interface and state format across Windows, macOS and Linux. Native adapters connect that interface to each operating system's media sessions, installed applications, devices and startup services.

## Native integrations

| Feature              | Windows                                                | macOS                                                          | Linux                                                       |
| -------------------- | ------------------------------------------------------ | -------------------------------------------------------------- | ----------------------------------------------------------- |
| Music                | GSMTC sessions, capabilities and artwork               | Running Spotify and Music through AppleScript; Spotify artwork | MPRIS over session D-Bus, capabilities and artwork          |
| Open a player        | Cached app identity/path                               | Activate the running application                               | MPRIS Raise when supported                                  |
| Installed quick apps | Start Menu `.lnk` files and Store identifiers          | System/shared/user Applications, including Utilities           | XDG desktop entries launched with `gio launch`              |
| Launch at login      | Native login settings                                  | Native login items for packaged apps                           | `ripple-next.desktop` in the active XDG autostart directory |
| Transparent input    | Native cursor/bounds with click-through outside Island | Electron click-through outside Island                          | X11 `ShapeInput` through XWayland                           |
| Device status        | WinRT Bluetooth; camera/microphone registry probes     | Bluetooth and capture-device registry probes                   | `bluetoothctl`, `fuser`, and `pactl` or PipeWire `pw-dump`  |

A player must publish a supported session to appear. Controls follow its reported capabilities. macOS does not discover arbitrary system media sessions, and its Music adapter currently retrieves metadata and controls without artwork. Camera/microphone indicators reflect the available OS or driver probes.

## Music covers and multiple players

Linux artwork comes from `mpris:artUrl`. Local files are read within a 5 MiB limit. Recognized filename formats retain their existing support; when the extension is unknown, PNG/JPEG/GIF/WebP signatures determine the data-URL MIME type. Missing, oversized or unreadable files leave the song and controls available. Renderer decode failures show the music placeholder; a different session or artwork URL resets that failure.

Windows reads metadata, artwork and controls through the shared typed GSMTC CLR bridge. WinRT `IAsyncOperation<T>` values are converted with `AsTask` before awaiting. macOS queries the dictionaries of running Spotify/Music separately, avoiding requests to locate an uninstalled player.

The media service owns selection. Automatic favors an active player and preserves a suitable selection; manual selection lasts for this run until that session disappears. Linux IDs include the unique D-Bus owner, so a newly started process is a distinct session. Playback commands carry the visible card's session ID. A closed session never redirects an old command to another player.

The music page presents A followed by stable player dots. Continuous vertical gestures change one card; horizontal gestures change feature pages. Selection requests are serialized and rapid input retains the latest target. See the [usage guide](../instructions.md) for keyboard controls and single-player behavior.

## Linux setup and recovery

Ripple runs its transparent window on X11/XWayland. The window occupies the selected display's work area; only `ShapeInput` follows the animated Island. Preserve the statically bundled X11 client and `--ozone-platform=x11` in autostart entries. Using `ShapeBounding` for animation can produce black flashes. Startup waits for renderer readiness and confirmation of the first input region before showing the window.

Snap players can restrict MPRIS access through AppArmor. A Ripple process launched from an IDE or coding tool can inherit its AppArmor label, causing a player such as Snap Spotify to reject reads while other players remain visible. When D-Bus reports `AccessDenied` with an AppArmor sender label, launch Ripple from the desktop or the normal user session and check the player again.

| Symptom                                | Check or action                                                                                                                                                                                 |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `spawn pactl ENOENT` in an older build | Use the updated build. Current code switches to `pw-dump --no-colors` when `pactl` is missing. On PipeWire, install the distribution's tools providing `pw-dump` if neither command is present. |
| Microphone status is unavailable       | Confirm the chosen audio backend can connect to your user session. PipeWire detection looks for running `Stream/Input/Audio` nodes. The backend choice is retained until Ripple restarts.       |
| Bluetooth/camera probe fails           | Check that `bluetoothctl` / `fuser` exists and can inspect the corresponding device. A connection or permission error appears in diagnostics.                                                   |
| Installed app cannot start             | Verify its desktop entry and that `gio launch` is available. Re-select an entry after moving/removing an application.                                                                           |
| AI key cannot be saved                 | Unlock/configure your OS credential service and restart Ripple. The Linux plaintext fallback is rejected.                                                                                       |
| Development sandbox error              | Use a matching Chromium sandbox helper with root ownership and mode `4755`; see [development](development.md).                                                                                  |
| Outside clicks are intercepted         | Check XWayland availability and the first ShapeInput confirmation in local diagnostics. Restart after changing main/preload input code.                                                         |

Custom commands use executable plus argv without a shell. Workflow local addresses such as `localhost:3000/` are classified as URLs before filesystem paths and open in the default browser. Check the browser association and the service listening on port 3000 if the browser opens but the page fails.

## Windows and macOS behavior

Windows launches shortcuts using their original `.lnk` files to preserve arguments and working directories. Store targets use native Shell activation via PowerShell `Start-Process`. Executables wait for the spawn event. App discovery shares concurrent rebuilds and writes its cache atomically. Operational feedback stays beside the clicked quick app or workflow.

Windows input compares cursor and Island bounds in DIP, preserves capture while dragging, and releases it outside. The window stays in the work area with an additional 2 DIP edge inset for auto-hide and fractional scaling. Initial display avoids activation; explicit focus requests activate normally. Input listeners and polling are removed once on closure. Windows keeps visible animation active when another app has focus; macOS/Linux retain hidden-window throttling.

macOS discovers bundles without descending into app internals. AppleScript media control can require Automation permission. Login-item registration checks the native result and requires a packaged, signed and notarized application for reliable registration. Current packaging uses an ad-hoc signature; development builds report registration as unavailable.

Reinstall dependencies from the lockfile when switching development hosts. Installed-app identifiers remain platform-specific, so re-select those quick apps after moving a profile. OS-encrypted API keys may also need to be entered again.

## Gestures and feature feedback

Long panels use native vertical scrolling. Horizontal feature navigation advances one circular neighbor per continuous stream, with stable page keys, continuous animation, blur, size interpolation and bounded elastic displacement. Small cross-axis drift is tolerated; a substantial vertical stroke keeps ownership of the content.

Main forwards coalesced Chromium `gestureScrollBegin` / `gestureFlingCancel` boundaries through a timestamp-only preload event. A 150 ms quiet gap and sustained-tail/rising-input rules handle sources without native boundaries. A renderer hot update cannot install a changed main/preload listener: restart the application to test those paths.

Launch, media, settings and clipboard-copy errors appear beside their owning feature. Battery/device notices preserve a page the user has expanded. The minute clock updates at minute boundaries, and native scrolling avoids a continuous animation loop. Clipboard/device polling continues while the Island is collapsed.

## Local diagnostics

Open **Settings → Diagnostics → Open diagnostics folder**. Files live under `<userData>/diagnostics/`; on Windows this is normally `%APPDATA%\Ripple Next\diagnostics`.

Main and renderer share a session ID. Records include runtime versions, display scales, native backend and secure-storage availability, window/process lifecycle, suspend/resume, display changes, GPU status, and IPC channel/outcome/duration. Healthy polling logs its first result. Repeated identical failures are counted and limited to one record per minute, followed by recovery.

Errors retain stack frames, codes, signals and bounded causes; Windows native errors can include HRESULT. AI records include request IDs, timing, delta counts and answer length. Commands/output, IPC arguments/results, app targets, endpoint URLs, keys, clipboard text, prompts and answers are excluded. The main log rotates at 5 MiB.

Crash uploads are disabled. Startup removes dumps older than 30 days and retains the 10 newest `.dmp` files across Crashpad subdirectories while preserving metadata. Minidumps contain process snapshots: inspect them before sharing. For an issue, include Ripple version, OS/desktop, the failing operation, reproduction steps and relevant sanitized records.

## Verification

CI runs static checks and tests on Ubuntu, Windows and macOS. Release packaging covers Linux x64, Windows x64 and macOS x64/arm64. Package creation checks build integration; [release acceptance](release.md) specifies the native behavior to exercise on each host.

The October 2026 Linux changes were validated with the full checks/tests, Linux packaging, extensionless artwork, a real default-browser workflow launch, and PipeWire capture activity returning to idle. Product screenshots use the actual Linux renderer with a separate demo profile. Earlier Windows adaptation included native Shell/WinRT probes and packaged-renderer launch/clipboard checks. New Windows/macOS releases still run the matching-host checklist.

## Protocol and API references

- [MPRIS metadata and artwork](https://specifications.freedesktop.org/mpris/latest/Track_List_Interface.html#Mapping:Metadata_Map)
- [Microsoft ShellExecuteEx](https://learn.microsoft.com/en-us/windows/win32/api/shellapi/nf-shellapi-shellexecuteexa)
- [PowerShell Start-Process](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/start-process)
- [WinRT AsTask](https://learn.microsoft.com/en-us/dotnet/api/system.windowsruntimesystemextensions.astask)
- [Bluetooth connection selectors](https://learn.microsoft.com/en-us/uwp/api/windows.devices.bluetooth.bluetoothdevice.getdeviceselectorfromconnectionstatus)
- [Electron BrowserWindow](https://www.electronjs.org/docs/latest/api/browser-window)
- [Electron app, GPU status and login items](https://www.electronjs.org/docs/latest/api/app)
