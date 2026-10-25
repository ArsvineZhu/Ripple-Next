[简体中文](release.zh-CN.md) · [Development](development.md)

# Release procedure

The [4.1.0-beta.2 release](https://github.com/ArsvineZhu/Ripple-Next/releases/tag/v4.1.0-beta.2) provides Linux x64, Windows x64 and macOS x64/arm64 packages. Versioned notes describe their corresponding packages; maintained guides describe the current application and supported release procedure.

## Publish with one command

Every announcement starts with Highlights, followed by a direct-download table covering all nine packages, a complete product introduction, installation and first-use instructions. Maintain both English and Simplified Chinese editions.

Prepare package.json and paired versioned notes, then integrate the approved release commit into main. With GitHub CLI authenticated and a clean checkout at that commit:

```sh
pnpm release --dry-run
pnpm release
```

The dry run reads the version and renders both notes without creating a tag or publishing. The release command checks the checkout against origin/main, pushes the matching tag, follows CI and reports the published URL. CI runs checks/tests on Linux, Windows and macOS, builds four targets and attaches all nine packages to a regular GitHub Release. Published releases are marked latest, including versions whose names contain a beta suffix.

Run the same command to resume an interrupted release for the same commit. Failed jobs are retried; existing published tags and assets stay unchanged. PR and manual check runs do not publish. A tag push is the publication trigger.

Publication renders English/Simplified Chinese notes through scripts/release-notes.mjs. An unfinished draft can receive its completed build artifacts. For recovery from an existing successful build, the Publish existing release artifacts workflow takes the draft tag and build run ID without rebuilding. Corrections to published packages require a new version.

The website download buttons use the [latest release](https://github.com/ArsvineZhu/Ripple-Next/releases/latest), so future releases need no download-link edits. Website product snapshots and media are refreshed separately; see the [website repository](https://github.com/Arsvine-Devs/ripple-website).

## Commands and artifacts

```sh
pnpm check
pnpm test
pnpm package
pnpm make
node scripts/release-notes.mjs v<version>
```

`package` produces a runnable directory. `make` creates native installers and portable archives on the matching host. Linux needs `cc`, dpkg, fakeroot and rpm; Windows MSI needs WiX; macOS needs Xcode Command Line Tools. Forge builds/ships Linux's inotify executable and the target-architecture macOS window addon. macOS packages use an ad-hoc signature.

Names follow `RippleNext-<OS>[-<macOS arch>]-v<version>[-Portable].<ext>` for DEB/RPM, MSI, DMG and ZIP. Artifacts and temporary build/capture files remain under ignored out/.

## Runtime acceptance

- Launch the package, reopen Settings through the tray/repeated launch, close Settings while retaining Island, then restart and confirm saved preferences/tasks/workflows.
- Verify outside-click pass-through, expansion/page gestures, fractional display geometry, selected monitor and focus/menu/drag collapse guards.
- Check visible-player controls/activation, metadata/artwork matching, long-text restart after collapse, idle/hover artist/control semantics, selection and native-source recovery.
- Exercise workflow target success/failure, search, clipboard copy, task completion, weather and each configured AI protocol/cancellation/partial failure.
- Check font bytes/notices, contextual Chinese, keyboard controls, native color ownership, glass on/off and all guide video playback/seeking/offscreen pause.
- Validate hardware Bluetooth/capture changes on corresponding devices, and macOS behavior on a macOS host. Describe results by actual host and operation.

The closed application's `ripple-next.sqlite` contains preferences, tasks, workflows, quick apps and encrypted credential records. Back it up before moving/updating profiles and verify restored data/key availability. Source schemas and appStateStore own the current persistent structure.

See [platform support](platform-compatibility.md), [architecture](architecture.md) and [capture provenance](assets/screenshots/README.md).
