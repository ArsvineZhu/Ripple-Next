[简体中文](README.zh-CN.md)

# Renderer

QuickAppEditor owns its draft and discovery state through useQuickApps; the Settings controller only provides persisted lists and list edits. Discovery displays a pending status and rejects stale results. WorkflowEditor persists shared LaunchTarget objects, can add a saved quick app with its arguments/directory intact, and keeps URL commas. WorkflowsTab sends a target array once and displays indexed errors from main; it does not classify or pace launches.

The renderer owns Island presentation, interaction and feature feedback. OS access stays behind the [preload bridge](../preload/README.md). `Island.tsx` composes feature views and QuickView; `useIslandController` composes the feature hooks.

Island reads saved quick apps without mounting their editor or building a discovery cache. Page ordering, visibility and default-page edits belong to Settings only. Launch opens the built-in Guide without opening a browser after a delay. A failed bootstrap displays a localized error and a diagnostics-folder action before feature hooks mount.

## State, language and style

The dedicated settings window follows the OS light/dark preference with neutral surfaces and green enabled switches. Windows accent border highlighting is disabled. Static interface text is not selectable; editable fields retain selection and clipboard editing. Position choices retain round radio indicators, including inside the superellipse shell. Text fields have a 36 CSS pixel minimum height.

Settings starts on a keyboard-first Guide with actual workflow recordings. Category and important row icons use the existing Lucide library. `SettingsApp` owns category transitions and nested editor history; only committed views enter history, and Back restores their scroll and focus. Ordinary editors autosave valid changes, while API keys remain explicit Save/Change operations. `AISettings` owns numbered endpoint/key/model lists and per-model customization. Numeric parameters use 148 × 36 CSS pixel fields and styled step buttons. `WorkflowEditor` owns one target per row. `DangerAction` owns red destructive controls and a cancellable HTML alertdialog with animated entry and exit. Conditional rows and navigation animate; reduced motion switches immediately. About shows product metadata before searchable third-party licenses.

`PreferenceSlider` retains semantic native range input, endpoint labels, continuous values and keyboard fine adjustment. During held dragging, a smooth attraction field pulls the actual value toward nearby stops and provides a small sticky centre; continued dragging exits the stop. Its decorative Liquid Glass thumb follows the real value centre, expands immediately on press and has no approach motion. The blue rail and fill have rounded ends and extend past inset endpoint stops representing minimum and maximum. Labels display no numeric value. Material sources, geometry, caching, measured menu costs and optional drag deformation belong to [Settings glass](components/liquidGlass/README.md).

`PreferenceSwitch` uses a native checkbox with switch semantics, Space/Enter activation, focus feedback and controlled boolean values. Labels describe the enabled effect; clock/temperature switches also explain their off state. Autostart disables its switch during the native operation and keeps the saved state on failure. `Select`/`SearchableSelect` retain Radix/cmdk menu and search behavior, with right-aligned closed values and left-aligned popup labels, leading checkmarks and optional descriptions. The glass popup expands/collapses as one surface and keeps foreground opacity separate from backdrop sampling. Native color fields use a plain swatch/value button and Settings-only system-picker IPC. Reduced motion skips deformation and transitions.

Island navigation contains seven feature pages, with no settings entry. Settings opens through application launch or the tray/menu. The page registry combines stable string IDs and layout policies from `shared/pages.ts` with icons and render functions in `lib/tabs.tsx`. Navigation, settings and geometry consume the registry. Additional definitions can be registered through `createIslandPageRegistry`. When no configured page is available, navigation falls back to Overview.

`AppStateProvider` loads the main-owned snapshot and serializes typed patches. `AppStateProvider` synchronizes saved language into every renderer; `SettingsProvider` edits the shared preference. `Intl` formats time and dates in the selected locale and zone; expanded 12-hour time keeps the localized day period in the smaller date line. Location editors use the shared weather-preferences object with mode, city, region, country, unit and key source. Only main converts it into a provider query. Automatic mode shows the latest main-owned location snapshot, refreshing on entry, focus and every minute. Renderer has no weather credential or direct weather fetch.

`styles/base.css` owns the transparent document, fonts and shared animation; `styles/tokens.css` owns theme/font tokens. Island, shared controls and feature views own their CSS Modules. Keep static presentation there and runtime color/geometry and Motion values with their owners. `OverlayProvider` mounts Select menus inside the Island; `useIslandInteraction` owns movement, focus, pointer departure and menu guards.

`useIslandGeometry` owns the live width, height and corner transition. Native CSS `corner-shape: superellipse()` uses K=1.62 when expanded and K=1.30 when collapsed. The collapsed radius is half the shorter live dimension; the expanded radius follows the saved 0–60 CSS pixel setting (default 30), bounded by half the shorter dimension. One spring clock coordinates size and curvature; tab navigation inherits the visible geometry and decays any unfinished opening offset without resetting it. Background, status border, shadow and overflow clipping follow the same CSS contour. The content wrapper inherits the corners and uses native `clip-path: border-box` geometry to exclude transformed descendants from corner hit testing, while the outer shadow remains unclipped. Reduced motion applies target geometry immediately. Browsers without `corner-shape` keep the former rounded corners, and Win95 stays square.

Select uses nonmodal radio menus. Settings remains scrollable with a menu open; dismissal inside Island preserves expansion. Position commits keep settings content and scroll intact. The clock schedules minute boundaries and refreshes after focus/visibility returns. Battery/device notices preserve an expanded page.

Position controls use shared app-state coordinates, including keyboard edits. AppStateProvider serializes writes and coalesces queued edits while preserving the latest local values over older snapshots. Appearance settings holds a transient expanded Island preview; leaving the pane or closing Settings releases it. Position changes follow immediately during preview. The horizontal percentage spans the available travel so the whole Island remains visible at both endpoints. Win95 uses CSS-owned bevel colors and square descendants; other themes keep their control styles.

## Feature navigation and scrolling

`ElasticScrollArea` owns native vertical overflow and a stable content node. It observes content and viewport size without a permanent animation loop. Scrollbars appear only for actual overflow and stay hidden for declared empty states. `TabPanels` owns horizontal feature navigation and uses continuous circular page position, stable keys and inert inactive controls. New requests retarget the ongoing transition. Blur and size interpolate with it; the elastic motion tracks input with a spring and returns along a platform-derived release curve, retaining its current position and velocity when retargeted.

`wheelGesture.ts` classifies normalized CSS-pixel deltas. Horizontal samples tolerate the greater of 2 pixels or 25% cross-axis drift; stronger diagonal/accumulated vertical movement transfers ownership to content. Once a stroke is vertical, residual horizontal ticks keep that ownership until a fresh boundary or quiet gap. Nested horizontal controls retain their scroll until the boundary.

A continuous stream selects at most one circular neighbor. Additional distance gives bounded elastic displacement rather than another page. Native ScrollBegin/FlingCancel signals separate fresh gestures and paired signals are coalesced. Without native boundaries, a 150 ms gap or sustained decayed-tail/rising-run detection starts another gesture. Keyboard repeats use the latest state.

## Media ownership

`useMedia` reads immediately and every five seconds without overlapping polls. It refreshes after controls and ignores polls superseded by an action. Read errors retain stale metadata with disabled controls; operation failures stay in the media page. Capabilities distinguish true, false and unknown: unknown controls can be attempted; false/stale controls are disabled.

`useMediaPaging` and `MediaSessionCarousel` own finite vertical source pages identified by Automatic or session ID. Track changes update the card without rebuilding its page identity. Session order remains stable while the carousel is mounted; new sessions append and closed sessions disappear. A + player dots sit inside the right edge. Single automatic sessions hide the indicators; a manual single session retains A and its dot.

Click, Up/Down/Home/End and vertical wheel gestures select pages. Each continuous stroke advances at most once using native boundaries and the shared quiet-gap/tail rules; pure horizontal input still reaches feature navigation. Noncurrent cards are inert. The carousel respects reduced-motion preference.

`useMedia` serializes selection and retains the latest queued target during an operation. Pending confirmation disables controls; commands carry the displayed session ID. Service snapshots determine the valid selection after errors or session removal.

`MediaArtwork` owns decoding failure and hover for each expanded/QuickView cover. Failure shows a music placeholder; a changed session or URL resets failure. Hover changes remain local to the cover component.

## Launching, clipboard and feedback

Page definitions own their target geometry. Tasks retains its original 380 × 250 layout, including when empty. An empty workflow page uses the search page size and centers its hint with the search field's 20px, medium-weight typography; adding a workflow restores the list size. The quick-app strip appears only when both workflows and quick apps exist, so the empty page has no footer or separator.

`lib/launch.ts` classifies workflow targets and browser input. Bare localhost/IPv4 addresses, including a trailing slash, are classified before path targets. Explicit URLs and app/file targets use their corresponding bridge calls. Workflows await launches in order, pause briefly between targets and continue after failures. Quick-app targets use the typed installed-app/command/URL contract.

Clipboard text uses validated native reads/writes. The hook polls every two seconds and on focus; empty/image-only values are skipped. History remains in renderer memory for the current run. Copy buttons own their success/failure state. Clipboard and device polling continues while Island is collapsed.

`InlineNotices` places feedback at its owning feature using the existing fade-and-blur transition. Launch errors belong to their app/workflow row; media errors belong to music; search errors belong to BrowserSearchTab; settings errors belong to their field. Settings ranges use themed CSS tracks/thumbs/focus states.

`useBackgroundImage` accepts remote URLs or local paths, checks decoding after input settles, ignores stale completions and safely quotes CSS URLs. Main serves configured local images through a dedicated protocol; background errors remain beside the setting.

See [development](../../docs/development.md), [platform support](../../docs/platform-compatibility.md) and the [repository map](../../INDEX.md).

About begins with the official icon, localized brand message and version. Metadata, feedback and licenses follow. The brand icon and shared `MediaArtwork` image disable native image dragging while their click actions remain available.

`SettingsFonts` uses native radios and shared `uiFont`. `AppStateProvider` applies data-ui-font to each window; styles/fonts.css owns original WOFF2 faces. `SettingsGuide` owns user-controlled videos, pauses hidden/offscreen playback, and uses selectable prose. Internal zh-ms/zh-apple map to private i18next locales and standard zh-CN Intl formatting. See [recording provenance](../assets/guide/README.md).

Default typography uses Alibaba PuHuiTi 3, with System and OpenRunde alternatives. Saved alibaba-puhuiti choices resolve to the same default specimen. `lib/aiDisplay.ts` owns contiguous display numbers and suppresses generated ID suffixes; navigation, mutations and key storage continue to use original stable IDs. Use full list order for filtered selectors so their numbers match list and binding summaries.
Settings consumers read the standard `settings` object and call `updateSettings`. The hook keeps only editor/runtime operations that need local state. State writes return a completion result after main applies native effects and persists; failed operations restore the committed state. `useWeather` shares the weather and automatic-address fetch lifecycle and suppresses stale results; the preferences object travels unchanged to main.
