# Test rules

Place native adapter tests under platform/<os>, feature behavior under features/<feature>, and reusable runtime/contracts under shared. Use descriptive local names without repeating the platform prefix. Vitest recursively includes .test.ts and .test.tsx.

Keep assertions at their contract owner. Shared fixtures own resource setup/cleanup or independent reference data; do not hide assertions or install global feature mocks in a common fixture. Private D-Bus fixtures must not control host media players. Kernel-only tests skip unsupported hosts and clean up temporary builds and children.

Run pnpm test after structural moves and pnpm check before integration. Preserve distinct failure, concurrency and lifecycle regressions; remove identical duplicates rather than weakening assertions.
