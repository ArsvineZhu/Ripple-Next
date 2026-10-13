import type Database from 'better-sqlite3';
import { queries } from './queries';
import {
  AIConfigurationSchema,
  aiSecretName,
  defaultAIConfiguration,
  defaultCustomization,
} from '../../shared/aiConfiguration';

/** Preserve old endpoint/model values and move opaque ciphertext without decryption. */
export function migrateAIConfiguration(database: Database.Database) {
  const rows = database.prepare(queries.selectSettings).all() as { key: string; value: string }[];
  const settings = new Map(rows.map((row) => [row.key, JSON.parse(row.value) as unknown]));
  const read = (key: string) => settings.get(key);
  const parsed = AIConfigurationSchema.safeParse(read('ai'));
  let config = parsed.success ? parsed.data : defaultAIConfiguration();
  const legacyUrl = read('aiBaseUrl');
  const legacyModel = read('aiModel');
  const oldSecret = database.prepare(queries.selectSecret).get('api-key') as
    { ciphertext: Buffer } | undefined;
  if (
    !config.credentials.length &&
    !config.models.length &&
    config.endpoints.length <= 1 &&
    (typeof legacyUrl === 'string' || typeof legacyModel === 'string' || oldSecret)
  ) {
    config = defaultAIConfiguration();
    if (typeof legacyUrl === 'string') config.endpoints[0].baseUrl = legacyUrl;
    if (oldSecret) {
      config.credentials.push({ id: 1, endpointId: 1, label: 'API key #1' });
      config.nextId.credential = 2;
      database.prepare(queries.upsertSecret).run(aiSecretName(1), oldSecret.ciphertext);
    }
    if (typeof legacyModel === 'string' && legacyModel.trim()) {
      config.models.push({
        id: 1,
        endpointId: 1,
        credentialId: oldSecret ? 1 : null,
        name: legacyModel.trim(),
        label: '',
        customization: defaultCustomization(),
      });
      config.nextId.model = 2;
      config.activeModelId = 1;
    }
  }
  database
    .prepare(queries.upsertSetting)
    .run({ key: 'ai', value: JSON.stringify(AIConfigurationSchema.parse(config)) });
  if (oldSecret) database.prepare(queries.deleteSecret).run('api-key');
  database.pragma('user_version = 4');
}
