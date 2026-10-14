import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Application } from '../../../shared/launch';

import { spawnDetached } from '../../services/processes';

const inheritedDevelopmentVariables = [
  'ELECTRON_DEV',
  'ELECTRON_RUN_AS_NODE',
  'ELECTRON_OVERRIDE_DIST_PATH',
  'VITE_DEV_SERVER_URL',
] as const;

export function desktopLaunchEnvironment(source: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const environment = { ...source };
  if (environment.NODE_ENV === 'development') delete environment.NODE_ENV;
  for (const key of inheritedDevelopmentVariables) delete environment[key];
  return environment;
}

function unescapeDesktopValue(value: string) {
  return value.replace(/\\([snrt\\])/g, (_match, escaped: string) => {
    switch (escaped) {
      case 's':
        return ' ';
      case 'n':
        return '\n';
      case 'r':
        return '\r';
      case 't':
        return '\t';
      default:
        return '\\';
    }
  });
}

function parseDesktopEntry(contents: string, desktopFile: string, locale = ''): Application | null {
  let inDesktopEntry = false;
  const values = new Map<string, string>();
  for (const line of contents.split(/\r?\n/)) {
    const section = line.match(/^\[([^\]]+)\]$/);
    if (section) {
      inDesktopEntry = section[1] === 'Desktop Entry';
      continue;
    }
    if (!inDesktopEntry || !line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    values.set(line.slice(0, separator), unescapeDesktopValue(line.slice(separator + 1)));
  }

  if (
    values.get('Type') !== 'Application' ||
    values.get('Hidden') === 'true' ||
    values.get('NoDisplay') === 'true'
  ) {
    return null;
  }
  const language = locale.replace('_', '-').split('.')[0];
  const name = (language && values.get(`Name[${language}]`)) || values.get('Name');
  if (!name?.trim()) return null;
  return {
    kind: 'application',
    name: name.trim(),
    native: { platform: 'linux', identifier: desktopFile },
  };
}

function dataDirectories() {
  const home = process.env.XDG_DATA_HOME;
  const dataHome =
    home && path.isAbsolute(home) ? home : path.join(os.homedir(), '.local', 'share');
  const systemDirs = (process.env.XDG_DATA_DIRS || '/usr/local/share:/usr/share')
    .split(path.delimiter)
    .filter((directory) => path.isAbsolute(directory));
  return [...new Set([dataHome, ...systemDirs])];
}

async function walkDesktopFiles(directory: string, depth = 0): Promise<string[]> {
  if (depth > 5) return [];
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }
  const nested = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory() && !entry.isSymbolicLink())
      .map((entry) => walkDesktopFiles(path.join(directory, entry.name), depth + 1)),
  );
  return [
    ...entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.desktop'))
      .map((entry) => path.join(directory, entry.name)),
    ...nested.flat(),
  ];
}

async function discoverLinuxApps(query: string): Promise<Application[]> {
  const roots = dataDirectories().map((directory) => path.join(directory, 'applications'));
  const files = (await Promise.all(roots.map((root) => walkDesktopFiles(root)))).flat();
  const locale = process.env.LANG || '';
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const byPath = new Map<string, Application>();
  await Promise.all(
    files.map(async (desktopFile) => {
      try {
        const contents = await fs.readFile(desktopFile, 'utf8');
        const entry = parseDesktopEntry(contents, desktopFile, locale);
        if (entry && entry.name.toLocaleLowerCase().includes(normalizedQuery)) {
          byPath.set(desktopFile, entry);
        }
      } catch {
        // Ignore malformed or unreadable desktop entries.
      }
    }),
  );
  return [...byPath.values()]
    .sort((left, right) => left.name.localeCompare(right.name))
    .slice(0, 100);
}

function isWithin(directory: string, candidate: string) {
  const relative = path.relative(directory, candidate);
  return (
    relative === '' ||
    (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))
  );
}

export async function launchLinuxDesktopEntry(desktopFile: string): Promise<void> {
  if (!path.isAbsolute(desktopFile) || !desktopFile.endsWith('.desktop')) {
    throw new TypeError('Invalid desktop application entry');
  }
  const candidate = path.resolve(desktopFile);
  const permittedDirectories = dataDirectories().map((directory) =>
    path.resolve(directory, 'applications'),
  );
  const isPermitted = permittedDirectories.some((directory) => isWithin(directory, candidate));
  if (!isPermitted)
    throw new TypeError('Desktop application entry is outside the applications directory');
  await fs.access(candidate);
  await new Promise<void>((resolve, reject) => {
    execFile(
      'gio',
      ['launch', candidate],
      { env: desktopLaunchEnvironment(process.env) },
      (error) => {
        if (error) {
          reject(
            new Error(`Could not launch desktop application: ${error.message}`, { cause: error }),
          );
          return;
        }
        resolve();
      },
    );
  });
}

export const linuxApplications = {
  discover: discoverLinuxApps,
  async launch(target: Application) {
    if (target.native) return launchLinuxDesktopEntry(target.native.identifier);
    const entry = (await discoverLinuxApps(target.name)).find(
      (item) => item.name.toLocaleLowerCase() === target.name.toLocaleLowerCase(),
    );
    if (entry?.native) return launchLinuxDesktopEntry(entry.native.identifier);
    return spawnDetached(target.name, []);
  },
};
