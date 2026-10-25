import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, expect, it } from 'vitest';
import { defaultAIConfiguration } from '../../src/shared/aiConfiguration';
import { defaultAppState } from '../../src/shared/appState';
import { createAppStateStore } from '../../src/main/services/appStateStore';
import {
  incompatibleProfileBackupPath,
  profileResetAllowed,
  profileStoreFileName,
} from '../../src/shared/profileRecovery';

const instant = new Date('2026-10-25T08:30:00.123Z');
const directories: string[] = [];
const stores: ReturnType<typeof createAppStateStore>[] = [];

function legacyAI() {
  const { instruction: _instruction, perception: _perception, ...base } = defaultAIConfiguration();
  return {
    ...base,
    nextId: { endpoint: 2, credential: 1, model: 2 },
    models: [
      {
        id: 1,
        endpointId: 1,
        credentialId: null,
        name: 'm',
        label: '',
        customization: {
          injections: [{ id: 'a', name: 'A', text: 'Hello', enabled: true }],
          perception: { battery: false },
          systemPrompt: 'ignored',
          contextAwareness: false,
        },
      },
    ],
  };
}

async function openStore(directory?: string) {
  if (!directory) {
    directory = await mkdtemp(path.join(tmpdir(), 'ripple-next-recovery-'));
    directories.push(directory);
  }
  const store = createAppStateStore(directory);
  stores.push(store);
  return { directory, store };
}

function writeLegacyProfile(directory: string) {
  const legacy = legacyAI();
  const legacyJson = JSON.stringify(legacy);
  const database = new Database(path.join(directory, profileStoreFileName));
  try {
    database.prepare('UPDATE app_settings SET value = ? WHERE key = ?').run(legacyJson, 'ai');
  } finally {
    database.close();
  }
  return legacyJson;
}

function readAI(directory: string) {
  const database = new Database(path.join(directory, profileStoreFileName), { readonly: true });
  try {
    return database.prepare('SELECT value FROM app_settings WHERE key = ?').pluck().get('ai');
  } finally {
    database.close();
  }
}

afterEach(async () => {
  for (const store of stores.splice(0)) store.close();
  for (const directory of directories.splice(0))
    await rm(directory, { recursive: true, force: true });
});

it('builds a timestamped backup path that is not the live store', () => {
  expect(incompatibleProfileBackupPath('/tmp/ripple', instant)).toBe(
    '/tmp/ripple/backups/incompatible-2026-10-25T08-30-00-123Z',
  );
  expect(incompatibleProfileBackupPath('C:\\Users\\A\\Ripple Next', instant)).toBe(
    'C:\\Users\\A\\Ripple Next\\backups\\incompatible-2026-10-25T08-30-00-123Z',
  );
  const backup = incompatibleProfileBackupPath('/tmp/ripple', instant);
  expect(backup.includes(profileStoreFileName)).toBe(false);
  expect(profileResetAllowed({ backupCompleted: false, confirmedDiscard: false })).toBe(false);
  expect(profileResetAllowed({ backupCompleted: true, confirmedDiscard: false })).toBe(true);
  expect(profileResetAllowed({ backupCompleted: false, confirmedDiscard: true })).toBe(true);
});

it('keeps a rejected profile unchanged until a backup or an explicit reset', async () => {
  const { directory, store } = await openStore();
  store.close();
  const legacyJson = writeLegacyProfile(directory);
  const opened = await openStore(directory);
  await expect(opened.store.load()).rejects.toThrow('does not match its schema');
  expect(() =>
    opened.store.discardIncompatibleStore({ backupCompleted: false, confirmedDiscard: false }),
  ).toThrow('Reset requires a completed backup or an explicit confirmation');
  expect(readAI(directory)).toBe(legacyJson);

  const backup = opened.store.backupIncompatibleProfile(instant);
  expect(backup).toBe(incompatibleProfileBackupPath(directory, instant));
  expect(readAI(backup)).toBe(legacyJson);
  expect(readAI(directory)).toBe(legacyJson);

  opened.store.discardIncompatibleStore({ backupCompleted: true, confirmedDiscard: false });
  const fresh = await openStore(directory);
  expect(await fresh.store.load()).toEqual(defaultAppState);
  expect(readAI(backup)).toBe(legacyJson);
  expect(String(readAI(directory))).not.toContain('Hello');
});

it('replaces the store after an explicit discard without rewriting the rejected profile', async () => {
  const { directory, store } = await openStore();
  store.close();
  const legacyJson = writeLegacyProfile(directory);
  const opened = await openStore(directory);
  await expect(opened.store.load()).rejects.toThrow('does not match its schema');
  expect(readAI(directory)).toBe(legacyJson);
  opened.store.discardIncompatibleStore({ backupCompleted: false, confirmedDiscard: true });
  const fresh = await openStore(directory);
  expect((await fresh.store.load()).settings.ai.instruction).toBe('');
  expect((await fresh.store.load()).settings.ai.models).toEqual([]);
});
