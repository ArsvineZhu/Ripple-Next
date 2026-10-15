[简体中文](native-observation.zh-CN.md) · [Architecture](architecture.md)

# Native observation and commands

Main owns one media snapshot and source selection for both windows. Platform adapters own native subscriptions, caches and preparation; commands address the displayed session and are never automatically replayed. Metadata/artwork work stays outside the playback command path.

## Event and sampling sources

| Platform/source               | Native owner                                         | Update behavior                                                                                             |
| ----------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Windows media                 | GSMTC manager and session events                     | Reconcile sessions/current source; publish playback/capabilities and metadata; decode covers asynchronously |
| Windows Bluetooth             | Classic/LE DeviceWatcher                             | Maintain connected-device state from added/removed/updated events                                           |
| Windows camera/microphone     | ConsentStore registry notification                   | Re-arm subtree notification, then read capture activity                                                     |
| Linux media                   | MPRIS NameOwnerChanged/PropertiesChanged             | Maintain unique-owner sessions and apply property changes to cached metadata                                |
| Linux Bluetooth               | BlueZ ObjectManager/Device1 signals                  | Read the connected set on service/device changes                                                            |
| Linux microphone/portal video | `pw-dump --monitor --no-colors`                      | Apply incremental node patches/removals; running input streams determine activity                           |
| PulseAudio-only microphone    | `pactl subscribe`                                    | If pw-dump is absent, coalesce source-output/server events into state reads                                 |
| Linux V4L2 camera             | Bundled C inotify listener                           | Watch video opens/closes and hotplug, then reconcile holders with fuser                                     |
| macOS media/devices           | Running player dictionaries and native device probes | Main owns media fallback sampling; device hooks sample supported probes                                     |
| Battery                       | Chromium battery events                              | Update charge/level directly                                                                                |

Healthy Windows/Linux event backends do not periodically sample. The device hook subscribes once and repeats a read if another event arrives during a pending read. Clipboard text uses a separate bounded two-second/focus sampler.

## Metadata and image lifetime

MPRIS IDs include their unique owner, preventing a stale command from targeting a replacement player. Signals update metadata immediately. Local files are recognized by extension or image signatures and bounded to 5 MiB. Metadata publishes first, cover I/O finishes independently and missing/failed covers leave playback available.

Every new cover generation invalidates prior image work, including metadata changes that reuse the same temporary URL. A → B → A does not revive the older A result. Current text clears an obsolete cover while the current image loads. Renderer decode failure displays the music placeholder and retries on a changed session/source.

## Supervision and cleanup

Windows nativeRuntime.ts supervises a persistent MTA process and bounded JSON-lines requests. It compiles bundled C# once per source hash using the system compiler. Startup, frame/request limits and five-second command deadlines bound the transport. Failure rejects pending requests and restarts observation with backoff; EOF/parent/application exit ends the executor.

Linux signalBus.ts owns match rules and replacement D-Bus connections. nativeStream.ts supervises persistent native event sources with startup/frame limits and exponential recovery capped at 30 seconds. pipewire.ts frames incremental JSON and merges node state/property updates. The inotify executable blocks in the kernel while idle and exits on parent death. Forge compiles/packages the Linux listener and target-architecture macOS window addon.

Faults remain local to their player/device. Shutdown removes subscriptions, timers and child processes. Diagnostics contain bounded native codes/reasons rather than song data or protocol frames.

## Validation

Private D-Bus brokers exercise player arrival/departure, property delivery, metadata-before-cover and obsolete generations. Kernel tests trigger actual inotify opens/closes/hotplug on temporary video-named files. Live renderer acceptance checks controls, shared snapshots and animation restart; physical Bluetooth/capture transitions use corresponding hardware.

References: [GSMTC](https://learn.microsoft.com/en-us/uwp/api/windows.media.control.globalsystemmediatransportcontrolssession), [DeviceWatcher](https://learn.microsoft.com/en-us/windows/apps/develop/devices-sensors/enumerate-devices), [registry events](https://learn.microsoft.com/en-us/windows/win32/api/winreg/nf-winreg-regnotifychangekeyvalue), [MPRIS](https://specifications.freedesktop.org/mpris/latest/Player_Interface.html), [BlueZ](https://bluez.readthedocs.io/en/latest/device-api/), [PipeWire](https://docs.pipewire.org/page_man_pw-dump_1.html), [inotify](https://man7.org/linux/man-pages/man7/inotify.7.html).
