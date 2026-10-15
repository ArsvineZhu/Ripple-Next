[简体中文](diagnostics.zh-CN.md) · [Development](development.md)

# Diagnosing Ripple Next

Open Settings → About → Diagnostics → Open diagnostics folder. `ripple-next.log` is a readable text log under `<userData>/diagnostics/`; the file rotates at 5 MiB. Electron crash dumps remain in `crashes/`, with the 10 newest reports retained for at most 30 days. Uploads are disabled.

## Read an error

Each record identifies its UTC time, severity, component/window and application session. IPC operations have a number shared by their start, result and nested native/AI failures. A preference rejection names the failing field and its constraints:

```text
2026-10-14 11:05:52.556 UTC ERROR [main/settings] [session 1c43dc57] #21 update-app-state failed (11 ms)
  DiagnosticError: Invalid app state update
  settings.theme: expected default | sleek-black | win95
      at src/main/ipc.ts:...
  Settings category=appearance; page=category root
```

Look for the first failed operation and its cause chain. `ENOENT` means a file/executable was not found; `EACCES` means access was denied. HTTP 401/403 identifies rejected authentication, 429 identifies rate limiting, and 5xx identifies a service failure. Known Windows HRESULTs include a readable native reason. Validation records include field paths and expected types/choices without submitted values. Business failures returned by AI, launch, weather or media are recorded as failures, even when IPC itself returned normally.

Settings errors include their current category/editor. Island errors include page, mode, viewport, measured region and assistant character count. Crash context is kept separately for each window role; a Settings crash does not inherit Island context. React error reports can include their component tree. Adjacent bundled sourcemaps resolve main and renderer stack frames to original source locations. Missing maps keep the generated frame available.

## Choose detail

Default `info` output includes startup, important actions, failures and recovery. Healthy polling and input-region updates stay quiet; continuous numeric preference edits use debug output. Repeated identical polling failures are counted and summarized at most once per minute.

Use `debug` for queries and window lifecycle. Use `trace` for individual operation starts, polling and view/region changes. Both console and file use the same readable format. Restart with one of these settings:

```powershell
$env:RIPPLE_LOG_LEVEL = 'trace'
pnpm start
# After stopping this run:
Remove-Item Env:RIPPLE_LOG_LEVEL
```

```sh
RIPPLE_LOG_LEVEL=trace pnpm start
```

A packaged executable also accepts `--ripple-log-level=trace`; values are `error`, `warn`, `info`, `debug` and `trace`. The flag takes precedence over the environment variable. It changes diagnostics for this run and does not change saved preferences.

## Report a problem

Include the version, OS, steps and the relevant session/operation block, including causes and frames. Keep related lines together using the operation number. Logs record application-authored reasons, validation constraints, runtime exception details and system/HTTP codes. Arbitrary provider/native messages, command output, request/response payloads, credentials, clipboard text, prompts and answers are excluded. This policy applies to trace too. Minidumps are binary memory snapshots; inspect them before sharing.

Renderer reports travel through a bounded, validated preload method to the main logger. Main owns formatting, level filtering, rotation and per-role context. It does not inject a second logging preload or intercept arbitrary renderer console output.
