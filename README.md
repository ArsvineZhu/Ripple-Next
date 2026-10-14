<p align="center">
  <img src="src/assets/icons/icon.png" width="80" alt="Ripple Next icon">
</p>

<h1 align="center">Ripple Next</h1>

<p align="center"><strong>Your next action, close at hand.</strong></p>
<p align="center">A Dynamic Island desktop companion for Windows, macOS and Linux.</p>

<p align="center">
  <a href="README.zh-CN.md">简体中文</a> ·
  <a href="README.zh-TW.md">繁體中文</a> ·
  <strong>English</strong> ·
  <a href="README.ja.md">日本語</a>
</p>

<p align="center">
  <a href="https://github.com/ArsvineZhu/Ripple-Next/releases">Download</a> ·
  <a href="instructions.md">User guide</a> ·
  <a href="https://github.com/ArsvineZhu/Ripple-Next/issues">Feedback</a>
</p>

Music is playing. A link needs opening. A copied command is somewhere in your clipboard. You remember one more thing to do. Ripple Next brings these small actions into one floating Island, so you can reach them without turning each one into another window.

Start with a compact glance, hover for quick information, and click to open a full feature page. The Island changes size with its content, moves between pages with animated transitions, and lets the surrounding desktop keep receiving your clicks.

<p align="center">
  <img src="docs/assets/screenshots/media.png" width="440" alt="Ripple Next music card with album artwork, playback controls, and an internal A and player-dot column">
</p>

> Island screenshots show the published Linux 4.0.0 app with sample data; current Settings screenshots show Windows 4.1.0-beta.1. Read the [unreleased beta notes](docs/releases/4.1.0-beta.1.en.md) and [capture provenance](docs/assets/screenshots/README.md).

## Seven Island pages and a settings window

| Page                       | What you can do                                                                                                                                            |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Browser Search**         | Send a search or a direct HTTP(S) address to your default browser. Choose your own search URL template.                                                    |
| **Workflows & Quick Apps** | Open a group of apps and webpages in order, or launch one favorite directly. Quick apps support installed apps, URLs and commands with separate arguments. |
| **Overview**               | Check the time, date, weather and battery together. Choose 12/24-hour time, a time zone, a weather location and Celsius/Fahrenheit.                        |
| **Now Playing**            | See the song and artwork, pause or resume, skip tracks, and bring the player forward. Scroll vertically to choose among multiple players.                  |
| **AI Assistant**           | Use your own Chat Completions, Responses or Anthropic endpoints and numbered model configurations. Read streamed Markdown answers and copy code blocks.    |
| **Clipboard**              | Reuse recently copied text with a copy button beside each entry. History stays in the current session.                                                     |
| **Tasks**                  | Add a quick to-do and check it off when finished. Your remaining tasks survive a restart.                                                                  |
| **Settings window**        | Opens when you launch Ripple. Adjust appearance, placement, visible pages, startup behavior and language in a dedicated window.                            |

## Music without the window hunt

Keep the album cover and playback controls nearby while you work. Compact mode shows the track; hovering reveals a play/pause control. The expanded card gives you artwork, artist, previous/next controls and a way to bring the player forward.

When more than one player is open, the music page becomes a vertical stack of cards:

- **A** is the first page and restores Automatic selection.
- Each **dot** represents a player. Scroll, click a dot, or use Up/Down after focusing the music area.
- Selecting a player keeps it selected for this run until it disappears. Controls always address the player on that card.
- One continuous wheel/trackpad stroke moves one page. The first and last music pages are boundaries; horizontal gestures still navigate the Island's feature pages.

Artwork comes from the player's media metadata. Local Linux covers also work when a browser supplies a temporary filename without an image extension. A missing or failed cover gets a clean music placeholder.

<p align="center">
  <img src="docs/assets/screenshots/media-compact.png" width="300" alt="Compact music view showing the track and artist">
</p>

Media integration uses Windows system media sessions, Linux MPRIS, and running Spotify/Music applications on macOS. Available controls and artwork depend on the player; see [platform compatibility](docs/platform-compatibility.md).

## Open your work together

Give a workflow a name, add the apps or addresses you use together, then launch that group from one button. A development workflow can open documentation and `localhost:3000/`; local addresses are sent to the default browser with HTTP, including their paths and query strings.

Keep individual favorites on the Quick Apps strip. Choose an installed application, an HTTP(S) URL, or a command with one argument per line and an optional working directory. A failed launch appears beside that item; a workflow continues with its remaining targets and reports a failure on its own row.

<p align="center">
  <img src="docs/assets/screenshots/workflows.png" width="480" alt="Two named workflows above a strip of Docs, GitHub and Local API quick apps">
</p>

## An assistant with your choice of provider

Configure numbered Base URLs for OpenAI-compatible Chat Completions, OpenAI Responses or Anthropic, save a key for each endpoint, and bind models to them. Each model can have its own system prompt, ordered injections, temperature and reasoning settings. Answers stream into the Island as Markdown, with copy buttons for code and scrolling when they reach the available screen height.

Use **Ask another** to clear the current exchange and start a new question. Ripple Next provides the interface; you bring the endpoint and model. Questions use the service you configure.

The API key is protected with the operating system's encryption . On Linux, key saving requires an available OS-backed encryption service. Prompts and answers go to the endpoint you configure.

<p align="center">
  <img src="docs/assets/screenshots/assistant.png" width="380" alt="A sample streamed Markdown answer with a code block and Copy button">
</p>

## Keep everyday details within reach

The overview puts a readable clock beside weather and battery information. The clock follows your chosen time zone; weather follows the location you set. The battery badge fills to its percentage and turns green while charging. Charging and device activity can also surface as brief status alerts.

<p align="center">
  <img src="docs/assets/screenshots/overview.png" width="380" alt="Overview with time, date, sunny weather and a charging battery badge">
</p>

Clipboard history and tasks take care of two different kinds of loose ends: text you may need again, and things you still need to finish. Copy a clipboard entry with one click; add a task and check it off when done. Text history remains temporary, while tasks are saved locally.

<table>
  <tr>
    <td><img src="docs/assets/screenshots/clipboard.png" width="380" alt="Recent text entries with individual Copy buttons"></td>
    <td><img src="docs/assets/screenshots/tasks.png" width="380" alt="A saved task list with checkboxes and an Add field"></td>
  </tr>
</table>

## Make the Island yours

- **Place it where it belongs.** Select a display, use a snap position, or adjust its free position with immediate slider feedback. Appearance settings keeps a live Island preview visible. Sliders have endpoint labels and gentle snap markers, with free adjustment between them.
- **Choose the appearance.** Default, Sleek Black and Windows 95 themes; custom colors, an image URL or a local background file; an optional border and adjustable expanded corners (0–60px).
- **Adjust settings directly.** Start with the keyboard-first guide with actual recordings and clear settings icons. Compact sliders and switches reveal larger clear glass handles immediately on press. Sliders attract nearby stops during dragging; switches can be dragged left or right. Handles stay still on approach; drag deformation starts enabled and can be adjusted in the experiment. Menu highlights move continuously. Appearance & Position has Liquid Glass (Exp) parameters and a switch to restore ordinary controls. Island glass remains unavailable. Red destructive actions ask for confirmation. About starts with the app icon, brand and version before feedback and licenses.
- **Keep the pages you use.** Reorder or hide seven Island feature pages and choose the default. Launch Ripple or use the tray menu to open Settings.
- **Control when it stays visible.** Compact, hover and expanded modes; inactive hiding, Quick Standby, Large Standby and a configurable 0–2000 ms pointer-leave delay.
- **Fit your desktop routine.** Startup control and, on macOS, a menu bar icon toggle; Windows and Linux always keep the tray. Platform specifics are in the guides.
- **Use your language.** 简体中文, 繁體中文, English and 日本語. The interface follows the system by default; a manual choice applies immediately and is remembered.

<p align="center">
  <img src="docs/assets/screenshots/settings.png" width="440" alt="Settings for language, hour format, time zone, startup, menu bar icon and display">
</p>

- **Choose your typography.** General → Font uses Alibaba PuHuiTi 3 by default and compares it with System and OpenRunde using real text samples. Simplified Chinese exposes Standard, Microsoft Chinese and Apple Chinese expressions. The guide puts keyboard controls first, followed by real recordings of typography, glass, AI and workflow editing.

![Font specimens and selection](docs/assets/screenshots/font-settings.png)

![About brand and version](docs/assets/screenshots/about.png)

## Try Ripple Next

This branch prepares **Ripple Next 4.1.0-beta.1**; it is not published yet. Read the [beta change list](docs/releases/4.1.0-beta.1.en.md). The latest published stable version is [4.0.0](docs/releases/4.0.0.en.md); download its platform package from [Releases](https://github.com/ArsvineZhu/Ripple-Next/releases).

| Platform | Published build targets         | Packages                      |
| -------- | ------------------------------- | ----------------------------- |
| Windows  | x64                             | MSI installer or portable ZIP |
| macOS    | Intel x64 / Apple Silicon arm64 | DMG or portable ZIP           |
| Linux    | x64                             | DEB, RPM or portable ZIP      |

Install the package for your platform, or extract its portable ZIP and launch Ripple Next. Each launch opens Settings; launching again focuses the existing instance's settings window. Hover over the Island for a quick view and click its background to expand. Local features can be used before AI is configured. See the [user guide](instructions.md) for your first workflow and detailed controls, and [platform compatibility](docs/platform-compatibility.md) for native permissions and limitations.

### Run the current source

Use Node **22.23.3** from [.node-version](.node-version) and the pinned pnpm **12.9.1** from [package.json](package.json):

```sh
git clone https://github.com/ArsvineZhu/Ripple-Next.git
cd Ripple-Next
pnpm install --frozen-lockfile
pnpm start
```

The [developer guide](docs/development.md) owns setup prerequisites, checks, packaging and platform troubleshooting. Main/preload changes require restarting the application; a renderer hot update alone does not load them.

## Local data and external services

Settings, tasks, workflows and quick apps are saved in Ripple Next's own local database. API-key ciphertext is protected through the OS encryption service. Clipboard history lasts for the session; AI exchanges remain in the current session.

Searches and webpages open in the system browser. Weather uses the configured location with an external weather service. AI uses your configured endpoint. Local diagnostics omit API keys, clipboard text, prompts and answers; crash-report uploads are disabled. Minidumps are process snapshots and should be reviewed before sharing.

Ripple Next uses its own profile. Installed-app targets remain platform-specific when you move a profile to another OS.

## Explore, contribute, report

- [User guide](instructions.md) — modes, navigation, seven Island pages, Settings and troubleshooting.
- [Documentation catalog](docs/INDEX.md) — development, release validation and current platform behavior.
- [Repository map](INDEX.md) — source ownership and configuration boundaries.
- [Contributing](CONTRIBUTING.md) — checks, documentation and localization expectations.
- [Issues](https://github.com/ArsvineZhu/Ripple-Next/issues) — report the version, OS and steps needed to reproduce a problem.

## License and credit

Ripple Next is developed by [Arsvine Zhu](https://github.com/ArsvineZhu) from [TopMyster's original Ripple](https://github.com/TopMyster/Ripple). It continues the Dynamic Island idea with its own product identity, persistence and cross-platform work. Released under the [MIT license](LICENSE); original attribution is retained.
