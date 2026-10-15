# Ripple Next working rules

- Use one agent unless the user explicitly requests delegation. Track Objective, Decisions and Current Work through long tasks.
- Use Node from .node-version and pnpm 12+; package.json owns product identity/version and pnpm-lock.yaml stays synchronized.
- Read the nearest source-scope README and AGENTS before changing a boundary. Use CodeGraph first when .codegraph exists.
- Main owns persistence, OS effects and native caches. Shared owns serializable schemas/pure policies. Renderer features own layout/domain operations and compose shared controls.
- Preserve page drafts across navigation/collapse; continuous media/device/clipboard observation and active assistant work stay above hidden pages.
- Preserve Linux ShapeInput-only updates, initial input-region confirmation, bundled X11 and Windows supervised native event execution. Keep stale metadata/artwork and device failures local to their source.
- Maintain current capability/ownership maps in docs/architecture.md and its zh-CN counterpart. Remove redundant internal compatibility and verification scaffolding when no current contract needs them.
- Run pnpm check and pnpm test before integration. Package and run the affected platform after startup, IPC, native adapter or build changes.
- Tests belong to platform/<os>, features/<feature> or shared. Fixtures own setup/cleanup or independent oracles; keep assertions at their contract owner.
- Keep generated .vite, out, reports, dependencies and temporary capture tools out of Git. Preserve original bundled font bytes, licenses and notices.
- English is canonical. Synchronize the four product READMEs; maintain affected detailed guides in en/zh-CN. Agent instructions use technical English.
- Maintained docs describe current facts and actions. Published release notes and asset provenance are explicit historical records. Preserve user prose edits and avoid defensive justification.
- Capture actual application flows with isolated demo data. Use English except for language-specific demonstrations; guide prose remains selectable and videos remain user-controlled.
- Maintained 4.1.0-beta.1 documentation describes the state delivered by PR #14 merge. Actual merge/publication requires the user's explicit confirmation. Do not create commits unless requested.
