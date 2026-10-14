import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { defaultAppState, isAppStatePatch, parseAppState } from '../../shared/appState';
import type { AppState, AppStatePatch } from '../../shared/appState';
import schema from '../database/schema.sql?raw';

export function createAppStateStore(userDataPath: string) {
  fs.mkdirSync(userDataPath, { recursive: true, mode: 0o700 });
  fs.chmodSync(userDataPath, 0o700);
  const filePath = path.join(userDataPath, 'ripple-next.sqlite');
  const database = new Database(filePath);
  try {
    fs.chmodSync(filePath, 0o600);
    database.exec(schema);
  } catch (error) {
    database.close();
    throw error;
  }

  const settingUpsert = database.prepare(
    'INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  );
  const taskInsert = database.prepare('INSERT INTO tasks (position, content) VALUES (?, ?)');
  const workflowInsert = database.prepare(
    'INSERT INTO workflows (position, name, urls_json) VALUES (?, ?, ?)',
  );
  const quickAppInsert = database.prepare(
    'INSERT INTO quick_apps (position, id, name, target_json) VALUES (?, ?, ?, ?)',
  );
  const taskClear = database.prepare('DELETE FROM tasks');
  const workflowClear = database.prepare('DELETE FROM workflows');
  const quickAppClear = database.prepare('DELETE FROM quick_apps');
  const secretRead = database.prepare('SELECT ciphertext FROM secrets WHERE key = ?');
  const secretWrite = database.prepare(
    'INSERT INTO secrets (key, ciphertext) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET ciphertext = excluded.ciphertext',
  );
  const secretDelete = database.prepare('DELETE FROM secrets WHERE key = ?');
  const secretExists = database.prepare('SELECT 1 FROM secrets WHERE key = ?');
  const persist = database.transaction(
    (patch: AppStatePatch, removedSecrets: readonly string[]) => {
      for (const [key, value] of Object.entries(patch.settings ?? {})) {
        settingUpsert.run(key, JSON.stringify(value));
      }
      if (patch.tasks) {
        taskClear.run();
        for (const [position, content] of patch.tasks.entries()) taskInsert.run(position, content);
      }
      if (patch.workflows) {
        workflowClear.run();
        for (const [position, workflow] of patch.workflows.entries())
          workflowInsert.run(position, workflow.name, JSON.stringify(workflow.urls));
      }
      if (patch.quickApps) {
        quickAppClear.run();
        for (const [position, quickApp] of patch.quickApps.entries())
          quickAppInsert.run(position, quickApp.id, quickApp.name, JSON.stringify(quickApp.target));
      }
      for (const name of removedSecrets) secretDelete.run(name);
    },
  );
  if (!database.prepare('SELECT 1 FROM app_settings LIMIT 1').get()) {
    persist.immediate(defaultAppState, []);
  }

  // Main is the only writer. Read SQLite once; publish a new snapshot only after commit.
  let current: AppState | null = null;
  const snapshot = () => {
    if (current) return current;
    const settings: Record<string, unknown> = { ...defaultAppState.settings };
    for (const row of database.prepare('SELECT key, value FROM app_settings').all() as {
      key: string;
      value: string;
    }[]) {
      if (Object.hasOwn(defaultAppState.settings, row.key))
        settings[row.key] = JSON.parse(row.value) as unknown;
    }
    const tasks = (
      database.prepare('SELECT content FROM tasks ORDER BY position').all() as { content: string }[]
    ).map((row) => row.content);
    const workflows = (
      database.prepare('SELECT name, urls_json FROM workflows ORDER BY position').all() as {
        name: string;
        urls_json: string;
      }[]
    ).map((row) => ({ name: row.name, urls: JSON.parse(row.urls_json) as unknown }));
    const quickApps = (
      database.prepare('SELECT id, name, target_json FROM quick_apps ORDER BY position').all() as {
        id: string;
        name: string;
        target_json: string;
      }[]
    ).map((row) => ({
      id: row.id,
      name: row.name,
      target: JSON.parse(row.target_json) as unknown,
    }));
    current = parseAppState({ settings, tasks, workflows, quickApps });
    if (!current) throw new TypeError('Ripple Next database state does not match its schema');
    return current;
  };

  return {
    load: async (): Promise<AppState> => structuredClone(snapshot()),
    update: async (
      patch: AppStatePatch,
      removedSecrets: readonly string[] = [],
    ): Promise<AppState> => {
      if (!isAppStatePatch(patch)) throw new TypeError('Invalid Ripple Next app state update');
      const previous = snapshot();
      const next = parseAppState({
        ...previous,
        ...patch,
        settings: { ...previous.settings, ...patch.settings },
      });
      if (!next) throw new TypeError('Invalid Ripple Next app state');
      persist.immediate(patch, removedSecrets);
      current = next;
      return structuredClone(next);
    },
    getSecretCiphertext: (key: string): Buffer | null => {
      const row = secretRead.get(key) as { ciphertext: Buffer } | undefined;
      return row ? Buffer.from(row.ciphertext) : null;
    },
    setSecretCiphertext: (key: string, ciphertext: Buffer) => secretWrite.run(key, ciphertext),
    deleteSecret: (key: string) => secretDelete.run(key),
    hasSecret: (key: string): boolean => secretExists.get(key) !== undefined,
    close: () => {
      if (database.open) database.close();
    },
  };
}
