import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createAppStateStore } from '../../src/main/services/appStateStore';
import { createSecretStore } from '../../src/main/services/secretStore';

describe('encrypted API key storage', () => {
  it('persists safeStorage ciphertext in SQLite without a plaintext or sidecar key file', async () => {
    const userDataPath = await mkdtemp(path.join(tmpdir(), 'ripple-next-secret-'));
    const database = createAppStateStore(userDataPath);
    const encryptStringAsync = vi.fn(async (value: string) =>
      Buffer.from(Buffer.from(value).toString('base64')),
    );
    const decryptStringAsync = vi.fn(async (value: Buffer) => ({
      result: Buffer.from(value.toString(), 'base64').toString(),
      shouldReEncrypt: false,
    }));
    const crypto = {
      isAsyncEncryptionAvailable: async () => true,
      getSelectedStorageBackend: () => 'gnome_libsecret',
      encryptStringAsync,
      decryptStringAsync,
    };
    try {
      const store = createSecretStore(database, crypto);
      await store.setSecret('ai-api-key:1', 'sk-sensitive-value');

      const ciphertext = database.getSecretCiphertext('ai-api-key:1');
      expect(ciphertext).not.toBeNull();
      expect(ciphertext?.toString()).not.toContain('sk-sensitive-value');
      expect(existsSync(path.join(userDataPath, 'credentials.bin'))).toBe(false);
      expect(await createSecretStore(database, crypto).getSecret('ai-api-key:1')).toBe(
        'sk-sensitive-value',
      );
      expect(await store.hasSecret('ai-api-key:1')).toBe(true);
    } finally {
      database.close();
      await rm(userDataPath, { recursive: true, force: true });
    }
  });

  it('refuses unavailable encryption without persisting a secret on every platform', async () => {
    const userDataPath = await mkdtemp(path.join(tmpdir(), 'ripple-next-secret-'));
    const database = createAppStateStore(userDataPath);
    const crypto = {
      isAsyncEncryptionAvailable: async () => false,
      getSelectedStorageBackend: () => 'basic_text',
      encryptStringAsync: vi.fn(async (value: string) => Buffer.from(value)),
      decryptStringAsync: vi.fn(),
    };
    try {
      await expect(
        createSecretStore(database, crypto).setSecret('ai-api-key:1', 'sk-secret'),
      ).rejects.toThrow('OS-backed secure storage is unavailable');
      expect(database.hasSecret('ai-api-key:1')).toBe(false);
      expect(existsSync(path.join(userDataPath, 'credentials.bin'))).toBe(false);
    } finally {
      database.close();
      await rm(userDataPath, { recursive: true, force: true });
    }
  });
  it.runIf(process.platform === 'linux')('refuses the Linux plaintext backend', async () => {
    const userDataPath = await mkdtemp(path.join(tmpdir(), 'ripple-next-secret-'));
    const database = createAppStateStore(userDataPath);
    try {
      const crypto = {
        isAsyncEncryptionAvailable: async () => true,
        getSelectedStorageBackend: () => 'basic_text',
        encryptStringAsync: async (value: string) => Buffer.from(value),
        decryptStringAsync: vi.fn(),
      };
      await expect(
        createSecretStore(database, crypto).setSecret('ai-api-key:1', 'sk-secret'),
      ).rejects.toThrow('OS-backed secure storage is unavailable');
      expect(database.hasSecret('ai-api-key:1')).toBe(false);
    } finally {
      database.close();
      await rm(userDataPath, { recursive: true, force: true });
    }
  });
});
