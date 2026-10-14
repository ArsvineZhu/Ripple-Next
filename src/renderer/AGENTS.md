# Renderer rules

Keep OS access behind window.electronAPI. Own timers and mutable refs inside hooks; clean up subscriptions. Persisted state belongs to AppStateProvider and the main-process state service; do not access localStorage. Test navigation/mode changes and live-check Island animation and input shaping.

Use the Search page as the standard for empty workflows: its registered target size, centered 20px medium-weight hint text, and no empty action strip. Tasks retains its full list geometry and original layout even when empty. Keep stable page IDs and page-specific layout policies in the registry; navigation order is separate from identity.

Treat the workflows feature as empty only when both workflows and quick apps are empty. Quick apps remain launchable on their own in the compact page; do not require a placeholder workflow or render a large empty workflow list above them.

Initialize bundled i18n before render; keep language preferences in SettingsProvider. Use feature/control CSS Modules and Island-scoped Select portals. Movement and open-menu guards belong to useIslandInteraction; preserve settings content and scroll during position commits.

Use the shared uiFont preference in every renderer. Normalize playful Chinese variants before Intl. Guide videos must be user-initiated and pause offscreen/unmounted; do not replace real workflow footage with mock interaction diagrams.

Assemble settings pages from components/preferences and specialized shared controls. Keep validation and drafts with the feature; extend the common control interface before copying per-page field markup or styling.
