[简体中文](platform-compatibility.zh-CN.md)

# Platform support and troubleshooting

Ripple Next shares one interface and state format across Windows, macOS and Linux. Native adapters connect that interface to each operating system's media sessions, installed applications, devices and startup services.

## Native integrations

Color fields open the operating system's picker through Settings-only IPC: Windows uses `ColorDialog` in a hidden STA PowerShell host, macOS uses AppleScript `choose color`, and Linux uses kdialog on KDE or zenity on other desktops, falling back when the preferred executable is missing. Install either `zenity` or `kdialog` for Linux color selection. The native chooser edits RGB; existing CSS alpha is preserved. Cancel leaves the saved color unchanged. Closing Settings aborts the dialog helper. Only one picker is active at a time.

API references: [Windows ColorDialog](https://learn.microsoft.com/dotnet/api/system.windows.forms.colordialog), [macOS color prompt](https://developer.apple.com/library/archive/documentation/LanguagesUtilities/Conceptual/MacAutomationScriptingGuide/PromptforaColor.html), [KDE dialogs](https://develop.kde.org/docs/administration/kdialog/).

| Feature              | Windows                                                | macOS                                                            | Linux                                                        |
| -------------------- | ------------------------------------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------ |
| Music                | GSMTC sessions, capabilities and artwork               | Running Spotify and Music through AppleScript, including artwork | MPRIS over session D-Bus, capabilities and artwork           |
| Open a player        | Cached app identity/path                               | Activate the running application                                 | MPRIS Raise or same-owner tray Activate                      |
| Installed quick apps | Start Menu `.lnk` files and Store identifiers          | System/shared/user Applications, including Utilities             | XDG desktop entries launched with `gio launch`               |
| Launch at login      | Native login settings for packaged apps                | Native login items for packaged apps                             | `ripple-next.desktop` in the active XDG autostart directory  |
| Transparent input    | Native cursor/bounds with click-through outside Island | Electron click-through outside Island                            | X11 `ShapeInput` through XWayland                            |
| Device status        | WinRT Bluetooth; camera/microphone registry probes     | Bluetooth and capture-device registry probes                     | BlueZ D-Bus, inotify + `fuser`, PipeWire / PulseAudio events |

A player must publish a supported session to appear. Controls follow its reported capabilities. macOS discovers supported Spotify/Music players rather than arbitrary system media sessions. Camera/microphone indicators reflect the available OS or driver probes.

## Music covers and multiple players

Linux artwork comes from `mpris:artUrl`. Local files are read within a 5 MiB limit. Recognized filename extensions determine the format; when the extension is unknown, PNG/JPEG/GIF/WebP signatures determine the data-URL MIME type. Missing, oversized or unreadable files leave the song and controls available. Renderer decode failures show the music placeholder; a different session or artwork URL resets that failure.

Linux caches the MPRIS `CanRaise` capability. When it is false, as reported by Folia, or `Raise` fails, Ripple calls `org.kde.StatusNotifierItem.Activate` at `/StatusNotifierItem` on the same D-Bus unique owner. This activates the existing tray-backed instance without starting an application process. If neither activation interface is available, the music page shows an opening error. An expired session cannot redirect activation to a replacement owner.

Windows reads metadata, artwork and controls through the shared typed GSMTC CLR bridge. WinRT `IAsyncOperation<T>` values are converted with `AsTask` before awaiting. macOS queries the dictionaries of running Spotify/Music separately, avoiding requests to locate an uninstalled player.

The media service owns selection. Automatic favors an active player and preserves a suitable selection; manual selection lasts for this run until that session disappears. Linux IDs include the unique D-Bus owner, so a newly started process is a distinct session. Playback commands carry the visible card's session ID. A closed session never redirects an old command to another player.

The music page presents A followed by stable player dots. Continuous vertical gestures change one card; horizontal gestures change feature pages. Selection requests are serialized and rapid input retains the latest target. See the [usage guide](../instructions.md) for keyboard controls and single-player behavior.

## Linux setup and recovery

Ripple runs its transparent window on X11/XWayland. The window occupies the selected display's work area; only `ShapeInput` follows the animated Island. Preserve the statically bundled X11 client and `--ozone-platform=x11` in autostart entries. Using `ShapeBounding` for animation can produce black flashes. Startup waits for renderer readiness and confirmation of the first input region before showing the window.

Snap players can restrict MPRIS access through AppArmor. A Ripple process launched from an IDE or coding tool can inherit its AppArmor label, causing a player such as Snap Spotify to reject reads while other players remain visible. When D-Bus reports `AccessDenied` with an AppArmor sender label, launch Ripple from the desktop or the normal user session and check the player again.

| Symptom                            | Check or action                                                                                                                                                                                         |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Audio observation tool unavailable | Ripple prefers `pw-dump --monitor --no-colors`, then `pactl subscribe` if the PipeWire tool is absent. On PipeWire, install the distribution's tools providing `pw-dump` if neither command is present. |
| Microphone status is unavailable   | Confirm the chosen audio backend can connect to your user session. PipeWire detection looks for running `Stream/Input/Audio` nodes. The backend choice is retained until Ripple restarts.               |
| Bluetooth/camera probe fails       | Check BlueZ system-bus access and that `fuser` can inspect video devices. A connection or permission error appears in diagnostics.                                                                      |
| Installed app cannot start         | Verify its desktop entry and that `gio launch` is available. Re-select an entry after moving/removing an application.                                                                                   |
| AI key cannot be saved             | Unlock/configure your OS credential service and restart Ripple. The Linux plaintext fallback is rejected.                                                                                               |
| Development sandbox error          | Use a matching Chromium sandbox helper with root ownership and mode `4755`; see [development](development.md).                                                                                          |
| Outside clicks are intercepted     | Check XWayland availability and the first ShapeInput confirmation in local diagnostics. Restart after changing main/preload input code.                                                                 |

Custom commands use executable plus argv without a shell. Workflow local addresses such as `localhost:3000/` are classified as URLs before filesystem paths and open in the default browser. Check the browser association and the service listening on port 3000 if the browser opens but the page fails.

## Windows and macOS behavior

Windows launches shortcuts using their original `.lnk` files to preserve arguments and working directories. Store targets use native Shell activation via PowerShell `Start-Process`. Executables wait for the spawn event. The Windows adapter shares an on-demand discovery promise and keeps results in memory for five minutes. It does not write an installed-apps cache file. Operational feedback stays beside the clicked quick app or workflow.

Windows input compares cursor and Island bounds in DIP, preserves capture while dragging, and releases it outside. The window stays in the work area with an additional 2 DIP edge inset for auto-hide and fractional scaling. Initial display avoids activation; explicit focus requests activate normally. Input listeners and polling are removed once on closure. Windows keeps visible animation active when another app has focus; macOS/Linux retain hidden-window throttling.

macOS discovers bundles without descending into app internals. AppleScript media control can require Automation permission. Login-item registration checks the native result. Use the packaged application; development builds report registration as unavailable. Packages use an ad-hoc signature, and native registration failures keep the committed setting.

The macOS Island uses the native Stationary window behavior to remain in place during Show Desktop and Mission Control. The native module owns the complete collection behavior, including all Spaces and full-screen auxiliary visibility; it excludes the mutually exclusive Transient and Managed flags. Main applies and checks this policy after showing or focusing the Island, because Electron can restore Managed during these transitions. Settings keeps ordinary window behavior. The native probe checks flag readback, hide/show and Settings isolation; verify desktop gestures and Stage Manager visually on the target macOS version.

Reinstall dependencies from the lockfile when switching development hosts. Installed-app identifiers remain platform-specific, so re-select those quick apps after moving a profile. OS-encrypted API keys may also need to be entered again.

## Gestures and feature feedback

Long panels retain native vertical scrolling. Feature pages follow horizontal finger displacement with a fixed input width for each stroke. Axis ownership and the starting page stay fixed until release, including pauses and repeated reversals. A stationary release completes only beyond the visible halfway point; a short deliberate flick uses the final directional run before release, so a reversed flick can reach the opposite neighbor of the original page only when its projected travel overcomes the current offset. Larger offsets require stronger reverse flicks; weaker reversals return to the original page. Either path selects at most one circular neighbor. Raw displacement remains reversible even when the visual rail reaches its one-page bound. A new stroke can interrupt settling without replacing page nodes. Direct manipulation has no easing; release uses a fixed monotone cubic curve at 300 ms per page (minimum 180 ms), independent of finger speed, with zero velocity at both ends; input bounds are measured once after each animation frame's DOM updates.

On macOS, an app-local NSEvent monitor reports scrolling deltas and separate contact/momentum phases only for the Island. Main normalizes coordinates for page zoom and preload validates the payload. Inertia is consumed without adding page distance. The bounded native callback queue cancels an interrupted stream; listeners stop on window/environment teardown. A missing native module falls back to DOM input.

Windows and Linux use DOM wheel deltas (pixel, line and page units) plus Chromium ScrollBegin/ScrollEnd/FlingStart boundaries when available. FlingCancel alone never starts another page gesture. Explicit ScrollBegin keeps contact open until ScrollEnd/FlingStart; idle timers never settle that contact, and subsequent inertia cannot reopen it. Discrete line/page mouse wheels can replace a completed touchpad stream. Sources without phases settle after a quiet burst and suppress the remaining tail until a gap; these sources cannot provide the same physical finger boundaries as AppKit. A capture-phase wheel router observes input before descendant handlers stop bubbling. Scrollable content owns ambiguous diagonals; horizontal ownership suppresses both vertical browser scrolling and descendant wheel handlers. Ownership stays fixed through pauses, direction changes, inertia and scroll edges. Nested scroll controls and vertical strokes retain ownership. Restart after main/preload/native changes; hardware acceptance must cover macOS, Windows Precision Touchpad, Linux X11/Wayland and ordinary wheel devices.

Launch, media, settings and clipboard-copy errors appear beside their owning feature. Battery/device notices preserve a page the user has expanded. The minute clock updates at minute boundaries, and native scrolling avoids a continuous animation loop. Clipboard sampling and native device observation continue while the Island is collapsed.

## Local diagnostics

[Diagnostics](diagnostics.md) describes readable logs, error reasons and codes, operation numbers, per-window context, source frames and trace mode. Diagnostics remain local, bounded and exclude sensitive payloads. Include the operation/session block when reporting a native integration failure.

## Verification

CI runs static checks and tests on Ubuntu, Windows and macOS. Release packaging covers Linux x64, Windows x64 and macOS x64/arm64. Package creation checks build integration; [release acceptance](release.md) specifies the native behavior to exercise on each host.

## Protocol and API references

- [MPRIS metadata and artwork](https://specifications.freedesktop.org/mpris/latest/Track_List_Interface.html#Mapping:Metadata_Map)
- [Microsoft ShellExecuteEx](https://learn.microsoft.com/en-us/windows/win32/api/shellapi/nf-shellapi-shellexecuteexa)
- [PowerShell Start-Process](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/start-process)
- [WinRT AsTask](https://learn.microsoft.com/en-us/dotnet/api/system.windowsruntimesystemextensions.astask)
- [Bluetooth connection selectors](https://learn.microsoft.com/en-us/uwp/api/windows.devices.bluetooth.bluetoothdevice.getdeviceselectorfromconnectionstatus)
- [Electron BrowserWindow](https://www.electronjs.org/docs/latest/api/browser-window)
- [Electron app, GPU status and login items](https://www.electronjs.org/docs/latest/api/app)

Windows also recognizes registered custom desktop AUMIDs, including Folia, through Start applications. The selected identity is cached during reads and activated through its exact AppsFolder entry; ambiguous identities never activate a different player. Music feedback has a separate band below the original content in both expanded and compact modes.

Current Windows media and device observation uses a persistent WinRT/registry executor with change events. Main broadcasts one media snapshot and selection to both renderer windows. Artwork is refreshed on every properties event and guarded by per-session generation. See [native observation](native-observation.md) for event sources, lifecycle and validation.
