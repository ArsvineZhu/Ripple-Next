import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { defaultAppState, isAppState, isAppStatePatch, parseAppState } from '../../shared/appState';
import type { AppState, AppStatePatch } from '../../shared/appState';
import { migrateDatabase } from '../database/migrations';
import { queries } from '../database/queries';

type SettingRow = { key: string; value: string };
type TaskRow = { content: string };
type WorkflowRow = { name: string; urls_json: string };
type QuickAppRow = { id: string; name: string; target_json: string };
type SecretRow = { ciphertext: Buffer };

const DATABASE_FILENAME = 'ripple-next.sqlite';

export function createAppStateStore(userDataPath: string) {
  fs.mkdirSync(userDataPath, { recursive: true, mode: 0o700 });
  fs.chmodSync(userDataPath, 0o700);

  const filePath = path.join(userDataPath, DATABASE_FILENAME);
  const database = new Database(filePath);
  fs.chmodSync(filePath, 0o600);
  database.exec(queries.connectionConfiguration);

  try {
    migrateDatabase(database);
  } catch (error) {
    database.close();
    throw error;
  }

  const settingUpsert = database.prepare(queries.upsertSetting);
  const insertTask = database.prepare(queries.insertTask);
  const insertWorkflow = database.prepare(queries.insertWorkflow);
  const insertQuickApp = database.prepare(queries.insertQuickApp);

  const writeState = (state: AppState) => {
    database.exec(queries.clearState);
    for (const [key, value] of Object.entries(state.settings)) {
      settingUpsert.run({ key, value: JSON.stringify(value) });
    }
    for (const [position, content] of state.tasks.entries()) {
      insertTask.run({ position, content });
    }
    for (const [position, workflow] of state.workflows.entries()) {
      insertWorkflow.run({
        position,
        name: workflow.name,
        urls_json: JSON.stringify(workflow.urls),
      });
    }
    for (const [position, quickApp] of state.quickApps.entries()) {
      insertQuickApp.run({
        position,
        id: quickApp.id,
        name: quickApp.name,
        target_json: JSON.stringify(quickApp.target),
      });
    }
  };

  const stateExists = database.prepare(queries.selectStateExists);
  if (!stateExists.get()) {
    database.transaction(() => writeState(defaultAppState))();
  }

  const readState = (): AppState => {
    const settings: Record<string, unknown> = { ...defaultAppState.settings };
    for (const row of database.prepare(queries.selectSettings).all() as SettingRow[]) {
      settings[row.key] = JSON.parse(row.value) as unknown;
    }
    const tasks = (database.prepare(queries.selectTasks).all() as TaskRow[]).map(
      (row) => row.content,
    );
    const workflows = (database.prepare(queries.selectWorkflows).all() as WorkflowRow[]).map(
      (row) => ({ name: row.name, urls: JSON.parse(row.urls_json) as string[] }),
    );
    const quickApps = (database.prepare(queries.selectQuickApps).all() as QuickAppRow[]).map(
      (row) => ({
        id: row.id,
        name: row.name,
        target: JSON.parse(row.target_json) as AppState['quickApps'][number]['target'],
      }),
    );
    const state = parseAppState({ schemaVersion: 1, settings, tasks, workflows, quickApps });
    if (!state) throw new TypeError('Ripple Next database state does not match its schema');
    return state;
  };

  const persistState = database.transaction(
    (state: AppState, removedSecrets: readonly string[]) => {
      writeState(state);
      const remove = database.prepare(queries.deleteSecret);
      for (const name of removedSecrets) remove.run(name);
    },
  );
  let loadError: unknown = null;

  return {
    filePath,
    getLoadError: () => loadError,
    load: async (): Promise<AppState> => {
      try {
        const state = readState();
        loadError = null;
        return structuredClone(state);
      } catch (error) {
        loadError = error;
        return structuredClone(defaultAppState);
      }
    },
    update: async (
      patch: AppStatePatch,
      removedSecrets: readonly string[] = [],
    ): Promise<AppState> => {
      if (!isAppStatePatch(patch)) throw new TypeError('Invalid Ripple Next app state update');
      const previous = readState();
      const next: AppState = {
        ...previous,
        ...patch,
        settings: { ...previous.settings, ...patch.settings },
      };
      if (!isAppState(next)) throw new TypeError('Invalid Ripple Next app state');
      persistState.immediate(next, removedSecrets);
      loadError = null;
      return structuredClone(next);
    },
    getSecretCiphertext: (key: string): Buffer | null => {
      const row = database.prepare(queries.selectSecret).get(key) as SecretRow | undefined;
      return row ? Buffer.from(row.ciphertext) : null;
    },
    setSecretCiphertext: (key: string, ciphertext: Buffer) => {
      database.prepare(queries.upsertSecret).run(key, ciphertext);
    },
    deleteSecret: (key: string) => {
      database.prepare(queries.deleteSecret).run(key);
    },
    hasSecret: (key: string): boolean => database.prepare(queries.hasSecret).get(key) !== undefined,
    close: () => {
      if (database.open) database.close();
    },
  };
}
