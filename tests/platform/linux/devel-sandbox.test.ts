import { expect, it } from 'vitest';
import { installedChromeSandbox, resolveLinuxSandbox } from '../../../scripts/linuxSandbox';

const ready = {
  platform: 'linux' as const,
  bundledSetuidRoot: false,
  installedSetuidRoot: true,
  sameBytes: true,
};

it('uses the installed helper when the development sandbox is not setuid root', () => {
  expect(resolveLinuxSandbox(ready)).toBe(installedChromeSandbox);
});

it('keeps an explicit helper and a setuid development sandbox', () => {
  expect(resolveLinuxSandbox({ ...ready, configured: '/opt/sandbox' })).toBe('/opt/sandbox');
  expect(resolveLinuxSandbox({ ...ready, configured: '  ' })).toBe(installedChromeSandbox);
  expect(resolveLinuxSandbox({ ...ready, bundledSetuidRoot: true })).toBeUndefined();
});

it('rejects a missing, non-setuid, or different installed helper', () => {
  expect(resolveLinuxSandbox({ ...ready, installedSetuidRoot: false })).toBeUndefined();
  expect(resolveLinuxSandbox({ ...ready, sameBytes: false })).toBeUndefined();
  expect(resolveLinuxSandbox({ ...ready, platform: 'win32' })).toBeUndefined();
});
