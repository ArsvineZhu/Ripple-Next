import {
  PreferenceButton,
  PreferenceCard,
  PreferenceRow,
  PreferenceTextField,
} from '../components/preferences';
import { useState } from 'react';
import { SettingsMusic } from './SettingsMusic';
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
import { useSettingsContext, type SettingsValues } from '../components/SettingsProvider';
import { useAppState } from '../components/AppStateProvider';
import { useQuickApps } from '../hooks/useQuickApps';
import type { SettingsDetail } from '../lib/settingsDetails';
import { isValidSearchUrlTemplate } from '../lib/search';
import { useReducedMotionPreference } from '../hooks/useReducedMotionPreference';
import styles from '../components/preferences/Preferences.module.css';
import { DangerAction } from '../components/DangerAction';
import { SettingsLiquidGlass } from './SettingsLiquidGlass';

interface Props {
  settings: SettingsValues;
  detail: SettingsDetail;
  onBack(): void;
  onOpenDetail(detail: SettingsDetail): void;
}

function SimpleFieldEditor({ settings: p, detail }: Props) {
  const { t } = useTranslation();
  const initial =
    detail.page === 'searchTemplate'
      ? p.settings.searchUrlTemplate
      : detail.page === 'backgroundImage'
        ? p.settings.backgroundImage === 'none'
          ? ''
          : p.settings.backgroundImage
        : '';
  const [draft, setDraft] = useState(initial);
  const label = t(detail.page === 'searchTemplate' ? 'searchEngineUrl' : 'backgroundImage');
  const hint = t(detail.page === 'searchTemplate' ? 'searchEngineUrlHint' : 'backgroundImageHint');
  const valid = detail.page !== 'searchTemplate' || isValidSearchUrlTemplate(draft);
  return (
    <PreferenceCard>
      <div className={styles.prefStack}>
        <PreferenceTextField
          label={label}
          hint={hint}
          value={draft}
          invalid={!valid}
          error={!valid ? t('invalidSearchUrlTemplate') : undefined}
          autoFocus
          onValueChange={(value) => {
            setDraft(value);
            if (detail.page === 'searchTemplate') {
              if (isValidSearchUrlTemplate(value))
                p.updateSettings({ searchUrlTemplate: value.trim() });
            } else p.updateSettings({ backgroundImage: value.trim() || 'none' });
          }}
        />
      </div>
    </PreferenceCard>
  );
}

function ApiKeyEditor({ settings: p }: Pick<Props, 'settings'>) {
  const { t } = useTranslation();
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
    <PreferenceCard>
      <form
        className={styles.prefStack}
        onSubmit={(event) => {
          event.preventDefault();
          void save(draft);
        }}
      >
        <PreferenceTextField
          label={t('weatherApiKey')}
          hint={t('weatherApiKeyHint')}
          value={draft}
          onValueChange={setDraft}
          type="password"
          placeholder={configured ? '••••••••' : undefined}
          disabled={busy}
          autoFocus
          action={
            <PreferenceButton type="submit" disabled={busy || !draft.trim()}>
              {t(configured ? 'changeApiKey' : 'saveApiKey')}
            </PreferenceButton>
          }
        />
        {configured && (
          <DangerAction label={t('removeApiKey')} disabled={busy} onConfirm={() => save('')}>
            {t('removeApiKey')}
          </DangerAction>
        )}
        <InlineNotices area="settings" codes={['secretStorageUnavailable']} />
      </form>
    </PreferenceCard>
  );
}

function QuickAppEditor({ onBack }: Pick<Props, 'onBack'>) {
  const p = useQuickApps();
  const { t } = useTranslation();
  const reduced = useReducedMotionPreference();
  const add = (
    <PreferenceButton
      type="submit"

      disabled={p.quickAppMode === 'installed' && !p.selectedApplication}
    >
      {t('addApp')}
    </PreferenceButton>
  );
  return (
    <PreferenceCard>
      <form
        className={styles.prefStack}
        onSubmit={(event) => {
          event.preventDefault();
          if (p.addQuickApp()) onBack();
        }}
      >
        <p className={styles.hint}>{t('quickAppEditorHint')}</p>
        <PreferenceRow label={t('quickApps')}>
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
        </PreferenceRow>
        <div className={styles.appSearch}>
          <PreferenceTextField
            label={t('appName')}
            value={p.newQuickApp}
            onValueChange={p.handleQuickAppInput}
            required
            placeholder={t('quickAppNameHint')}
            autoFocus
            action={p.quickAppMode === 'installed' ? add : undefined}
          />
          <AnimatePresence initial={false}>
            {p.appSearchPending && (
              <motion.p
                key="search-pending"
                className={styles.hint}
                role="status"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.2 }}
              >
                {t('findingApplications')}
              </motion.p>
            )}
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
                    key={app.native?.identifier ?? app.name}
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
              <PreferenceTextField
                label={t('executablePath')}
                value={p.executable}
                onValueChange={p.setExecutable}
                required
              />
              <PreferenceTextField
                label={t('arguments')}
                value={p.argumentLines}
                onValueChange={p.setArgumentLines}
                multiline
                placeholder={t('argumentsHint')}
              />
              <PreferenceTextField
                label={t('workingDirectory')}
                value={p.workingDirectory}
                onValueChange={p.setWorkingDirectory}
                action={add}
              />
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
              <PreferenceTextField
                label={t('applicationUrl')}
                value={p.appUrl}
                onValueChange={p.setAppUrl}
                required
                type="url"
                placeholder="https://example.com"
                action={add}
              />
            </motion.div>
          )}
        </AnimatePresence>
        <InlineNotices area="quick-apps" />
      </form>
    </PreferenceCard>
  );
}

function QuickAppNameEditor({ detail }: Pick<Props, 'detail'>) {
  const { state, updateState } = useAppState();
  const { t } = useTranslation();
  const index =
    detail.page === 'quickAppName'
      ? state.quickApps.findIndex((app) => app.id === detail.appId)
      : -1;
  const [draft, setDraft] = useState(state.quickApps[index]?.name ?? '');
  return (
    <PreferenceCard>
      <div className={styles.prefStack}>
        <PreferenceTextField
          label={t('appName')}
          value={draft}
          required
          autoFocus
          onValueChange={(value) => {
            setDraft(value);
            if (index >= 0 && value.trim())
              updateState({
                quickApps: state.quickApps.map((app, i) =>
                  i === index ? { ...app, name: value.trim() } : app,
                ),
              });
          }}
        />
      </div>
    </PreferenceCard>
  );
}

export function SettingsEditor(input: Omit<Props, 'settings'>) {
  const props = { ...input, settings: useSettingsContext() };
  const page = props.detail.page;
  return (
    <ElasticScrollArea id="settings-detail-container" className={styles.container}>
      {page === 'music' ? (
        <SettingsMusic />
      ) : page === 'liquidGlass' ? (
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
        <AISettingsPage detail={props.detail} navigate={props.onOpenDetail} />
      ) : page === 'weatherLocation' ? (
        <WeatherLocationEditor settings={props.settings} />
      ) : page === 'weatherApiKey' ? (
        <ApiKeyEditor settings={props.settings} />
      ) : page === 'addQuickApp' ? (
        <QuickAppEditor onBack={props.onBack} />
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
