[简体中文](development.zh-CN.md) · [Architecture](architecture.md)

# Development

Use Node `22.23.3` from [.node-version](../.node-version) and pnpm `12.9.1` from package.json. Install with the committed lockfile. Native packaging runs on the corresponding host: Linux uses cc, dpkg, fakeroot and rpm; Windows MSI uses WiX; macOS uses Xcode Command Line Tools.

```sh
pnpm install --frozen-lockfile
pnpm start
pnpm check
pnpm test
pnpm package
pnpm make
```

Linux development requires a working Chromium sandbox. A matching installed helper can be supplied through `CHROME_DEVEL_SANDBOX`; the helper is root-owned with mode 4755. Forge starts the transparent window through X11/XWayland. Restart the application after main/preload changes.

## Commands and configuration

| Command                   | Purpose                                                       |
| ------------------------- | ------------------------------------------------------------- |
| `start`                   | Forge/Vite development and native resource generation         |
| `typecheck`               | Strict main, preload, renderer and tools TypeScript projects  |
| `lint`                    | Oxlint correctness, Hooks and layer boundaries; warnings fail |
| `format` / `format:check` | Prettier write/read-only verification                         |
| `deadcode`                | Knip entries, exports and dependencies                        |
| `duplicates`              | JSCPD production-source duplicate analysis                    |
| `check`                   | All read-only static checks                                   |
| `test`                    | Recursive Vitest `.test.ts`/`.test.tsx` suites                |
| `build:native`            | Host-native listener/window module build                      |
| `package` / `make`        | Runnable package/native installers and archives               |

[.config](../.config/README.md) owns movable tool configuration. Root manifests, lockfile, pnpm-workspace.yaml and editor/Git discovery files remain at their required locations. Vite transpiles; the scoped compiler projects perform type checking. Runtime-neutral shared modules cannot import runtime services; renderer cannot import Node, Electron or main/preload.

## Profiles, state and native integrations

Development uses `Ripple Next Development`; installed builds use `Ripple Next` under Electron app-data. State, caches and credentials are separate, while the native lock keeps one application instance. Linux resolves the lock through the home-based configuration directory. Launching again opens Settings.

The current SQLite schema and prepared statements belong to appStateStore. Main reads a validated committed snapshot and atomically updates affected rows/lists. Related AI graph and encrypted credential changes share a transaction. Read/write failures preserve durable data. Renderer initializes from the bridge and submits typed patches.

Windows media/devices use the persistent native executor. Linux media/Bluetooth use the bundled D-Bus client; PipeWire uses `pw-dump --monitor --no-colors`, PulseAudio-only systems use `pactl subscribe`, and V4L2 events use the bundled inotify executable with event-triggered `fuser` reads. Forge compiles the Linux executable and target-architecture macOS window addon and ships them as native resources.

## Validation and capture

Tests follow [platform, feature and shared ownership](../tests/README.md). Use `pnpm test tests/platform/linux` or `pnpm test tests/features/media` for a focused suite. Kernel-only cases skip unsupported hosts; private brokers and fixtures isolate system/player operations.

Use a separate profile and reserved demo content for recordings. Capture actual renderer flows in English, except Chinese-expression demonstrations, and review each image/video. Run pnpm capture for the maintained recording flows in scripts/capture. Install FFmpeg with VP9 encoding and the Playwright recording helper first; see [script usage](../scripts/README.md). Raw footage and timing manifests belong under ignored out/. Preserve font bytes, vendor algorithms and their original notices.

See [usage](../instructions.md), [platform support](platform-compatibility.md), [native observation](native-observation.md), [diagnostics](diagnostics.md) and [release](release.md).
