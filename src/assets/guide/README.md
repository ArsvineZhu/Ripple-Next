# Recorded user-guide flows

Captured on 2026-10-14 in the packaged Windows Ripple Next 4.1.0-beta.1 Electron renderer using an isolated demo profile, Simplified Chinese labels and no personal service data. PNG posters are extracted from the corresponding recordings.

| Asset           | Actual actions                                                                                            |
| --------------- | --------------------------------------------------------------------------------------------------------- |
| typography.webm | Open Font, select Alibaba PuHuiTi 3, switch Microsoft/Apple Chinese, view About                           |
| appearance.webm | Open Liquid Glass, restore defaults, press/drag a slider, switch a control, disable/enable Settings glass |
| workflow.webm   | Add a named workflow, enter two website targets on separate rows, return to the list                      |
| ai.webm         | Edit a model ID, replace its system prompt, add a named current-time injection                            |

Mouse/keyboard events are routed through Chromium CDP; ordinary navigation may use DOM activation. These recordings establish application editing flows, not physical OS input acceptance. AI uses api.example.com and a demo-only credential; no model request is sent. Workflow addresses use reserved example domains and are not launched during capture.

Camera pans and zooms are applied to actual captured frames. No UI frames are reconstructed or interpolated. VP8 WebM recordings use 30 fps camera motion and have no audio. Playback is user-controlled, one video at a time, with offscreen/hidden/unmount pause.

To refresh: package the current application, use a separate app-data profile, execute the listed actions, record actual renderer frames, encode WebM, extract a representative PNG poster, and inspect the video from beginning to end. Keep source captures and recording tools under ignored out/. Synchronize the guide steps and [gallery](../../../docs/assets/screenshots/README.md).

See [development](../../../docs/development.md) and [unreleased notes](../../../docs/releases/4.1.0-beta.1.en.md).
