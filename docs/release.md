[简体中文](release.zh-CN.md) · [Development](development.md)

# Release procedure

The [4.1.0-beta.2 release](https://github.com/ArsvineZhu/Ripple-Next/releases/tag/v4.1.0-beta.2) provides Linux x64, Windows x64 and macOS x64/arm64 packages. Versioned notes describe their corresponding packages; maintained guides describe the current application and supported release procedure.

## CI and publication

Publish from an approved, reviewed commit on main by pushing a version tag that matches package.json. Tag CI verifies the version, runs checks/tests on Linux, Windows and macOS, builds all four targets, and creates the GitHub Release only after every build succeeds. Tags containing a prerelease suffix create prereleases; ordinary version tags create stable releases.

PR checks do not publish. Manual workflow dispatch runs checks for the selected ref without publishing. For fork contributions, use the version-tag route after integration: `actions/checkout@v7` blocks fork checkout in a `pull_request_target` event, including the workflow's PR #14 merged-event route. Keep that protection enabled.

Publication reads both English/Simplified Chinese notes and resolves repository links to the release tag through `scripts/release-notes.mjs`. An existing release keeps its original artifacts. Preserve published tags and packages; corrections belong to a new version.

For a new release, update package.json and the lockfile together, prepare both versioned notes, obtain publication approval and verify the intended commit before creating/pushing its tag. Confirm the final run succeeds, the tag resolves to that commit, the notes match and all nine assets are uploaded and downloadable. Direct documentation pushes to main do not publish a release.

To publish a prepared regular-release draft from an existing successful build, dispatch **Publish existing release artifacts** with its tag and build run ID. The workflow attaches that run’s packages and publishes the draft without rebuilding.

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
