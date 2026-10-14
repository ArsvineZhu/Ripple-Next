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

In Settings → Shortcuts, choose **Add workflow**, give it a name and enter one application or website per row. Use **+** to add a row and **×** to remove it. A name and at least one target create the workflow automatically; subsequent edits save as you type. Commas remain part of a target. Select a saved entry to edit it. Long names stay inside the list, with two lines in the Island and the full name on hover. Select the workflow on the Workflows page to launch its targets in order. A failed target shows an error on that workflow, and later targets are still attempted. Retrying clears the old message.

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

In Settings → Integrations, configure the connection in this order:

1. **Base URL configuration**: add an OpenAI-compatible Chat Completions, OpenAI Responses or Anthropic endpoint. Enter the Base URL including its API path, for example `/v1`. Each endpoint has a stable number.
2. **API key configuration**: choose that Base URL, add a credential, enter its key and choose **Save**. Existing keys show dots and a **Change** button. Typing a replacement leaves the saved key intact until you choose Change.
3. **Model configuration**: choose a Base URL and one of its saved keys, then enter the provider's exact model identifier and an optional display name. Select the **Current model** used by the Island.
4. **Model customization**: select a numbered model. Its endpoint and identifier stay fixed on this page. Use the built-in system prompt or your own prompt, add named injections, enable/disable them and reorder them. Enabled snippets append to the system prompt in that order and support the same template variables, including `{{product}}`, `{{version}}`, `{{timezone}}` and `{{current_time}}`.

Temperature, reasoning and output settings start with the provider's defaults. Available parameters depend on the selected model. Anthropic also provides adaptive or budgeted thinking; its thinking budget must leave room within the output limit. The **Local context limit** is measured in characters and covers the system prompt, enabled injections and current question; exceeding it stops the request locally. **Context awareness** is reserved and disabled. Ordinary configuration changes save automatically. Removing a Base URL removes its associated keys and models; removing a key retains model customization so another key can be assigned. Use the endpoint and credentials supplied by your provider or local gateway. Ripple does not include a paid AI subscription.

Submit a question on AI Assistant. Output streams into the Island with Markdown formatting and copy buttons for code blocks. **Ask another** cancels/resets the current exchange. This is a single-question assistant; it does not save a conversation history. Errors appear on the assistant page.

Questions are sent to the configured service. The API key is encrypted using OS-backed secure storage; its ciphertext is saved in Ripple's database, and the saved key is never sent back to the renderer. On Linux, saving fails if secure encryption is unavailable. The editor cannot reveal a previously stored key; **Remove API key** deletes it. The [diagnostics guide](docs/platform-compatibility.md) explains what local logs contain.

## Overview, clipboard and tasks

**Overview** displays the clock, localized date, current weather and battery state. Settings provides 12/24-hour time, system or IANA time zone, weather location and Celsius/Fahrenheit. With 12-hour time enabled, **Show A.M. / P.M.** starts off. When enabled, the expanded clock places the localized day period in the smaller date line; Chinese uses 上午/下午 after the date. In the location editor, choose automatic IP-based location to see the detected city and region, or enter city, region and country separately. These edits save automatically. Automatic location uses [WeatherAPI's IP lookup](https://www.weatherapi.com/docs/request-parameters/); a VPN or proxy can change the estimated place. Leaving the manual location blank disables weather. **Use built-in API** uses Ripple's bundled WeatherAPI credential; turning it off reveals an editor for your own encrypted key, which requires Save/Change. Weather needs network access to WeatherAPI; battery details depend on the OS and hardware. The minute-only clock updates at minute boundaries.

**Clipboard** collects text during the current run and lets you copy an item back to the system clipboard. It checks every two seconds and when Ripple gains focus. Empty and image-only clipboard values are skipped. Very brief changes between checks may not be captured. History stays in memory and disappears on restart; it continues collecting while the Island is collapsed.

**Tasks** keeps a small persistent task list. Add a task, then mark it complete to remove it from the list. It is intended for the next few things you want to do, without a separate completed-task archive.

## Make the Island yours

Settings opens on **User guide**, with keyboard controls first, followed by real recordings of font/language, glass, workflow and AI editing. Rows with **>** open secondary editors. Their glass capsule back button stays at the top left and responds to the mouse; returning restores the previous page's scroll and focus. Ordinary edits save automatically; credentials require Save/Change. Conditional rows and page entry/return animate; reduced motion switches immediately. **About → Third-party licenses** lists shipped components and their license notices.

The main controls are:

- Choose **Default**, **Sleek Black** or **Windows 95**, then adjust text/background colors, a local or remote background image, and the border.
- On/off settings use sliding switches; their labels describe the enabled effect, such as **Show the Island border**. The 12-hour clock switch uses 24-hour time when off; Celsius uses Fahrenheit when off. Multi-option menus have right-aligned closed values and animated glass cards with left-aligned names and descriptions. Color fields have a plain swatch and value: click to open the system color picker. Cancel keeps the color; choosing RGB preserves its existing alpha. Linux requires zenity or kdialog.
- Choose the display and snap/free positioning. Appearance settings keeps a live Island preview visible. Free-position sliders and arrow keys update and save immediately. Slider endpoints explain their direction; during dragging, nearby marked stops attract the actual value smoothly; continued dragging leaves the stop. Labels sit inside the rounded control, and the rail extends past the inset endpoint stops without changing their minimum/maximum effects. Numeric values are hidden. Horizontal 0% and 100% align with the screen edges; vertical position uses CSS pixels. Expanded corners range from 0 to 60px (default 30px); Windows 95 keeps square corners.
- **Keep the Island quick view open** keeps Quick mode visible; **Keep the full Island page open** keeps the expanded view when quick-view standby is off. **Hide Island when inactive** conceals the idle Island. On macOS you can hide the menu bar icon; Windows and Linux always keep the tray. The Island stays off the Dock and taskbar; on macOS a Dock icon appears only while the Settings window is open. Open Settings from the tray or launch Ripple again; closing Settings keeps the Island running.
- Set the pointer-leave delay from **0–2000 ms**. Re-entering, focusing an input, opening a menu or dragging prevents an unintended collapse.
- Configure launch at login, battery alerts, idle information, weather, search, workflows, quick apps and AI.
- In **General → Language**, choose Follow system, 简体中文, English, 繁體中文 or 日本語. The interface and tray update immediately; preferences and input drafts survive a language switch. User text and AI responses are not translated.

A failed background image shows feedback beside its setting. A launch failure stays beside its app/workflow. Device notifications preserve a page you have expanded.

## Data, troubleshooting and updates

Preferences, workflows, quick apps and tasks are stored in `ripple-next.sqlite` in the **Ripple Next** user-data directory. Only the API-key blob uses secure encryption; the whole database is not encrypted. Ripple Next starts with its own profile and does not import the older Ripple directory. Back up the database with the application closed; encrypted keys may need to be entered again on another machine or OS.

Open **Settings → Diagnostics → Open diagnostics folder** when investigating a failure. Local crash dumps may contain process memory, so inspect them before sharing. See [platform compatibility and troubleshooting](docs/platform-compatibility.md) for missing Linux commands, permissions, browser launches and media support.

Use the [Ripple Next release list](https://github.com/ArsvineZhu/Ripple-Next/releases) and select a `RippleNext-…` package for your OS. The [4.0.0 release notes](docs/releases/4.0.0.en.md) describe this stable version and its history.

## Experimental Liquid Glass

Open **Appearance & Position → Liquid Glass (Exp)** to adjust the material and pointer response. Settings starts enabled. Compact sliders and switches have white resting capsules and expand into clear lenses as soon as pressed; tracks remain distinct. Track clicks animate; dragging attracts nearby stops before release. Switches change state when dragged across the midpoint while held. Handles do not respond to approach; **Drag deformation (experimental)** starts enabled. Menu blur affects menus/back buttons; active handles stay clear. Disabling glass restores ordinary controls and removes glass pointer motion while keeping general transitions. **Island Liquid Glass** is in internal testing and unavailable.

The glass entry follows position settings. A live preview above the parameters stays visible while scrolling and lets you try the slider, switch, menu and button without changing Island values. About opens with the official icon, brand and version.

## Font and Chinese expression

Open **General → Font** and compare Alibaba PuHuiTi 3 (Default), System and OpenRunde using the same text sample. The choice updates Settings and the Island. Alibaba fonts are bundled locally and loaded when used.

Explicit **Simplified Chinese** reveals **Chinese expression**: Standard, Microsoft Chinese and Apple Chinese. Playful styles alter selected interface phrases while retaining ordinary technical fields and critical actions. Dates and numbers retain zh-CN formatting. Other language choices hide this row.

The guide videos show real editing in an isolated demo profile with sample endpoints; they send no AI requests. Use their playback controls to pause or seek. Leaving the visible section pauses playback. The full beta changes are in [4.1.0-beta.1](docs/releases/4.1.0-beta.1.en.md), currently unreleased.
