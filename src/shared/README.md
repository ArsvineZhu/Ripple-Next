[简体中文](README.zh-CN.md) · [Architecture](../../docs/architecture.md)

# Shared contracts

Shared contains runtime-neutral serializable data, validation schemas and pure policies consumed by main, preload and renderer. Native discovery, filesystem access, provider requests and UI state belong to their owning runtime layers.

Application/LaunchTarget describes installed apps, HTTP(S) shortcuts and command argv/working directories. MediaSession/MediaSnapshot describes capabilities, automatic/manual selection, freshness and bounded operation errors; commands require the displayed session ID. Stable page IDs and layout policies are independent of navigation order.

AppState owns persisted defaults and preferences, including weather, fonts, music and the structured AI graph. AI schemas validate stable IDs, bindings, model customization and ordered injections. Credentials are named secure-store records owned by main. Related graph/credential changes share the durable transaction.

Input geometry handles fractional scales and viewport limits. Background/color policies normalize resources and preserve alpha. Diagnostic schemas accept bounded operation/view/error metadata; clipboard text and native protocol payloads are not diagnostic event fields.

Bundled en/zh-CN/zh-TW/ja catalogs have matching keys/interpolation variables. Contextual Microsoft/Apple Chinese overlays inherit ordinary technical and critical wording, and private i18next variants map to standard zh-CN for Intl formatting.

See [development](../../docs/development.md), [tests](../../tests/README.md) and the [repository map](../../INDEX.md).
