import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, expect, it } from 'vitest';
import { defaultAppState } from '../src/shared/appState';
import { createAppStateStore } from '../src/main/services/appStateStore';

const directories: string[] = [];
const stores: ReturnType<typeof createAppStateStore>[] = [];
async function openStore(directory?: string) {
  if (!directory) {
    directory = await mkdtemp(path.join(tmpdir(), 'ripple-next-state-'));
    directories.push(directory);
  }
  const store = createAppStateStore(directory);
  stores.push(store);
  return { directory, store };
}
afterEach(async () => {
  for (const store of stores.splice(0)) store.close();
  for (const directory of directories.splice(0)) await rm(directory, { recursive: true });
});

it('persists independent feature and settings edits, including empty lists, across restart', async () => {
  const { directory, store } = await openStore();
  expect(await store.load()).toEqual(defaultAppState);
  await Promise.all([
    store.update({ tasks: ['Review build'] }),
    store.update({ settings: { uiFont: 'openrunde', language: 'zh-apple', showTray: false } }),
    store.update({
      workflows: [{ name: 'Work', targets: [{ kind: 'url', url: 'https://example.com' }] }],
    }),
    store.update({
      quickApps: [
        { id: 'docs', name: 'Docs', target: { kind: 'url', url: 'https://example.com' } },
      ],
    }),
  ]);
  store.close();
  const { store: restored } = await openStore(directory);
  expect(await restored.load()).toMatchObject({
    settings: { uiFont: 'openrunde', language: 'zh-apple', showTray: false },
    tasks: ['Review build'],
    workflows: [{ name: 'Work', targets: [{ kind: 'url', url: 'https://example.com' }] }],
    quickApps: [{ id: 'docs' }],
  });
  await restored.update({ tasks: [], workflows: [], quickApps: [] });
  await expect(restored.update({ settings: { glassIor: 0.5 } })).rejects.toThrow('Invalid');
  restored.close();
  expect(await (await openStore(directory)).store.load()).toMatchObject({
    tasks: [],
    workflows: [],
    quickApps: [],
    settings: { showTray: false },
  });
});

it('does not rewrite unrelated feature data when a preference changes', async () => {
  const { directory, store } = await openStore();
  await store.update({ tasks: ['Keep task'] });
  const database = new Database(path.join(directory, 'ripple-next.sqlite'));
  try {
    database.exec(
      "CREATE TRIGGER protect_tasks BEFORE DELETE ON tasks BEGIN SELECT RAISE(ABORT, 'unrelated rewrite'); END",
    );
    await store.update({ settings: { islandX: 70 } });
    expect((await store.load()).tasks).toEqual(['Keep task']);
    expect((await store.load()).settings.islandX).toBe(70);
  } finally {
    database.close();
  }
});

it('rolls back a feature patch and secret deletion together, keeping the last committed snapshot', async () => {
  const { directory, store } = await openStore();
  store.setSecretCiphertext('ai-api-key:1', Buffer.from('encrypted fixture'));
  const database = new Database(path.join(directory, 'ripple-next.sqlite'));
  try {
    database.exec(
      "CREATE TRIGGER protect_secret BEFORE DELETE ON secrets BEGIN SELECT RAISE(ABORT, 'injected failure'); END",
    );
    await expect(
      store.update({ settings: { islandX: 70 }, tasks: ['Must roll back'] }, ['ai-api-key:1']),
    ).rejects.toThrow('injected failure');
    expect(await store.load()).toEqual(defaultAppState);
    expect(store.hasSecret('ai-api-key:1')).toBe(true);
    database.exec('DROP TRIGGER protect_secret');
  } finally {
    database.close();
  }
  store.close();
  const { store: restored } = await openStore(directory);
  expect(await restored.load()).toEqual(defaultAppState);
  await restored.update({ tasks: ['Committed'] }, ['ai-api-key:1']);
  expect(restored.hasSecret('ai-api-key:1')).toBe(false);
});

it('reports unreadable persisted state and prevents edits from overwriting it with defaults', async () => {
  const { directory, store } = await openStore();
  store.close();
  const database = new Database(path.join(directory, 'ripple-next.sqlite'));
  try {
    database
      .prepare('UPDATE app_settings SET value = ? WHERE key = ?')
      .run('invalid JSON', 'theme');
    const { store: restored } = await openStore(directory);
    await expect(restored.load()).rejects.toThrow();
    await expect(restored.update({ tasks: ['Overwrite'] })).rejects.toThrow();
    expect(
      database.prepare('SELECT value FROM app_settings WHERE key = ?').pluck().get('theme'),
    ).toBe('invalid JSON');
  } finally {
    database.close();
  }
});
