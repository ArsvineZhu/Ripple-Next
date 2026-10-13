DELETE FROM app_settings WHERE key IN ('aiBaseUrl', 'aiModel');
PRAGMA user_version = 5;
