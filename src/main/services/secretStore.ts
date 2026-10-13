export interface SafeStorageAdapter {
  isAsyncEncryptionAvailable(): Promise<boolean>;
  getSelectedStorageBackend?(): string;
  encryptStringAsync(value: string): Promise<Buffer>;
  decryptStringAsync(value: Buffer): Promise<{ result: string; shouldReEncrypt: boolean }>;
}

export interface SecretDatabase {
  getSecretCiphertext(key: string): Buffer | null;
  setSecretCiphertext(key: string, ciphertext: Buffer): void;
  deleteSecret(key: string): void;
  hasSecret(key: string): boolean;
}

export function createSecretStore(database: SecretDatabase, safeStorage: SafeStorageAdapter) {
  const ensureSecureStorage = async () => {
    if (!(await safeStorage.isAsyncEncryptionAvailable())) {
      throw new Error('OS-backed secure storage is unavailable');
    }
    if (
      process.platform === 'linux' &&
      safeStorage.getSelectedStorageBackend?.() === 'basic_text'
    ) {
      throw new Error('OS-backed secure storage is unavailable');
    }
  };

  const setSecret = async (name: string, value: string) => {
    const key = value.trim();
    if (!key) {
      database.deleteSecret(name);
      return;
    }
    await ensureSecureStorage();
    database.setSecretCiphertext(name, await safeStorage.encryptStringAsync(key));
  };

  const getSecret = async (name: string): Promise<string | null> => {
    const encrypted = database.getSecretCiphertext(name);
    if (!encrypted) return null;
    await ensureSecureStorage();
    const decrypted = await safeStorage.decryptStringAsync(encrypted);
    if (decrypted.shouldReEncrypt) await setSecret(name, decrypted.result);
    return decrypted.result;
  };

  return {
    setSecret,
    getSecret,
    hasSecret: async (name: string) => database.hasSecret(name),
  };
}
