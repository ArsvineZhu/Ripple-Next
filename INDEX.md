[简体中文](INDEX.zh-CN.md)

# Repository map

- [Documentation catalog](docs/INDEX.md): development, release and usage guidance.
- [Main process](src/main/README.md): lifecycle, tray, window, IPC and platform services.
- [Preload](src/preload/README.md): isolated renderer bridge.
- [Renderer](src/renderer/README.md): Island shell, feature views, hooks and settings owner.
- [Shared contracts](src/shared/README.md): IPC/domain types and input geometry.
- [Tool configuration](.config/README.md): build, analysis and test configuration.
- [Contribution policy](CONTRIBUTING.md): workflow and documentation synchronization.

`src/assets` contains bundled fonts/icons. `scripts` owns the development launcher. `.config` owns Forge/Vite and installer templates. `.vite`, `out`, reports and dependencies are generated and excluded from Git.

Product entry points: [English](README.md), [简体中文](README.zh-CN.md), [繁體中文](README.zh-TW.md), [日本語](README.ja.md). [Release notes](docs/releases/4.0.0.en.md) summarize 4.0.0; [screenshots](docs/assets/screenshots/README.md) document the captured UI and refresh process.

[Unreleased 4.1.0-beta.1](docs/releases/4.1.0-beta.1.en.md) covers the current PR. [Fonts](src/assets/fonts/alibaba-puhuiti/README.md) and [guide recordings](src/assets/guide/README.md) document bundled resources.
