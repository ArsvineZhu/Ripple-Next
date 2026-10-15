import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
const command = vi.hoisted(() => vi.fn());
vi.mock('../../../src/main/services/processes', () => ({ runCommand: command }));
import { discoverMacApps, launchApp } from '../../../src/main/platform/macos/apps';

const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true });
  vi.resetAllMocks();
});
it('finds app bundles in application folders without exposing their internal helpers', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ripple-mac-apps-'));
  roots.push(root);
  await fs.mkdir(path.join(root, 'Utilities', '音乐 App.app', 'Contents', 'Helper.app'), {
    recursive: true,
  });
  const entries = await discoverMacApps('音乐', [root, root, path.join(root, 'Missing')]);
  expect(entries).toEqual([
    {
      kind: 'application',
      name: '音乐 App',
      native: {
        platform: 'darwin',
        identifier: path.join(root, 'Utilities', '音乐 App.app'),
      },
    },
  ]);
  expect(await discoverMacApps('Helper', [root])).toEqual([]);
});
it('uses native app activation with a literal bundle path and propagates failures', async () => {
  command.mockResolvedValueOnce('');
  await launchApp('/Applications/音乐 App.app');
  expect(command).toHaveBeenCalledWith('/usr/bin/open', ['-a', '/Applications/音乐 App.app']);
  command.mockRejectedValueOnce(new Error('denied'));
  await expect(launchApp('Missing')).rejects.toThrow('denied');
});
