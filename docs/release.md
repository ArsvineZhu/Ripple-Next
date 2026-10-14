[简体中文](release.zh-CN.md)

# Packaging and release acceptance

The product identity is **Ripple Next**, package name `ripple-next`, and macOS bundle ID `com.arsvinezhu.ripple-next`. Use the pinned Node/pnpm toolchain from the [developer guide](development.md).

## Build a package

```sh
pnpm check
pnpm test
pnpm package
pnpm make
```

`package` creates a runnable application directory in `out`; `make` creates distributable installers/archives in `out/make`. Run the matching native makers on their host. Linux needs DEB/RPM tooling, Windows MSI needs WiX, and macOS needs Xcode Command Line Tools. Installer prerequisites belong in the developer guide.

| Build             | Distribution           |
| ----------------- | ---------------------- |
| Linux x64         | DEB, RPM, portable ZIP |
| Windows x64       | MSI, portable ZIP      |
| macOS x64 / arm64 | DMG, portable ZIP      |

Installers and Actions artifacts use `RippleNext-<platform>` names. Keep generated output out of Git.

## Prepare and publish a version

1. Distill the integrated changes into matching `docs/releases/<version>.en.md` and `.zh-CN.md` notes. [4.0.0](releases/4.0.0.en.md) is an example. Keep previously published notes tied to their packages.
2. Set the intended package version, verify dependency/lockfile consistency, and synchronize the four product READMEs, screenshots and affected guides.
3. Run checks, tests and the applicable package/runtime acceptance below.
4. Push `v<version>` only when publication is intended. The tag must match `package.json`.

Pull requests to `main`/`master` run checks/tests on Ubuntu, Windows and macOS. A matching `v*` tag runs the Linux x64, Windows x64 and macOS x64/arm64 packaging matrix, then creates the GitHub Release. A version suffix such as `-beta.2` produces a prerelease. Manual workflow dispatch on a matching version tag can retry the workflow.

When both versioned language-note files exist, CI combines them. If neither exists, it uses GitHub-generated notes. A single note file fails publication. The English/Simplified Chinese beta.1 and beta.2 notes are listed in the [catalog](INDEX.md). Direct users to the Ripple Next release/tag: GitHub's Latest pointer may still identify an older Ripple version.

## Runtime acceptance

Exercise these behaviors in a runnable package, using a separate test profile for destructive data/credential operations:

| Area                  | Acceptance                                                                                                                                                                                         |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Startup/window        | Tray Show/Hide/Quit, launch at login, transparent Island, work-area positioning, outside clicks, normal shutdown                                                                                   |
| Modes/input           | Hover/click, repeated expand/collapse, 0–2000 ms leave delay, re-entry/menu/focus/drag cancellation, geometry re-entry after moving/shrinking                                                      |
| Navigation            | Left/Right, Ctrl-number visible order, one-page horizontal strokes, momentum tails, reversal, native vertical scroll and retained scroll position                                                  |
| Personalization       | Four UI languages and tray, themes/background decode errors, displays, snap/free position, page order/visibility/default, settings after restart                                                   |
| Launching             | Installed app, executable with separate argv/cwd, HTTP(S) quick app, ordered workflow including a failed target; local `localhost:3000/` with query/fragment opens in default browser              |
| Music                 | Automatic A and manual dots, single-player indicator rules, stable order, new/closed sessions, identical song titles across players, latest rapid selection and matching control ID                |
| Music gestures/covers | Vertical vs horizontal ownership, one card per continuous stroke, keyboard focus/Up/Down/Home/End, reduced motion, expanded/QuickView covers, failed-cover recovery and Linux extensionless images |
| Assistant             | Base URL/model/key, OS-backed storage, streamed Markdown/code copy, cancellation/reset, errors and key removal                                                                                     |
| Daily tools           | Clock/time zone, weather/location/unit, battery/device notices while expanded, session clipboard read/copy, persisted task add/completion                                                          |
| Diagnostics           | Shared session, failure/recovery, folder opening, log rotation/dump retention, absence of content/keys/endpoints in logs                                                                           |

Controls disabled during selection must become available for the confirmed player. A disappearing player must remove its dot and return to a valid selection. On Linux with `pactl` absent, exercise PipeWire capture starting and stopping; confirm repeated polling uses the fallback without missing-command spam.

## Platform-specific checks

Linux startup remains hidden until renderer readiness and queried ShapeInput confirmation. Test click-through across viewport edges and repeated animation; preserve statically bundled X11 and `--ozone-platform=x11` in autostart entries. Desktop launch uses `gio launch`. RPM staging retains the root-owned SUID sandbox helper.

Windows validates original shortcut arguments/cwd, Store Shell activation, executable failure feedback, GSMTC artwork/controls and auto-hide taskbar edges. macOS validates Automation permissions, running Spotify/Music, display/Dock behavior and login-item registration. Reliable macOS login items require signing/notarization; current packaging uses an ad-hoc signature.

Record package creation, automated tests and native runtime observations separately, including OS, architecture and tested operations. Hardware/media alerts require an actual source/device. Screenshot demo data illustrates presentation; runtime acceptance exercises live adapters.

## Persistence during an update

Ripple Next stores preferences, tasks, workflows, quick apps and OS-encrypted API-key ciphertext in `ripple-next.sqlite` under its user-data directory. Numbered migrations live in `src/main/database/migrations/`; runtime SQL lives in `.sql` resources. Verify state survives an update and key availability is reported correctly. The old Ripple profile is separate. Linux autostart changes only its own `ripple-next.desktop` in the active XDG autostart directory.

See [platform support](platform-compatibility.md) for native integration and diagnostic detail, and [screenshot capture notes](assets/screenshots/README.md) when refreshing promotional assets.

## 4.1.0-beta.1 acceptance additions

The current branch is unreleased; [beta notes](releases/4.1.0-beta.1.en.md) own its scope. Verify Font selection in Settings and Island, persistence after restart, original WOFF2 loading, and all three explicit Simplified Chinese expressions with unchanged numeric/date formatting. Review the keyboard-first guide, decode all four videos, pause offscreen and when switching sections, and confirm only one video plays. Check glass defaults/live preview, disabled ordinary controls, held switch dragging, slider attraction and rounded fill, confirmation entry/exit, About hero and non-draggable artwork. Keep native macOS/Linux acceptance separate from Windows renderer checks.
