# Project scripts

Use the Node version in `.node-version` and install with `pnpm install --frozen-lockfile`.

## Record the product

Install FFmpeg with VP9 encoding and Playwright's recording helper (`pnpm exec playwright install ffmpeg`), then run on a desktop host:

```sh
pnpm capture
```

Set `FFMPEG_PATH` to an executable path when FFmpeg is not on PATH. The command packages the current application, starts the actual Electron windows with a new profile under `out/capture-<version>-<time>/`, records six Settings flows, captures the gallery and encodes the guide clips. `capture/app.cjs` supplies fictional media, clipboard and assistant data; `capture/flows.mjs` operates the real controls. It does not use the installed application's profile or launch demonstration workflow addresses.

Posters are separate screenshots taken after navigation settles. The recording includes native transitions; posters show the settled view. Inspect the clips and images before delivery. English is used except for Chinese-expression demonstrations. Raw footage and timing manifests stay under ignored out/.

Use `pnpm capture --skip-build` only when `.vite` already contains the intended application build. To encode completed footage again without recording:

```sh
pnpm capture --encode out/capture-<version>-<time>
```

After a refresh, update [capture provenance](../src/assets/guide/README.md), the [gallery](../docs/assets/screenshots/README.md) and the [website snapshot](https://github.com/Arsvine-Devs/ripple-website). All JavaScript/TypeScript scripts are covered by `pnpm format` and `pnpm format:check`.

## Publish

Prepare the complete English/Chinese release announcements with Highlights first, a direct-download table for all nine packages, the product introduction and setup instructions. Integrate the approved release commit into main, then run:

```sh
pnpm release --dry-run
pnpm release
```

The script pushes the version tag, waits for cross-platform CI and prints the regular release URL. See the [release procedure](../docs/release.md) for recovery and artifact naming.
