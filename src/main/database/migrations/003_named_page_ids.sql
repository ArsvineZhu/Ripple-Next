WITH page_ids(legacy_id, page_id) AS (
  VALUES (0, 'search'), (1, 'workflows'), (2, 'overview'),
         (3, 'playing'), (4, 'assistant'), (5, 'clipboard'), (6, 'tasks')
)
UPDATE app_settings
SET value = (
  SELECT json_group_array(page_id)
  FROM (
    SELECT page_ids.page_id FROM json_each(app_settings.value)
    JOIN page_ids ON page_ids.legacy_id = json_each.value
    ORDER BY json_each.key
  )
)
WHERE key IN ('tabOrder', 'hiddenTabs');

UPDATE app_settings SET value = CASE value
  WHEN '0' THEN '"search"' WHEN '1' THEN '"workflows"'
  WHEN '2' THEN '"overview"' WHEN '3' THEN '"playing"'
  WHEN '4' THEN '"assistant"' WHEN '5' THEN '"clipboard"'
  WHEN '6' THEN '"tasks"' ELSE '"overview"'
END WHERE key = 'defaultTabId';

PRAGMA user_version = 3;
