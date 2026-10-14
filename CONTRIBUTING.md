[简体中文](CONTRIBUTING.zh-CN.md)

# Contributing

Use a semantic branch and coherent commits. Keep formatting-only changes separate from behavior changes. Explain the problem, resulting behavior and validation in a pull request.

The [developer guide](docs/development.md) owns commands and tool policy. Run `pnpm check` and `pnpm test` before integration, and package the affected platform after changing startup, build or IPC paths.

Changes to behavior, scripts, configuration or important boundaries update the documentation for affected readers. English and Simplified Chinese guides may organize information differently. Agent instructions remain technical English. Source types/configuration own facts; documentation explains them rather than duplicating signatures.

Remove unused code and dependencies at their owner. A tool exception must identify the specific file/rule and explain its continuing purpose. Review duplicated logic for shared semantics before extracting it.

Keep the product tour synchronized in `README.md`, `README.zh-CN.md`, `README.zh-TW.md` and `README.ja.md`. Detailed guides are maintained in English and Simplified Chinese. Use direct, concrete language about features and actions; remove defensive justification and boundary-seeking filler. Preserve reader edits when refreshing translations.

Take screenshots from the running application with an isolated demo profile. Label sample service content and review images for personal data. See [capture notes](docs/assets/screenshots/README.md). Versioned release notes summarize the integrated Git history and final behavior changes; published notes stay attached to their original version.

Maintained guides explain current state; versioned release notes and capture provenance retain their specific records. Use English captures except for language-specific demonstrations. PR #14 merge/publication requires the user's confirmation after the complete candidate is reviewable.
