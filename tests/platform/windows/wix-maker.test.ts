import { afterEach, expect, it, vi } from 'vitest';
import config from '../../../.config/forge.config';
import {
  MakerWixOptional,
  WIX_SKIP_MESSAGE,
  windowsMsiArtifacts,
  wixToolsetOnPath,
} from '../../../.config/maker-wix';

afterEach(() => {
  vi.restoreAllMocks();
});

it('points the MSI executable at the packaged binary', async () => {
  const packager = config.packagerConfig;
  const maker = config.makers?.find((item) => item instanceof MakerWixOptional);
  if (!packager || !(maker instanceof MakerWixOptional)) throw new Error('WiX maker missing');
  await maker.prepareConfig('x64');
  expect(packager.executableName).toBe('ripple-next');
  expect(maker.config.exe).toBe('ripple-next.exe');
  expect(maker.config.appUserModelId).toBe('com.arsvinezhu.ripple-next');
  expect(maker.config.appUserModelId).toBe(packager.appBundleId);
});

it('skips the MSI when WiX 3 tools are absent and still builds it when they exist', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const makeMsi = vi.fn(async () => ['Ripple Next.msi']);

  await expect(windowsMsiArtifacts(false, makeMsi)).resolves.toEqual([]);
  expect(makeMsi).not.toHaveBeenCalled();
  expect(warn).toHaveBeenCalledWith(expect.any(String), expect.stringContaining(WIX_SKIP_MESSAGE));

  await expect(windowsMsiArtifacts(true, makeMsi)).resolves.toEqual(['Ripple Next.msi']);
  expect(makeMsi).toHaveBeenCalledOnce();
});

it('requires both candle and light', () => {
  const present = new Set(['candle', 'light']);
  const run = (file: string) => {
    if (!present.has(file)) throw new Error(`missing ${file}`);
  };
  expect(wixToolsetOnPath(run)).toBe(true);
  present.delete('light');
  expect(wixToolsetOnPath(run)).toBe(false);
  present.add('light');
  present.delete('candle');
  expect(wixToolsetOnPath(run)).toBe(false);
});
