import { useId, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { ElasticScrollArea } from '../components/ElasticScrollArea';
import { InlineNotices } from '../components/InlineNotices';
import { PreferenceSwitch } from '../components/PreferenceSwitch';
import { Select } from '../components/Select';
import type { useSettingsWindowController } from '../hooks/useSettingsWindowController';
import type { SettingsDetail } from '../lib/settingsDetails';
import { isValidSearchUrlTemplate } from '../lib/search';
import { splitWorkflowTargets } from '../lib/workflowTargets';
import { PrefCard, PrefRow } from './SettingsPreferences';
import { useReducedMotionPreference } from '../hooks/useReducedMotionPreference';
import styles from './SettingsTab.module.css';

export type SettingsFormProps = ReturnType<typeof useSettingsWindowController>;
interface Props {
  settings: SettingsFormProps;
  detail: SettingsDetail;
  onBack(): void;
}

function WeatherLocationEditor({ settings: p, onBack }: Omit<Props, 'detail'>) {
  const { t } = useTranslation();
  const locationId = useId();
  const reduced = useReducedMotionPreference();
  const [automatic, setAutomatic] = useState(p.weatherLocation === 'auto:ip');
  const [parts, setParts] = useState(() => {
    const fields =
      p.weatherLocation === 'auto:ip'
        ? []
        : p.weatherLocation.split(/[,，]/).map((value) => value.trim());
    return [fields[0] ?? '', fields[1] ?? '', fields.slice(2).join(', ')];
  });
  return (
    <PrefCard>
      <form
        className={styles.prefStack}
        onSubmit={(event) => {
          event.preventDefault();
          p.setWeatherLocation(
            automatic
              ? 'auto:ip'
              : parts
                  .map((value) => value.trim())
                  .filter(Boolean)
                  .join(', '),
          );
          onBack();
        }}
      >
        <PrefRow label={t('automaticLocation')} hint={t('automaticLocationHint')}>
          <PreferenceSwitch
            label={t('automaticLocation')}
            checked={automatic}
            onCheckedChange={setAutomatic}
          />
        </PrefRow>
        <AnimatePresence initial={false}>
          {!automatic && (
            <motion.div
              key="manual-location"
              className={styles.animatedFields}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.2 }}
            >
              <p className={styles.hint}>{t('manualLocationHint')}</p>
              {(['locationCity', 'locationRegion', 'locationCountry'] as const).map(
                (key, index) => (
                  <div key={key} className={styles.fieldLabel}>
                    <label htmlFor={`${locationId}-${index}`}>{t(key)}</label>
                    <div className={styles.editRow}>
                      <input
                        id={`${locationId}-${index}`}
                        className={styles.input}
                        value={parts[index]}
                        required={index === 0 && parts.some((value) => value.trim())}
                        onChange={(event) =>
                          setParts((old) =>
                            old.map((value, i) => (i === index ? event.target.value : value)),
                          )
                        }
                      />
                      {index === 2 && (
                        <button type="submit" className={styles.primaryButton}>
                          {t('saveSettings')}
                        </button>
                      )}
                    </div>
                  </div>
                ),
              )}
            </motion.div>
          )}
          {automatic && (
            <motion.div
              key="automatic-location-save"
              className={styles.saveActions}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.2 }}
            >
              <button type="submit" className={styles.primaryButton}>
                {t('saveSettings')}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </PrefCard>
  );
}

function SimpleFieldEditor({ settings: p, detail, onBack }: Props) {
  const { t } = useTranslation();
  const inputId = useId();
  const initial =
    detail.page === 'searchTemplate'
      ? p.searchUrlTemplate
      : detail.page === 'aiBaseUrl'
        ? p.aiBaseUrl
        : detail.page === 'backgroundImage'
          ? p.bgImage === 'none'
            ? ''
            : p.bgImage
          : '';
  const [draft, setDraft] = useState(initial);
  const label = t(
    detail.page === 'searchTemplate'
      ? 'searchEngineUrl'
      : detail.page === 'aiBaseUrl'
        ? 'aiBaseUrl'
        : 'backgroundImage',
  );
  const hint = t(
    detail.page === 'searchTemplate'
      ? 'searchEngineUrlHint'
      : detail.page === 'aiBaseUrl'
        ? 'aiBaseUrlHint'
        : 'backgroundImageHint',
  );
  const valid = detail.page !== 'searchTemplate' || isValidSearchUrlTemplate(draft);
  return (
    <PrefCard>
      <form
        className={styles.prefStack}
        onSubmit={(event) => {
          event.preventDefault();
          if (!valid) return;
          if (detail.page === 'searchTemplate') p.setSearchUrlTemplate(draft.trim());
          else if (detail.page === 'aiBaseUrl') p.handleApiBaseUrlChange(draft.trim());
          else p.handleBgImageChange(draft.trim() || 'none');
          onBack();
        }}
      >
        <label className={styles.fieldLabel} htmlFor={inputId}>
          {label}
          <span className={styles.hint}>{hint}</span>
        </label>
        <div className={styles.editRow}>
          <input
            id={inputId}
            className={`${styles.input} ${!valid ? styles.invalidInput : ''}`}
            value={draft}
            aria-label={label}
            aria-invalid={!valid}
            onChange={(event) => setDraft(event.target.value)}
            autoFocus
          />
          <button type="submit" className={styles.primaryButton} disabled={!valid}>
            {t('saveSettings')}
          </button>
        </div>
        {!valid && (
          <p className={styles.fieldError} role="alert">
            {t('invalidSearchUrlTemplate')}
          </p>
        )}
      </form>
    </PrefCard>
  );
}

function ApiKeyEditor({ settings: p, onBack }: Omit<Props, 'detail'>) {
  const { t } = useTranslation();
  const inputId = useId();
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async (value: string) => {
    setBusy(true);
    try {
      if (await p.saveApiKey(value)) {
        setDraft('');
        onBack();
      }
    } finally {
      setBusy(false);
    }
  };
  return (
    <PrefCard>
      <form
        className={styles.prefStack}
        onSubmit={(event) => {
          event.preventDefault();
          void save(draft);
        }}
      >
        <label className={styles.fieldLabel} htmlFor={inputId}>
          {t('apiKey')}
          <span className={styles.hint}>{t('apiKeyHint')}</span>
        </label>
        <div className={styles.editRow}>
          <input
            id={inputId}
            className={styles.input}
            type="password"
            autoComplete="new-password"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={busy}
            autoFocus
          />
          <button type="submit" className={styles.primaryButton} disabled={busy || !draft.trim()}>
            {p.hasApiKey ? t('changeApiKey') : t('saveApiKey')}
          </button>
        </div>
        {p.hasApiKey && (
          <button
            type="button"
            className={styles.dangerButton}
            disabled={busy}
            onClick={() => void save('')}
          >
            {t('removeApiKey')}
          </button>
        )}
        <InlineNotices area="settings" codes={['secretStorageUnavailable']} />
      </form>
    </PrefCard>
  );
}

function QuickAppEditor({ settings: p, onBack }: Omit<Props, 'detail'>) {
  const { t } = useTranslation();
  const reduced = useReducedMotionPreference();
  const inputId = useId();
  const add = (
    <button type="submit" className={styles.primaryButton}>
      {t('addApp')}
    </button>
  );
  return (
    <PrefCard>
      <form
        className={styles.prefStack}
        onSubmit={(event) => {
          event.preventDefault();
          if (p.addQuickApp()) onBack();
        }}
      >
        <p className={styles.hint}>{t('quickAppEditorHint')}</p>
        <PrefRow label={t('quickApps')}>
          <Select
            label={t('quickApps')}
            value={p.quickAppMode}
            onValueChange={p.setQuickAppMode}
            options={[
              { value: 'installed', label: t('installedApps') },
              { value: 'command', label: t('customCommand') },
              { value: 'url', label: t('urlShortcut') },
            ]}
          />
        </PrefRow>
        <div className={styles.appSearch}>
          <label className={styles.fieldLabel} htmlFor={`${inputId}-name`}>
            {t('appName')}
          </label>
          <div className={styles.editRow}>
            <input
              id={`${inputId}-name`}
              className={styles.input}
              required
              placeholder={t('quickAppNameHint')}
              value={p.newQuickApp}
              onChange={(event) => p.handleQuickAppInput(event.target.value)}
              autoFocus
            />
            {p.quickAppMode === 'installed' && add}
          </div>
          <AnimatePresence initial={false}>
            {p.quickAppMode === 'installed' && p.showSuggestions && p.appSuggestions.length > 0 && (
              <motion.div
                key="suggestions"
                className={styles.suggestions}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.2 }}
              >
                {p.appSuggestions.map((app) => (
                  <button
                    type="button"
                    key={`${app.name}-${JSON.stringify(app.target)}`}
                    className={styles.suggestion}
                    onClick={() => p.selectQuickApp(app)}
                  >
                    {app.name}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <AnimatePresence initial={false} mode="wait">
          {p.quickAppMode === 'command' && (
            <motion.div
              key="command"
              className={styles.animatedFields}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.2 }}
            >
              <label className={styles.fieldLabel}>
                {t('executablePath')}
                <input
                  className={styles.input}
                  required
                  value={p.executable}
                  onChange={(event) => p.setExecutable(event.target.value)}
                />
              </label>
              <label className={styles.fieldLabel}>
                {t('arguments')}
                <textarea
                  className={`${styles.input} ${styles.argumentInput}`}
                  placeholder={t('argumentsHint')}
                  value={p.argumentLines}
                  onChange={(event) => p.setArgumentLines(event.target.value)}
                />
              </label>
              <label className={styles.fieldLabel} htmlFor={`${inputId}-directory`}>
                {t('workingDirectory')}
              </label>
              <div className={styles.editRow}>
                <input
                  id={`${inputId}-directory`}
                  className={styles.input}
                  value={p.workingDirectory}
                  onChange={(event) => p.setWorkingDirectory(event.target.value)}
                />
                {add}
              </div>
            </motion.div>
          )}
          {p.quickAppMode === 'url' && (
            <motion.div
              key="url"
              className={styles.animatedFields}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.2 }}
            >
              <label className={styles.fieldLabel} htmlFor={`${inputId}-url`}>
                {t('applicationUrl')}
              </label>
              <div className={styles.editRow}>
                <input
                  id={`${inputId}-url`}
                  className={styles.input}
                  type="url"
                  required
                  value={p.appUrl}
                  onChange={(event) => p.setAppUrl(event.target.value)}
                  placeholder="https://example.com"
                />
                {add}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <InlineNotices area="quick-apps" />
      </form>
    </PrefCard>
  );
}

function WorkflowEditor({ settings: p, onBack }: Omit<Props, 'detail'>) {
  const { t } = useTranslation();
  const inputId = useId();
  return (
    <PrefCard>
      <form
        className={styles.prefStack}
        onSubmit={(event) => {
          event.preventDefault();
          if (!p.workflowName.trim() || !splitWorkflowTargets(p.workflowUrls).length) return;
          p.addWorkflow();
          onBack();
        }}
      >
        <label className={styles.fieldLabel}>
          {t('workflowName')}
          <input
            className={styles.input}
            required
            placeholder={t('workflowNameHint')}
            value={p.workflowName}
            onChange={(event) => p.setWorkflowName(event.target.value)}
            autoFocus
          />
        </label>
        <label className={styles.fieldLabel} htmlFor={inputId}>
          {t('workflowApps')}
        </label>
        <div className={styles.editRow}>
          <textarea
            id={inputId}
            className={`${styles.input} ${styles.workflowInput}`}
            required
            placeholder={t('workflowAppsHint')}
            value={p.workflowUrls}
            onChange={(event) => p.setWorkflowUrls(event.target.value)}
          />
          <button type="submit" className={styles.primaryButton}>
            {t('saveWorkflow')}
          </button>
        </div>
      </form>
    </PrefCard>
  );
}

function QuickAppNameEditor({ settings: p, detail, onBack }: Props) {
  const { t } = useTranslation();
  const inputId = useId();
  const index =
    detail.page === 'quickAppName' ? p.quickApps.findIndex((app) => app.id === detail.appId) : -1;
  const [draft, setDraft] = useState(p.quickApps[index]?.name ?? '');
  return (
    <PrefCard>
      <form
        className={styles.prefStack}
        onSubmit={(event) => {
          event.preventDefault();
          if (index < 0 || !draft.trim()) return;
          p.handleQaChange(index, draft.trim());
          onBack();
        }}
      >
        <label className={styles.fieldLabel} htmlFor={inputId}>
          {t('appName')}
        </label>
        <div className={styles.editRow}>
          <input
            id={inputId}
            className={styles.input}
            required
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            autoFocus
          />
          <button type="submit" className={styles.primaryButton} disabled={index < 0}>
            {t('saveSettings')}
          </button>
        </div>
      </form>
    </PrefCard>
  );
}

export function SettingsEditor(props: Props) {
  const page = props.detail.page;
  return (
    <ElasticScrollArea id="settings-detail-container" className={styles.container}>
      {page === 'weatherLocation' ? (
        <WeatherLocationEditor settings={props.settings} onBack={props.onBack} />
      ) : page === 'apiKey' ? (
        <ApiKeyEditor settings={props.settings} onBack={props.onBack} />
      ) : page === 'addQuickApp' ? (
        <QuickAppEditor settings={props.settings} onBack={props.onBack} />
      ) : page === 'addWorkflow' ? (
        <WorkflowEditor settings={props.settings} onBack={props.onBack} />
      ) : page === 'quickAppName' ? (
        <QuickAppNameEditor {...props} />
      ) : (
        <SimpleFieldEditor {...props} />
      )}
      <InlineNotices area="settings" codes={['stateSaveFailed']} />
    </ElasticScrollArea>
  );
}
