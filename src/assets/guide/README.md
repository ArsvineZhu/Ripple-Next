# Guide recordings

Captured on 2026-10-15 from the built Ripple Next 4.1.0-beta.1 Electron 44.5.1 renderer on Linux, with an isolated demo profile and a 920 × 640 CSS-pixel Settings window at DPR 2. Four recordings use English; the Chinese-expression recording uses the corresponding Chinese interfaces.

| Asset           | Actual recorded flow                                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| typography.webm | Open Font, select System and OpenRunde, return to Alibaba PuHuiTi 3, then return to General                                     |
| expression.webm | Select Simplified Chinese, choose Microsoft Chinese and visit About, choose Apple Chinese and visit About, return to English    |
| appearance.webm | Open Liquid Glass, drag the preview slider, hold/drag the switch, choose a preview theme, disable/enable Settings glass, return |
| workflow.webm   | Name Reading room, enter two reserved example-domain targets on separate rows, return to the saved list                         |
| ai.webm         | Select a configured model, replace its system prompt, add a named current-time injection, return to Integrations                |

Mouse/keyboard actions use Chromium CDP on actual application controls. Recordings contain a pointer overlay, no audio and no reconstructed interface frames. VP8 WebM output uses 30 fps; editing trims idle lead/tail. Each PNG poster is extracted from its corresponding clip.

The demo endpoint is a local protocol fixture and its credential is demonstration-only. The AI editing recording sends no model request; the assistant gallery image uses a local fixture response. Workflow addresses use reserved example domains and are not launched while recording.

Refresh by building the current application, binding the capture harness to disposable data/cache/lock paths before startup, and repeating the table's real actions. Keep native brokers, scripts and raw captures under ignored out/. When a recorder emits one file per window, select the Settings recording rather than the Island recording. Inspect the complete sequence before encoding and extract a matching poster.

Guide prose remains selectable. Playback is user-controlled, one video at a time, and pauses offscreen, when hidden or when unmounted. See the [gallery](../../../docs/assets/screenshots/README.md), [development](../../../docs/development.md) and [release notes](../../../docs/releases/4.1.0-beta.1.en.md).
