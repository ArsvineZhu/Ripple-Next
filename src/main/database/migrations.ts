import initialSchema from './migrations/001_initial_schema.sql?raw';
import removeIslandSettingsTab from './migrations/002_remove_island_settings_tab.sql?raw';
import namedPageIds from './migrations/003_named_page_ids.sql?raw';
import removeLegacyAISettings from './migrations/005_remove_legacy_ai_settings.sql?raw';
import type Database from 'better-sqlite3';
import { queries } from './queries';
import { migrateAIConfiguration } from './aiConfigurationMigration';

const migrations = [
  { version: 1, sql: initialSchema },
  { version: 2, sql: removeIslandSettingsTab },
  { version: 3, sql: namedPageIds },
];

export function migrateDatabase(database: Database.Database) {
  const currentVersion = Number(database.prepare(queries.selectUserVersion).pluck().get() ?? 0);
  const latestVersion = 5;
  if (currentVersion > latestVersion) {
    throw new Error(`Database version ${currentVersion} is newer than this Ripple Next build`);
  }

  for (const migration of migrations) {
    if (migration.version <= currentVersion) continue;
    database.transaction(() => database.exec(migration.sql)).immediate();
  }
  if (currentVersion < 4) database.transaction(() => migrateAIConfiguration(database)).immediate();
  if (currentVersion < 5)
    database.transaction(() => database.exec(removeLegacyAISettings)).immediate();
}
