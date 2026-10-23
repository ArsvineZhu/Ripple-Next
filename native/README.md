[简体中文](README.zh-CN.md) · [Platform support](../docs/platform-compatibility.md)

# Native modules

Linux `linux-events/device_events.c` observes V4L2 opens/closes and hotplug through inotify. It blocks in the kernel while idle, reports bounded event lines and exits when its parent ends. The TypeScript adapter reconciles holders and supervises restart. Forge compiles it with `cc` and ships the executable resource.

macOS `macos-window` is the N-API window-behavior and app-local scroll-phase module built against the configured Node headers. Its bounded event bridge observes only the Island, preserves Chromium event delivery, and removes the observer on shutdown. Windows media/device observation uses the bundled C# executor source in the platform adapter rather than a module here.

Run `pnpm build:native` on the matching host. Build products remain under ignored build/output directories. See [native observation](../docs/native-observation.md) and [development](../docs/development.md).
