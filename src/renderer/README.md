[简体中文](README.zh-CN.md) · [Architecture](../../docs/architecture.md)

# Renderer

Island presents seven daily-action pages; Settings is a separate configuration/editor window. Both renderers receive the main-owned committed snapshot through AppStateProvider and the typed preload API. OS access never crosses through a raw renderer channel.

## Composition

`components/content` owns shared buttons, text entry, surfaces, empty states and feedback. `components/preferences` composes those controls into reusable preference groups, rows, fields and actions. Specialized sliders, switches, colors and selectors own their shared interaction. Feature files own layout, drafts and domain operations.

LaunchButton serializes row activation and indexed errors. MediaControl binds commands/capabilities to the visible session. MediaArtwork owns decoding fallback and hover. MediaMarquee measures real text/clip sizes and font changes; CSS loops restart after hidden-page restoration. MediaTransition keeps one keyed current layer with a 200ms fade/blur entrance. MarkdownContent owns streamed answer presentation and native-copy actions.

## State and lifecycle

The page registry owns stable IDs, order/visibility, geometry and rendering. Tasks/search/editor drafts stay with their feature. React Activity preserves Island drafts while pausing hidden page effects. Media/device/clipboard observation and active assistant work remain above that lifecycle.

The interaction machine owns hover, expansion, focus, menus, dragging and collapse delay. Geometry follows visible dimensions and page transitions. TabPanels owns horizontal feature navigation; MediaSessionCarousel owns vertical player navigation. Native vertical scroll and momentum boundaries retain their respective inputs.

SettingsApp owns the persistent icon rail, expandable category panel, category/detail navigation, transitions and scroll/focus restoration. Sidebar width and native translucency are independent persisted preferences; changing them preserves mounted editors. Width and text transitions accompany expansion, and shared layout indicators animate category selection; reduced motion uses immediate changes. Ordinary fields commit valid edits automatically. Credentials use explicit Save/Change, destructive actions require confirmation, and failed system effects restore committed settings. Appearance activates a main-owned Island preview.

## Music, language and guide

Idle omits the playback slot; hover quick view adds its width and always shows the artist, independent of the idle artist setting. Expanded and compact cards share controls, artwork, text animation and a separate error band.

Every surface uses the persisted ordered uiFont list. useUIFont shares its CSS stack and registers imported faces by family, weight and style in each renderer; unavailable glyphs continue through the selected fonts before the system fallback. Font selection supports built-in choices, installed families and native file import with an editable mixed-script preview. Complete en/zh-CN/zh-TW/ja catalogs share interpolation contracts; authored Microsoft/Apple Chinese overlays alter contextual prose and inherit technical fields, errors and critical actions. Formatting uses a valid regional locale.

SettingsGuide uses genuine English flow recordings, plus Chinese-specific demonstrations. Playback is user-controlled, one video at a time, and pauses offscreen/hidden/unmounted. Prose remains selectable. See [capture provenance](../assets/guide/README.md), [glass](components/liquidGlass/README.md) and [development](../../docs/development.md).
