import { execFileSync, spawn } from 'node:child_process';
import { mkdtemp, open, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { expect, it, vi } from 'vitest';

it.skipIf(process.platform !== 'linux')(
  'receives kernel video open, close and hotplug events without sampling',
  async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'ripple-inotify-'));
    const executable = path.join(directory, 'listener');
    execFileSync(process.env.CC || 'cc', [
      '-O2',
      '-Wall',
      '-Wextra',
      '-Werror',
      'native/linux-events/device_events.c',
      '-o',
      executable,
    ]);
    const child = spawn(executable, [directory], { stdio: ['ignore', 'pipe', 'pipe'] });
    const lines: string[] = [];
    const reader = createInterface({ input: child.stdout });
    reader.on('line', (line) => lines.push(line));
    const event = async (operation: () => Promise<unknown>) => {
      const count = lines.length;
      await operation();
      await vi.waitFor(() => expect(lines.length).toBeGreaterThan(count), {
        timeout: 1000,
        interval: 5,
      });
      expect(lines.at(-1)).toBe('camera');
    };
    try {
      await vi.waitFor(() => expect(lines).toContain('ready'), { timeout: 1000, interval: 5 });
      const file = path.join(directory, 'video0');
      await event(() => writeFile(file, ''));
      let handle!: Awaited<ReturnType<typeof open>>;
      await event(async () => {
        handle = await open(file, 'r');
      });
      await event(() => handle.close());
      await event(() => rm(file));
      const count = lines.length;
      await writeFile(path.join(directory, 'unrelated'), '');
      await new Promise((resolve) => setTimeout(resolve, 25));
      expect(lines).toHaveLength(count);
    } finally {
      reader.close();
      const exited = new Promise<void>((resolve) => child.once('exit', () => resolve()));
      child.kill();
      await exited;
      await rm(directory, { recursive: true, force: true });
    }
  },
);
