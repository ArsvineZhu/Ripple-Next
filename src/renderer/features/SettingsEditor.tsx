import { useId, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { ElasticScrollArea } from '../components/ElasticScrollArea';
import { InlineNotices } from '../components/InlineNotices';
import { WeatherLocationEditor } from './WeatherSettings';
import { WorkflowEditor } from './WorkflowEditor';
import { AISettingsPage } from './AISettings';
import { ThirdPartyLicenses } from './ThirdPartyLicenses';
import { SettingsFonts } from './SettingsFonts';
import { Select } from '../components/Select';
import type { useSettingsWindowController } from '../hooks/useSettingsWindowController';
import type { SettingsDetail } from '../lib/settingsDetails';
import { isValidSearchUrlTemplate } from '../lib/search';
import { PrefCard, PrefRow } from './SettingsPreferences';
import { useReducedMotionPreference } from '../hooks/useReducedMotionPreference';
import styles from './SettingsTab.module.css';
import { DangerAction } from '../components/DangerAction';
import { SettingsLiquidGlass } from './SettingsLiquidGlass';

export type SettingsFormProps = ReturnType<typeof useSettingsWindowController>;
interface Props {
  settings: SettingsFormProps;
  detail: SettingsDetail;
  onBack(): void;
  onOpenDetail?(detail: SettingsDetail): void;
}

function SimpleFieldEditor({ settings: p, detail }: Props) {
  const { t } = useTranslation();
  const inputId = useId();
  const initial =
    detail.page === 'searchTemplate'
      ? p.searchUrlTemplate
      : detail.page === 'backgroundImage'
        ? p.bgImage === 'none'
          ? ''
          : p.bgImage
        : '';
  const [draft, setDraft] = useState(initial);
  const label = t(detail.page === 'searchTemplate' ? 'searchEngineUrl' : 'backgroundImage');
  const hint = t(detail.page === 'searchTemplate' ? 'searchEngineUrlHint' : 'backgroundImageHint');
  const valid = detail.page !== 'searchTemplate' || isValidSearchUrlTemplate(draft);
  return (
    <PrefCard>
      <div className={styles.prefStack}>
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
            onChange={(event) => {
              const value = event.target.value;
              setDraft(value);
              if (detail.page === 'searchTemplate') {
                if (isValidSearchUrlTemplate(value)) p.setSearchUrlTemplate(value.trim());
              } else p.handleBgImageChange(value.trim() || 'none');
            }}
            autoFocus
          />
        </div>
        {!valid && (
          <p className={styles.fieldError} role="alert">
            {t('invalidSearchUrlTemplate')}
          </p>
        )}
      </div>
    </PrefCard>
  );
}

function ApiKeyEditor({ settings: p }: Pick<Props, 'settings'>) {
  const { t } = useTranslation();
  const inputId = useId();
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const configured = p.hasWeatherApiKey;
  const save = async (value: string) => {
    setBusy(true);
    try {
      if (await p.saveWeatherApiKey(value)) {
        setDraft('');
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
          {t('weatherApiKey')}
          <span className={styles.hint}>{t('weatherApiKeyHint')}</span>
        </label>
        <div className={styles.editRow}>
          <input
            id={inputId}
            className={styles.input}
            type="password"
            autoComplete="new-password"
            value={draft}
            placeholder={configured ? '••••••••' : undefined}
            onChange={(event) => setDraft(event.target.value)}
            disabled={busy}
            autoFocus
          />
          <button type="submit" className={styles.primaryButton} disabled={busy || !draft.trim()}>
            {configured ? t('changeApiKey') : t('saveApiKey')}
          </button>
        </div>
        {configured && (
          <DangerAction label={t('removeApiKey')} disabled={busy} onConfirm={() => save('')}>
            {t('removeApiKey')}
          </DangerAction>
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

function QuickAppNameEditor({ settings: p, detail }: Props) {
  const { t } = useTranslation();
  const inputId = useId();
  const index =
    detail.page === 'quickAppName' ? p.quickApps.findIndex((app) => app.id === detail.appId) : -1;
  const [draft, setDraft] = useState(p.quickApps[index]?.name ?? '');
  return (
    <PrefCard>
      <div className={styles.prefStack}>
        <label className={styles.fieldLabel} htmlFor={inputId}>
          {t('appName')}
        </label>
        <div className={styles.editRow}>
          <input
            id={inputId}
            className={styles.input}
            required
            value={draft}
            onChange={(event) => {
              const value = event.target.value;
              setDraft(value);
              if (index >= 0 && value.trim()) p.handleQaChange(index, value.trim());
            }}
            autoFocus
          />
        </div>
      </div>
    </PrefCard>
  );
}

export function SettingsEditor(props: Props) {
  const page = props.detail.page;
  return (
    <ElasticScrollArea id="settings-detail-container" className={styles.container}>
      {page === 'liquidGlass' ? (
        <SettingsLiquidGlass settings={props.settings} />
      ) : page === 'fonts' ? (
        <SettingsFonts settings={props.settings} />
      ) : page === 'thirdPartyLicenses' ? (
        <ThirdPartyLicenses />
      ) : [
          'aiEndpoints',
          'aiEndpoint',
          'aiCredentials',
          'aiCredential',
          'aiModels',
          'aiModel',
          'aiCustomizations',
          'aiCustomization',
        ].includes(page) ? (
        <AISettingsPage
          controller={props.settings.aiConfiguration}
          detail={props.detail}
          navigate={props.onOpenDetail!}
        />
      ) : page === 'weatherLocation' ? (
        <WeatherLocationEditor settings={props.settings} />
      ) : page === 'weatherApiKey' ? (
        <ApiKeyEditor settings={props.settings} />
      ) : page === 'addQuickApp' ? (
        <QuickAppEditor settings={props.settings} onBack={props.onBack} />
      ) : page === 'addWorkflow' ? (
        <WorkflowEditor />
      ) : page === 'workflow' ? (
        <WorkflowEditor index={props.detail.page === 'workflow' ? props.detail.index : undefined} />
      ) : page === 'quickAppName' ? (
        <QuickAppNameEditor {...props} />
      ) : (
        <SimpleFieldEditor {...props} />
      )}
      <InlineNotices
        area="settings"
        codes={[
          'stateSaveFailed',
          'stateLoadFailed',
          'invalidAISettings',
          'secretStorageUnavailable',
        ]}
      />
    </ElasticScrollArea>
  );
}
