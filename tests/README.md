[简体中文](README.zh-CN.md) · [Development](../docs/development.md)

# Test ownership

| Directory                                              | Responsibility                                                                                                                                           |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `platform/linux`, `platform/macos`, `platform/windows` | Native adapters, protocols, commands and platform lifecycle. File names omit the redundant platform prefix.                                              |
| `platform/*.test.ts`                                   | Platform selection and native integrations with cases for several operating systems.                                                                     |
| `features/<feature>`                                   | Feature services, hooks, controls and complete user interactions for AI, appearance, clipboard, Island, media, overview, search, settings and workflows. |
| `shared`                                               | Runtime and reusable contracts: lifecycle, persistence, IPC, diagnostics, notices, localization, geometry and common controls.                           |
| `shared/fixtures`                                      | Reusable React host/input helpers.                                                                                                                       |
| `platform/linux/fixtures`                              | Private D-Bus protocol broker; tests never operate the host's real players.                                                                              |
| `features/appearance/fixtures`                         | Independent reference algorithms for glass parity.                                                                                                       |

Run all tests with `pnpm test`, or select an ownership directory, for example `pnpm test tests/platform/linux` or `pnpm test tests/features/media`. Vitest discovers `.test.ts` and `.test.tsx` recursively. DOM tests select happy-dom in their file header; Linux kernel tests skip on other hosts. The inotify test compiles its helper in a temporary directory with `cc`.

Put a test with the contract it protects. Split files that mix platform and feature ownership. Share fixtures when they own repeated resource setup or a reusable behavioral oracle; keep assertions local to the test. Remove identical duplicate cases, and retain distinct concurrency, failure and lifecycle regressions.

The optional media-signal module uses Node ESM tests under `features/media-signals` (outside Vitest’s TS/TSX discovery). Run `node --test tests/features/media-signals/*.test.mjs`; these cover synthetic PCM, binary frame fragments and provider-neutral lyric boundaries.
