import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Application } from '../../../shared/launch';
import { runCommand } from '../../services/processes';

async function collectBundles(directory: string): Promise<Application[]> {
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
  const results: Application[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const bundlePath = path.join(directory, entry.name);
    if (
      entry.name.toLowerCase().endsWith('.app') &&
      (entry.isDirectory() || entry.isSymbolicLink())
    ) {
      results.push({
        kind: 'application',
        name: entry.name.slice(0, -4),
        native: { platform: 'darwin', identifier: bundlePath },
      });
    } else if (entry.isDirectory()) {
      results.push(...(await collectBundles(bundlePath)));
    }
  }
  return results;
}

export async function discoverMacApps(
  query: string,
  directories = ['/Applications', '/System/Applications', path.join(os.homedir(), 'Applications')],
): Promise<Application[]> {
  const needle = query.trim().toLocaleLowerCase();
  const entries = (await Promise.all(directories.map(collectBundles))).flat();
  return [
    ...new Map(entries.map((entry) => [entry.native?.identifier ?? entry.name, entry])).values(),
  ]
    .filter((entry) => entry.name.toLocaleLowerCase().includes(needle))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 100);
}

export function launchApp(name: string): Promise<void> {
  return runCommand('/usr/bin/open', ['-a', name]).then(() => {});
}

export const macosApplications = {
  discover: discoverMacApps,
  launch: (target: Application) => launchApp(target.native?.identifier ?? target.name),
};
