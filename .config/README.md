[简体中文](README.zh-CN.md) · English is canonical.

# Tool configuration

Forge/Vite/Vitest, scoped TypeScript projects, Oxlint, Knip, Prettier and JSCPD configuration live here. Package scripts select their configuration files explicitly. `templates` owns Linux desktop/RPM packaging, and `entitlements.plist` owns macOS signing permissions.

Root `tsconfig.json` is the editor project entry; compiler options and scoped projects live here. Git/editor discovery files, `.node-version`, manifests and lockfiles remain at the repository root. pnpm requires `pnpm-workspace.yaml` there for project settings; Electron Forge requires the hoisted linker, and approved install scripts are declared in `allowBuilds`. `.github/workflows` remains GitHub's discovery location.

Paths consumed by pnpm tasks and analysis tools refer to the repository root. TypeScript `include`/`extends`, schemas and ignore-file paths are relative to their configuration files. Forge resolves resources from `projectRoot` rather than the configuration directory.

See [development](../docs/development.md) and the [repository map](../INDEX.md).

Windows MSI configuration supplies the bundled `.ico`, points the installer at `ripple-next.exe` (the packaged `executableName`), and uses `com.arsvinezhu.ripple-next` as the shortcut AppUserModelID. `allowBuilds` disables the unused native EXE icon extractor; installer creation uses the supplied icon directly.

Forge ships `src/assets/third-party/liquid-glass-notices.txt` as an extra resource. Pinned glass vendor sources retain their original formatting and are excluded from lint, format, Knip and duplication reports; the scoped TypeScript checks still include them.

Main, preload and renderer builds retain sourcemaps and readable generated code. The main diagnostic formatter resolves adjacent maps inside .vite only and caches at most 16 mappings; generated maps remain part of packages, excluded from Git.

Forge generateAssets builds the host-native resource for the target architecture before bundling. Version tags matching package.json trigger verified platform packages and publication; see the [release procedure](../docs/release.md). Native resources live outside ASAR.
