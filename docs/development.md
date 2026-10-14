[简体中文](development.zh-CN.md)

# Development

Use Node `22.23.3` from [.node-version](../.node-version) and pnpm `12.9.1` from `package.json`. The current toolchain requires Node 22.13 or newer. Linux packaging needs `dpkg`, `fakeroot`, `rpm` and build tools. Optional system features use `bluetoothctl` and `fuser`. Microphone detection uses `pactl`; when it is missing, Ripple switches to `pw-dump` on PipeWire systems and reads active audio capture streams. The chosen backend is retained until restart. Command/connection failures remain diagnostic errors. Windows MSI creation needs WiX Toolset; macOS packaging needs Xcode Command Line Tools. Run native makers on their matching host.

```sh
pnpm install --frozen-lockfile
pnpm start
pnpm check
pnpm test
pnpm package
pnpm make
```

On Linux, development may need a matching Chromium sandbox helper owned by root with mode `4755`. If Ripple Next is installed from the same Electron build, set `CHROME_DEVEL_SANDBOX=/usr/lib/ripple-next/chrome-sandbox` when starting Forge.

## Tool ownership

`pnpm start` uses the `Ripple Next Development` directory under Electron's app-data directory. Packaged builds keep `Ripple Next`. Development has its own data, Chromium caches and credentials, while both builds share Electron's native instance lock. Launching either build opens the running instance's settings window; only one instance runs at a time. The lock uses the installed profile directory, with Linux resolving it from the home directory so alternate `XDG_CONFIG_HOME` profiles share the same lock.

Tool configuration is centralized in [.config](../.config/README.md); package scripts select each file explicitly.

| Command                   | Contract                                                                                                                                            |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `typecheck`               | Strict main/preload/renderer/tool TypeScript projects; Vite only transpiles                                                                         |
| `lint`                    | Oxlint TS/React/Hooks correctness and import boundaries; warnings fail                                                                              |
| `format` / `format:check` | Prettier writes / checks the configured two-space, LF, single-quote and 100-column style                                                            |
| `deadcode`                | Knip entries, exports and dependencies; Forge constructors expose dynamic makers/plugins                                                            |
| `duplicates`              | JSCPD scans production TS/TSX with the configured threshold                                                                                         |
| `check`                   | All read-only static checks above                                                                                                                   |
| `test`                    | Vitest covers state persistence, secure key storage, IPC, AI streaming, interaction transitions, localization, platform commands and Linux geometry |

Oxlint disables `react/set-state-in-effect` for intentional OS telemetry and preference effects. Renderer imports cannot cross into Node, Electron or main/preload; shared modules cannot depend on runtime services. TypeScript remains the type-checking authority.

## Runtime architecture

Main owns application lifecycle, tray, the transparent window, system effects and typed IPC. Services own state persistence, secure credentials, notifications, AI requests, app discovery/launch and autostart. Platform adapters own native differences. Preload exposes the typed `electronAPI`; shared Zod schemas validate persisted state and launch targets. Renderer owns views and interaction, with XState managing pointer departure, geometry re-entry, focus, menus and drag guards.

The state service stores settings, tasks, workflows, quick apps, and encrypted API-key ciphertext in `ripple-next.sqlite` under the Ripple Next user-data directory. `src/main/database/schema.sql` defines the current tables. `appStateStore.ts` owns prepared statements, reads one main-owned snapshot and commits only the changed setting rows or feature lists. Invalid reads throw; failed writes leave the committed snapshot intact. There is no historical migration chain or schema-version dispatch. Renderer loads a state snapshot before rendering and sends typed patches; it does not use `localStorage` for settings or feature data. API keys use Electron `safeStorage` and are never returned to renderer. Linux refuses to save keys when OS-backed encryption is unavailable. Ripple Next does not read or migrate the old Ripple data directory. Linux autostart uses `$XDG_CONFIG_HOME/autostart` when it is an absolute path, otherwise `~/.config/autostart`.

AI SDK's `streamText` uses the existing OpenAI-compatible adapter for Chat Completions, and explicit OpenAI Responses or Anthropic adapters for the selected numbered endpoint. `aiConfiguration.ts` owns the graph; encrypted keys use `ai-api-key:<id>` records. Main serializes mutations, preserves per-model customization and removes related keys atomically. Ordinary configuration autosaves; credential replacement is explicit. Context limits count characters, and reserved context awareness stays disabled. The built-in system prompt remains in `src/main/prompts/default-assistant.md`. `xstate` and `@xstate/react` own cancellable interaction delays. Custom app commands use `spawn` with argument arrays.

The browser search URL template is persisted in settings and must contain `{query}`; direct HTTP(S) addresses still open as URLs. Clock and date formatting use the selected locale and either the system time zone or a saved IANA zone. Renderer errors are routed to their owning feature and rendered inline; `InlineNotices` uses the Island's existing Motion fade-and-blur transition. Long vertical panels use native scrolling; the AI answer panel grows with its content up to the available screen height. Range controls use the settings CSS Module for themed tracks, thumbs and focus states.

## Page registration

Page identity uses stable strings such as `overview` and `tasks`; its position comes from the saved order. `src/shared/pages.ts` owns built-in metadata and static or context-dependent layout policies. `src/renderer/lib/tabs.tsx` combines those policies with icons and render functions. Register additional definitions when creating the Island page registry, supplying an ID, title, icon, render function and layout. Availability, radius, alignment and collapse behavior are optional page capabilities. Navigation and animation consume the registry. Page identities are named strings throughout the current data contract.

## Local diagnostics

Cross-platform findings, diagnostic fields and native feedback rules are documented in [platform compatibility](platform-compatibility.md). CI checks/tests run on Ubuntu, Windows and macOS. Reinstall dependencies from the lockfile when changing operating systems.

Ripple Next writes `ripple-next.log` under `<userData>/diagnostics/` and stores Electron minidumps in its `crashes/` subdirectory. In Settings, open **Diagnostics** and choose **Open diagnostics folder** to view them. The log transport has a 5 MiB size limit; on startup, crash reports older than 30 days and all but the 10 newest reports are removed.

Crash-report uploads are disabled. Assistant logs record request IDs, lifecycle timing, delta counts and answer length, but never the prompt or answer text. Error records contain the error type and stack frames, not the free-form error message. Treat minidumps as sensitive local data because they are binary process snapshots.

Linux uses a transparent XWayland window sized to the selected display's work area so desktop panels remain visible. Only X11 `ShapeInput` follows the animated Island rectangle; changing `ShapeBounding` can introduce black flashes. The X11 client remains statically imported and bundled. The Island always requests `_NET_WM_STATE_SKIP_TASKBAR` through the existing X11 client. The settings window is a separate normal BrowserWindow. The Island is shown only after renderer readiness and confirmation of the first input region. See [main](../src/main/README.md), [preload](../src/preload/README.md) and [renderer](../src/renderer/README.md).

Forge cleans `.vite` before starting and packaging. Generated `.vite`, `out`, reports and `node_modules` are excluded from Git. The [documentation catalog](INDEX.md) links guides for each audience.

## Working on a release

`pnpm package` produces a runnable directory; `pnpm make` also runs the configured native installer/archive makers. The [release guide](release.md) owns the version/tag process and runtime acceptance. Restart the full application after main or preload changes; renderer hot updates only replace renderer code. Use a separate profile for capture fixtures and disruptive runtime checks.

The [four product READMEs](INDEX.md) introduce features; this guide owns toolchain commands. Update paired technical guides and visible screenshots when behavior changes. [Capture notes](assets/screenshots/README.md) describe the demo-data policy.

## Settings resources

`pnpm package` runs `scripts/collect-licenses.mjs`. It collects installed dependency license notices plus the pinned glass sources into `src/assets/third-party/licenses.json`, and copies Chromium's distributed license HTML to generated `out/license-assets`. Forge includes both resources; Settings loads the metadata first and requests text only for the selected entry. Regenerate after dependency changes. Keep generated output and runtime reports outside Git.

Weather lookup and credentials stay in main. A bounded cache separates location/unit/credential identities and shares concurrent requests; changing a key invalidates its cached result. Renderer refreshes automatic-location previews on entry, focus and once per minute. See the [user guide](../instructions.md) and [glass controls](../src/renderer/components/liquidGlass/README.md) for behavior and recorded UI costs.

## Typography and guide assets

Persisted `uiFont` is validated in shared/fonts.ts and applied per renderer by AppStateProvider. Original WOFF2 font files and their notice live in [Alibaba font resources](../src/assets/fonts/alibaba-puhuiti/README.md); do not convert or subset them. Main/tray use zh-ms/zh-apple, i18next uses valid private BCP 47 identifiers, and Intl uses zh-CN. Curated overlays inherit all unmodified zh-CN keys.

[Guide recording provenance](../src/assets/guide/README.md) owns capture scenes and refresh instructions. Capture actual application actions in a separate demo profile. Camera edits may crop/zoom captured frames; never invent UI frames. Update posters, localized steps and the screenshot gallery together.

## Launch ownership

`shared/launch.ts` owns the Application/LaunchTarget/Workflow contracts. Core apps orchestration consumes `platform/apps.ts`, validates the target array at IPC entry and attempts every target once in order, with indexed failures. Windows, macOS and Linux own native discovery, identity resolution and activation. Windows alone owns its five-minute memory cache; the constructor accepts the discovery cache period. There is no raw name-launch IPC, cache preparation IPC, renderer launch loop or disk app-catalog round trip. QuickAppEditor owns its local draft/search lifecycle; WorkflowEditor reuses the same saved targets, including command argv and working directory.
