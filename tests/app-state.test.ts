import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';
import { defaultAppState } from '../src/shared/appState';
import { createAppStateStore } from '../src/main/services/appStateStore';

const temporaryDirectories: string[] = [];
const openStores: Array<{ close?: () => void }> = [];

async function createTemporaryDirectory() {
  const directory = await mkdtemp(path.join(tmpdir(), 'ripple-next-state-'));
  temporaryDirectories.push(directory);
  return directory;
}

function trackStore<T extends { close?: () => void }>(store: T) {
  openStores.push(store);
  return store;
}

afterEach(async () => {
  for (const store of openStores.splice(0)) store.close?.();
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('Ripple Next app state database', () => {
  it('defaults an existing database corner radius and persists valid custom values', async () => {
    const directory = await createTemporaryDirectory();
    const store = trackStore(createAppStateStore(directory));
    const database = new Database(store.filePath);
    database.prepare('DELETE FROM app_settings WHERE key = ?').run('islandCornerRadius');
    database.close();
    expect((await store.load()).settings.islandCornerRadius).toBe(30);
    await store.update({ settings: { islandCornerRadius: 0 } });
    expect((await store.load()).settings.islandCornerRadius).toBe(0);
    await store.update({ settings: { islandCornerRadius: 60 } });
    expect((await store.load()).settings.islandCornerRadius).toBe(60);
    await expect(store.update({ settings: { islandCornerRadius: 61 } })).rejects.toThrow();
  });
  it('starts from defaults without importing a legacy JSON state file', async () => {
    const userDataPath = await createTemporaryDirectory();
    const legacyState = {
      ...defaultAppState,
      settings: {
        ...defaultAppState.settings,
        weatherLocation: 'Legacy location',
      },
    };
    await writeFile(path.join(userDataPath, 'app-state.json'), JSON.stringify(legacyState));
    const store = trackStore(createAppStateStore(userDataPath));

    expect(await store.load()).toEqual(defaultAppState);
    expect(existsSync(path.join(userDataPath, 'ripple-next.sqlite'))).toBe(true);
    expect(defaultAppState.quickApps).toEqual([]);
    expect(defaultAppState.settings.showTray).toBe(true);
  });

  it('persists partial state updates after the database is reopened', async () => {
    const userDataPath = await createTemporaryDirectory();
    const store = trackStore(createAppStateStore(userDataPath));
    await store.load();

    await Promise.all([
      store.update({ tasks: ['Review the build'] }),
      store.update({ settings: { weatherLocation: 'Tokyo', showTray: false } }),
      store.update({
        workflows: [{ name: 'Work', urls: ['https://example.com'] }],
      }),
    ]);

    const restored = trackStore(createAppStateStore(userDataPath));
    expect(await restored.load()).toMatchObject({
      tasks: ['Review the build'],
      settings: { weatherLocation: 'Tokyo', showTray: false },
      workflows: [{ name: 'Work', urls: ['https://example.com'] }],
    });
  });

  it('reads showTray from the persisted setting row', async () => {
    const userDataPath = await createTemporaryDirectory();
    const store = trackStore(createAppStateStore(userDataPath));
    await store.load();

    const database = new Database(path.join(userDataPath, 'ripple-next.sqlite'));
    const fixture = await readFile(
      path.join(process.cwd(), 'tests/fixtures/sqlite/disable-show-tray.sql'),
      'utf8',
    );
    database.exec(fixture);

    expect((await store.load()).settings.showTray).toBe(false);
    database.close();
  });

  it('migrates old Settings page references while retaining page order, data and secrets', async () => {
    const userDataPath = await createTemporaryDirectory();
    const store = trackStore(createAppStateStore(userDataPath));
    await store.load();
    await store.update({
      tasks: ['keep task'],
      workflows: [{ name: 'keep workflow', urls: ['https://example.com'] }],
    });
    store.setSecretCiphertext('api-key', Buffer.from('encrypted fixture'));
    store.close();

    const database = new Database(path.join(userDataPath, 'ripple-next.sqlite'));
    database
      .prepare('UPDATE app_settings SET value = ? WHERE key = ?')
      .run('[5,7,2,0,1,3,6,4]', 'tabOrder');
    database
      .prepare('UPDATE app_settings SET value = ? WHERE key = ?')
      .run('[1,7,4]', 'hiddenTabs');
    database.prepare('UPDATE app_settings SET value = ? WHERE key = ?').run('7', 'defaultTabId');
    database.pragma('user_version = 1');
    database.close();

    const restored = trackStore(createAppStateStore(userDataPath));
    expect(await restored.load()).toMatchObject({
      settings: {
        tabOrder: ['clipboard', 'overview', 'search', 'workflows', 'playing', 'tasks', 'assistant'],
        hiddenTabs: ['workflows', 'assistant'],
        defaultTabId: 'overview',
      },
      tasks: ['keep task'],
      workflows: [{ name: 'keep workflow', urls: ['https://example.com'] }],
    });
    expect(restored.getSecretCiphertext('api-key')).toEqual(Buffer.from('encrypted fixture'));

    const repairedDatabase = new Database(path.join(userDataPath, 'ripple-next.sqlite'));
    expect(
      JSON.parse(
        repairedDatabase
          .prepare('SELECT value FROM app_settings WHERE key = ?')
          .pluck()
          .get('hiddenTabs') as string,
      ),
    ).toEqual(['workflows', 'assistant']);
    expect(repairedDatabase.pragma('user_version', { simple: true })).toBe(3);
    repairedDatabase.close();

    await expect(restored.update({ settings: { defaultTabId: 7 as never } })).rejects.toThrow(
      'Invalid',
    );
    await expect(restored.update({ settings: { hiddenTabs: [7] as never } })).rejects.toThrow(
      'Invalid',
    );
  });

  it('rolls back a settings update when a later quick app write fails', async () => {
    const userDataPath = await createTemporaryDirectory();
    const store = trackStore(createAppStateStore(userDataPath));
    await store.load();

    const database = new Database(path.join(userDataPath, 'ripple-next.sqlite'));
    database.exec(
      await readFile(
        path.join(process.cwd(), 'tests/fixtures/sqlite/reject-quick-app.sql'),
        'utf8',
      ),
    );

    await expect(
      store.update({
        settings: { weatherLocation: 'Must roll back' },
        quickApps: [
          {
            id: 'reject',
            name: 'Reject',
            target: { kind: 'url', url: 'https://example.com' },
          },
        ],
      }),
    ).rejects.toThrow('injected write failure');

    const restored = trackStore(createAppStateStore(userDataPath));
    expect((await restored.load()).settings.weatherLocation).toBe('');
    database.close();
  });
});
