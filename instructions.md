[简体中文](instructions.zh-CN.md) · [Product overview](README.md)

# Using Ripple Next

Ripple Next puts seven feature pages in a floating Island and configuration in a dedicated settings window. Each launch opens Settings. Launching again focuses the existing instance's settings window. Start with Overview, open a song in your music player, then add the apps and websites you use together as a workflow. The [README](README.md) includes screenshots; this guide explains the controls and the data they use.

## Find your way around

Hover over the Island to reveal **Quick** mode. Click a non-interactive part of it to expand **Large** mode. **Still** is the compact idle state. Buttons and input fields perform their own action instead of toggling the Island.

| Action                     | Control                                                                                  |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| Move between feature pages | Left/Right outside interactive controls, or a horizontal wheel/trackpad gesture          |
| Jump to a visible page     | Ctrl+1 through Ctrl+7, in your configured visible-page order                             |
| Scroll a long page         | Vertical wheel/trackpad scrolling                                                        |
| Choose a music source      | Vertical scrolling in Now Playing; click A/a dot; focus the music area and press Up/Down |
| First/last music page      | Home/End while the music area has focus                                                  |
| Use a dropdown             | Arrow keys and Enter; Escape closes it and returns focus                                 |
| Open Settings              | Launch Ripple again, or use the tray's Settings item                                     |

Settings lets you reorder and hide feature pages and choose a default. Now Playing becomes available when Ripple detects a supported media session. Settings lives outside the Island's page navigation. If every available page is hidden, Overview remains reachable. One continuous horizontal gesture moves one feature page; feature navigation wraps around. Music source navigation stops at the first and last card.

## Search and open addresses

Enter a query in Browser Search and submit it to open your system default browser. HTTP(S) addresses open directly. In Settings, configure a search URL template containing `{query}`; Ripple substitutes the encoded query into that placeholder.

A workflow entry such as `localhost:3000/` or `127.0.0.1:3000/admin?view=usage#today` is recognized as a local website and opens with HTTP. Prefer an explicit `http://` or `https://` address for other hosts or when choosing the scheme matters. Opening an address does not start a server: the service must already be listening on that port. Firefox opens when Firefox is your system default browser.

## Build a workflow and pin quick apps

In Settings, give a workflow a name and enter its application/website targets. Separate targets with commas or semicolons; Chinese comma, enumeration comma and semicolon are also accepted. Select the workflow on the Workflows page to launch its targets in order. A failed target shows an error on that workflow, and later targets are still attempted. Retrying clears the old message.

For example, an **API gateway** workflow can contain `localhost:3000/`. A **Reading** workflow can contain two documentation URLs. A workflow is a launch list; it does not execute conditional steps or schedule jobs.

Quick Apps are individual launch buttons on the same page. Choose one of three target types:

| Type                  | What to enter                                                           |
| --------------------- | ----------------------------------------------------------------------- |
| Installed application | Select an app discovered on this operating system                       |
| Custom command        | An executable, one argument per line, and an optional working directory |
| Website               | An HTTP(S) URL                                                          |

Custom commands use separate arguments without a shell. Put arguments in the argument field, not inside the executable path; shell operators such as `&&` are not interpreted. Linux installed apps use desktop entries; Windows uses Start Menu shortcuts and Store identifiers; macOS uses application bundles. Re-select installed-app targets if you move your setup to another OS.

## Control the right music player

Start playback in a supported app, then open Now Playing. Ripple reads song title, artist, cover and available controls from the player. Click the cover to bring the player forward when its platform integration supports opening it. Previous/Play/Pause/Next availability depends on the session's reported capabilities.

With multiple players, the right edge **inside** the Island contains **A** for Automatic and one dot per player. Each page shows the player's name in small text. Click an indicator, scroll vertically, or use the focused music area's Up/Down keys to switch. Each continuous scroll gesture changes at most one card, including its momentum tail. Horizontal gestures still switch feature pages. Cards slide vertically without making the Island taller; the carousel respects reduced-motion preferences.

Automatic prefers an actively playing session, then preserves a suitable playing or paused selection. A player card locks selection to that player for this run until it disappears. Select A to restore automatic choice. With one player in automatic mode, indicators are hidden. With one manually selected player, A and its dot remain so you can return to automatic mode.

While selection is being confirmed, playback controls are disabled. Rapid choices retain the latest requested target; displayed controls always carry that card's session ID. If a player closes, its dot disappears and selection falls back to a valid session. Selection errors stay on the music page.

Covers appear in both the expanded page and QuickView. Missing, unsupported or undecodable images use the music placeholder; changing the player or cover retries loading. Linux supports MPRIS artwork, including extensionless PNG/JPEG/GIF/WebP local files within the 5 MiB limit. Windows uses GSMTC. macOS currently supports running Spotify and Music; Music artwork is not retrieved by the current adapter. See [platform support](docs/platform-compatibility.md) for the limits of each integration.

## Ask your own AI service

In Settings, enter an OpenAI-compatible **Base URL**, the provider's exact **model** name and your **API key**, then save the key. Use the endpoint and credentials supplied by your provider or local gateway. Ripple does not include a paid AI subscription.

Submit a question on AI Assistant. Output streams into the Island with Markdown formatting and copy buttons for code blocks. **Ask another** cancels/resets the current exchange. This is a single-question assistant; it does not save a conversation history. Errors appear on the assistant page.

Questions are sent to the configured service. The API key is encrypted using OS-backed secure storage; its ciphertext is saved in Ripple's database, and the saved key is never sent back to the renderer. On Linux, saving fails if secure encryption is unavailable. The settings field cannot reveal a previously stored key; save an empty key to remove it. The [diagnostics guide](docs/platform-compatibility.md) explains what local logs contain.

## Overview, clipboard and tasks

**Overview** displays the clock, localized date, current weather and battery state. Settings provides 12/24-hour time, system or IANA time zone, weather location and Celsius/Fahrenheit. Weather needs network access to WeatherAPI; battery details depend on the OS and hardware. The minute-only clock updates at minute boundaries.

**Clipboard** collects text during the current run and lets you copy an item back to the system clipboard. It checks every two seconds and when Ripple gains focus. Empty and image-only clipboard values are skipped. Very brief changes between checks may not be captured. History stays in memory and disappears on restart; it continues collecting while the Island is collapsed.

**Tasks** keeps a small persistent task list. Add a task, then mark it complete to remove it from the list. It is intended for the next few things you want to do, without a separate completed-task archive.

## Make the Island yours

Settings groups appearance, interaction and feature configuration in one scrollable page:

- Choose **Default**, **Sleek Black** or **Windows 95**, then adjust text/background colors, a local or remote background image, and the border.
- Choose the display and snap/free positioning. Appearance settings keeps a live Island preview visible. Free-position sliders and arrow keys update and save immediately. Slider endpoints explain their direction; only the large marked stops gently snap on release, with continuous movement between them. Labels sit inside the rounded control, and the rail extends past the inset endpoint stops without changing their minimum/maximum effects. Numeric values are hidden. Horizontal 0% and 100% align with the screen edges; vertical position uses CSS pixels. Expanded corners range from 0 to 60px (default 30px); Windows 95 keeps square corners.
- **Standby** keeps Quick mode visible; **Large Standby** keeps the expanded view. Inactive hiding conceals the idle Island. On macOS you can hide the menu bar icon; Windows and Linux always keep the tray. The Island stays off the Dock and taskbar; on macOS a Dock icon appears only while the Settings window is open. Open Settings from the tray or launch Ripple again; closing Settings keeps the Island running.
- Set the pointer-leave delay from **0–2000 ms**. Re-entering, focusing an input, opening a menu or dragging prevents an unintended collapse.
- Configure launch at login, battery alerts, idle information, weather, search, workflows, quick apps and AI.
- In **General → Language**, choose Follow system, 简体中文, English, 繁體中文 or 日本語. The interface and tray update immediately; preferences and input drafts survive a language switch. User text and AI responses are not translated.

A failed background image shows feedback beside its setting. A launch failure stays beside its app/workflow. Device notifications preserve a page you have expanded.

## Data, troubleshooting and updates

Preferences, workflows, quick apps and tasks are stored in `ripple-next.sqlite` in the **Ripple Next** user-data directory. Only the API-key blob uses secure encryption; the whole database is not encrypted. Ripple Next starts with its own profile and does not import the older Ripple directory. Back up the database with the application closed; encrypted keys may need to be entered again on another machine or OS.

Open **Settings → Diagnostics → Open diagnostics folder** when investigating a failure. Local crash dumps may contain process memory, so inspect them before sharing. See [platform compatibility and troubleshooting](docs/platform-compatibility.md) for missing Linux commands, permissions, browser launches and media support.

Use the [Ripple Next release list](https://github.com/ArsvineZhu/Ripple-Next/releases) and select a `RippleNext-…` package for your OS. The [4.0.0 release notes](docs/releases/4.0.0.en.md) describe this stable version and its history.
