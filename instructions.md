[简体中文](instructions.zh-CN.md) · [Product tour](README.md)

# Using Ripple Next

Ripple Next keeps seven daily-action pages in a floating Island and configuration in a separate Settings window. Launching the application opens Settings; closing that window leaves the Island running. Launching again or using the tray opens the existing settings window.

## Expand, glance and navigate

Hover for quick view; click a noninteractive part of the Island to expand. Buttons and fields perform their own action. Leaving the pointer collapses according to your delay, unless focus, an open menu, a drag or standby behavior keeps it open.

| Action                 | Input                                                                          |
| ---------------------- | ------------------------------------------------------------------------------ |
| Switch feature page    | Left/Right outside interactive controls, or horizontal wheel/trackpad gesture  |
| Jump to a page         | Ctrl+1 through Ctrl+7 outside interactive controls, in your visible-page order |
| Read longer content    | Native vertical scrolling                                                      |
| Choose a player        | Vertical scroll, A/player indicator, or focused Up/Down                        |
| Player first/last page | Focused Home/End                                                               |
| Operate menus          | Arrow keys, Enter, Escape                                                      |
| Operate controls       | Tab focus, Enter/Space, native pointer input                                   |

Feature pages wrap horizontally; player pages stop at their vertical boundaries. One continuous stroke changes one page. Settings can reorder/hide pages and select the default; Overview remains reachable if every available page is hidden. The music page appears when a supported session or media error is available.

Search/task drafts survive page changes and collapse. Enter submits search, a task or an AI question; Shift+Enter adds an assistant-input line. IME confirmation does not submit.

## Search, workflows and quick apps

Search text uses the configured HTTP(S) template containing `{query}`; direct HTTP(S) addresses open in the system browser. Workflow local addresses such as `localhost:3000/` receive HTTP automatically. Opening a URL does not start its server.

Create a workflow in Shortcuts & Workflows: enter a name and one target per row, + adds a row, × removes it. Commas inside addresses remain part of the address. A valid name/first target creates the entry automatically; later valid edits save as entered. Launching runs targets in order, reports each failure at its owner and continues subsequent targets.

Quick apps hold an installed application, HTTP(S) shortcut or executable with one argument per line and an optional working directory. They launch independently of workflows; a workflow can reuse a saved quick app's native identity or command data.

## Music and overview

Start playback in a supported player. Idle displays a shorter track capsule without a playback slot; hover quick view grows, adds play/pause and always shows the artist. Music settings controls idle artist visibility, 3D artwork/intensity and long-text scrolling. Expanded music shows artwork and previous/play/next, and the cover activates its player.

With multiple players, A selects Automatic and each indicator selects a player for this run until it exits. Automatic prefers active playback. Controls address the displayed session; a departed player cannot redirect an old command to another one. A missing cover uses the music placeholder. Long text resumes after returning to a hidden page.

Overview shows time, date, battery and configured weather. Set clock cycle, period display, time zone, Celsius/Fahrenheit and automatic/manual location. Automatic location uses network IP and may reflect VPN/proxy routing; a blank manual location hides weather. Weather credentials use the built-in source or your saved key.

## AI, clipboard and tasks

In Integrations, add a Base URL, choose Chat Completions/Responses/Anthropic, save a credential and bind the exact model identifier. Models have their own system prompt, ordered enabled injections, reasoning/temperature/output settings and local character limit. Select a default model or switch in the assistant.

Submit a question to stream Markdown and copy code using native clipboard actions. Ask another starts a new exchange. Partial failures retain received content; cancellation belongs to the active request. Requests go to your configured service. AI context awareness is unavailable and does not collect desktop content.

Clipboard history collects nonempty text for this run, at most 100 entries/one million characters. Repeats move to the front; the copy button writes the exact entry. Tasks persist until marked complete; completing removes the entry without a completed-task archive.

## Settings, fonts and glass

Settings begins with the keyboard-first guide and actual recordings. The icon rail opens each category; its top button reveals category names and the app version. The last option in General, Translucent sidebar, controls the desktop backdrop independently of control glass and is enabled by default. Chevron rows open editors; the back button restores scroll and focus. Valid ordinary edits save automatically. Credentials require Save/Change; deletion/clearing requires confirmation. A failed native preference operation retains the committed value.

Choose Default, Sleek Black or Windows 95 (W95FA Latin and HYPixel 11px U Chinese); adjust colors/background, display, snap/free placement, corners, borders and behavior. Appearance displays a live Island preview and ends with Show Island border (Debug). Hide Island when inactive is in Behavior. Idle time/battery information opens quick view on hover and the full page on click. Native RGB selection preserves alpha and Cancel retains the color. Windows/Linux keep the tray visible; macOS offers menu-bar visibility.

General → Font arranges built-in, installed and imported fonts in priority order. Move a preferred font above the fonts that supply its missing glyphs; the editable preview shows the combined result. Import TTF, OTF, WOFF or WOFF2 files from any folder. Files are copied unchanged into the app profile, and styles of the same family are grouped together. An explicit font list also overrides theme typography. Explicit Simplified Chinese reveals Standard/Microsoft Chinese/Apple Chinese expression. Playful wording covers contextual hints and empty states, with ordinary technical/critical labels and zh-CN date/number formatting. User content and AI answers are not translated.

Appearance & Position → Liquid Glass (Exp) shows a sticky live preview. Pressed handles become clear lenses, held switches change across the midpoint, and dragging near stops attracts the actual value. Disable Settings glass for ordinary controls. Island glass is unavailable.

## Data and support

Preferences, tasks, workflows, quick apps and encrypted credential records live in `ripple-next.sqlite` in the Ripple Next user-data directory. The whole database is not encrypted. Back it up with the application closed; encrypted keys may require re-entry on a different machine/OS. Linux key saving requires OS-backed encryption.

Settings → About → Diagnostics opens bounded local logs and crash data. Inspect crash dumps before sharing because they can contain process memory. See [platform support](docs/platform-compatibility.md), [diagnostics](docs/diagnostics.md) and the [release page](https://github.com/ArsvineZhu/Ripple-Next/releases).
