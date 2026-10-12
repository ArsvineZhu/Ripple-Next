UPDATE app_settings
SET value = (
  SELECT json_group_array(value)
  FROM (
    SELECT value FROM json_each(app_settings.value)
    WHERE value != 7
    ORDER BY key
  )
)
WHERE key IN ('tabOrder', 'hiddenTabs');

UPDATE app_settings SET value = '2'
WHERE key = 'defaultTabId' AND value = '7';

PRAGMA user_version = 2;
