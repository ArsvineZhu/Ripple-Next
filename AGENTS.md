# Ripple Next working rules

- Use pnpm 12+ and the Node version in `.node-version`; keep `pnpm-lock.yaml` synchronized.
- Follow the product identity and persistence contracts in package.json, shared schemas and current release notes.
- Read the nearest source-scope README and AGENTS before changing its boundary.
- Keep generated `.vite`, `out`, dependencies and reports out of Git.
- Run `pnpm check` and `pnpm test` before integration; package after changing startup, IPC or build paths.
- Synchronize product READMEs in en, zh-CN, zh-TW and ja; maintain affected detailed guides in en/zh-CN. Keep agent instructions in technical English.
- Write human documentation in direct, concrete language. Do not use defensive justification, apologetic positioning or boundary-seeking filler. Preserve user prose edits.
- Use one agent unless the user explicitly requests delegation.
- Track Objective, Decisions and Current Work; return to the authorized objective after investigation.
- Keep current branch notes under 4.1.0-beta.1 explicitly unreleased; preserve published 4.0.0 history.
- Keep bundled font bytes and notices intact. Guide demos must use actual captured application flows, with provenance and selectable prose.
