[简体中文](release.zh-CN.md) · [Development](development.md)

# Release procedure

Version 4.1.0-beta.1 is prepared in [PR #14](https://github.com/ArsvineZhu/Ripple-Next/pull/14). The user reviews the final code, release notes, screenshots/recordings and package artifacts before approving its merge. Keep the candidate unpublished until that confirmation.

## Approval and publication

The workflow runs checks on Linux, Windows and macOS. PR #14 also builds Linux x64, Windows x64 and macOS x64/arm64 artifacts for review without publishing them.

After the user approves and PR #14 merges into main, the merged-only workflow checks out its merge commit, reruns verification/builds and creates `v4.1.0-beta.1` with a GitHub prerelease and those artifacts. Closing the PR without merging does not publish. An ordinary PR build has no release write permission; publication uses the trusted merged commit, not an unmerged fork head.

Tag pushes matching package.json also run the release path. A release tag and package version must match. Publication consumes both English and Simplified Chinese notes; `scripts/release-notes.mjs` removes the local pending-status line and resolves repository links to the release tag. Repeated delivery keeps an existing release's original artifacts.

## Candidate commands and artifacts

```sh
pnpm check
pnpm test
pnpm package
pnpm make
node scripts/release-notes.mjs v4.1.0-beta.1
```

`package` produces a runnable directory. `make` creates native installers and portable archives on the matching host. Linux needs `cc`, dpkg, fakeroot and rpm; Windows MSI needs WiX; macOS needs Xcode Command Line Tools. Forge builds/ships Linux's inotify executable and the target-architecture macOS window addon. macOS packages use an ad-hoc signature.

Names follow `RippleNext-<OS>[-<macOS arch>][-Portable]-v<version>.<ext>` for DEB/RPM, MSI, DMG and ZIP. Artifacts and temporary build/capture files remain under ignored out/.

## Runtime acceptance

- Launch the package, reopen Settings through the tray/repeated launch, close Settings while retaining Island, then restart and confirm saved preferences/tasks/workflows.
- Verify outside-click pass-through, expansion/page gestures, fractional display geometry, selected monitor and focus/menu/drag collapse guards.
- Check visible-player controls/activation, metadata/artwork matching, long-text restart after collapse, idle/hover artist/control semantics, selection and native-source recovery.
- Exercise workflow target success/failure, search, clipboard copy, task completion, weather and each configured AI protocol/cancellation/partial failure.
- Check font bytes/notices, contextual Chinese, keyboard controls, native color ownership, glass on/off and all guide video playback/seeking/offscreen pause.
- Validate hardware Bluetooth/capture changes on corresponding devices, and macOS behavior on a macOS host. Describe results by actual host and operation.

The closed application's `ripple-next.sqlite` contains preferences, tasks, workflows, quick apps and encrypted credential records. Back it up before moving/updating profiles and verify restored data/key availability. Source schemas and appStateStore own the current persistent structure.

See [platform support](platform-compatibility.md), [architecture](architecture.md) and [capture provenance](assets/screenshots/README.md).
