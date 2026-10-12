import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import {
  Eye,
  EyeOff,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Plus,
  Star,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { author, bugs, license, productName, repository, version } from '../../../package.json';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { TABS } from '../lib/tabs';
import { Select } from '../components/Select';
import { SearchableSelect } from '../components/SearchableSelect';
import { useSettingsContext } from '../components/SettingsProvider';
import { languagePreference } from '../../shared/i18n';
import { InlineNotices } from '../components/InlineNotices';
import { ElasticScrollArea } from '../components/ElasticScrollArea';
import { PreferenceSlider } from '../components/PreferenceSlider';
import { supportedTimeZones } from '../lib/date';
import { isValidSearchUrlTemplate } from '../lib/search';
import type { SettingsCategoryId } from '../lib/settingsCategories';
import type { IslandController } from '../hooks/useIslandController';
import styles from './SettingsTab.module.css';

const repositoryUrl = repository.url.replace(/\.git$/, '');
const licenseUrl = `${repositoryUrl}/blob/main/LICENSE`;
/** Continuous preference card: rows share one surface with hairline dividers. */
function PrefGroup({ caption, children }: { caption?: string; children: ReactNode }) {
  return (
    <div className={styles.prefGroupBlock}>
      {caption ? <h3 className={styles.prefGroupCaption}>{caption}</h3> : null}
      <div className={styles.prefGroup}>{children}</div>
    </div>
  );
}

/** Standalone preference card for complex editors (colors, lists, secrets, forms). */
function PrefCard({ caption, children }: { caption?: string; children: ReactNode }) {
  return (
    <div className={styles.prefGroupBlock}>
      {caption ? <h3 className={styles.prefGroupCaption}>{caption}</h3> : null}
      <div className={styles.prefCard}>{children}</div>
    </div>
  );
}

function PrefRow({
  label,
  hint,
  children,
  stacked = false,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  stacked?: boolean;
}) {
  return (
    <div className={`${styles.prefRow} ${stacked ? styles.prefRowStacked : ''}`}>
      <div className={styles.prefRowText}>
        <span className={styles.prefRowLabel}>{label}</span>
        {hint ? <p className={styles.prefRowHint}>{hint}</p> : null}
      </div>
      <div className={styles.prefRowControl}>{children}</div>
    </div>
  );
}
type Props = Pick<
  IslandController,
  | 'addQuickApp'
  | 'addWorkflow'
  | 'aiBaseUrl'
  | 'aiModel'
  | 'appSuggestions'
  | 'autoLaunchEnabled'
  | 'batteryAlertsEnabled'
  | 'bgColor'
  | 'bgImage'
  | 'backgroundImageError'
  | 'currentDisplayId'
  | 'defaultTabId'
  | 'displays'
  | 'handleAutoLaunchChange'
  | 'handleApiBaseUrlChange'
  | 'handleBatteryAlertsChange'
  | 'handleBgColorChange'
  | 'handleBgImageChange'
  | 'handleDisplayChange'
  | 'handleHourFormatChange'
  | 'handleAiModelChange'
  | 'handleIslandBorderChange'
  | 'handleIslandCornerRadiusChange'
  | 'handleIslandXChange'
  | 'handleIslandYChange'
  | 'handleLargeStandbyChange'
  | 'handlePositionChange'
  | 'handleQaChange'
  | 'handleQuickAppInput'
  | 'handleShowInfoWhenIdleChange'
  | 'handleStandbyChange'
  | 'handleTextColorChange'
  | 'handleWeatherUnitChange'
  | 'handleLeaveDelayChange'
  | 'handlehideNotActiveIslandChange'
  | 'hiddenTabs'
  | 'hideNotActiveIslandEnabled'
  | 'hourFormat'
  | 'isFree'
  | 'islandBorderEnabled'
  | 'islandCornerRadius'
  | 'islandX'
  | 'islandY'
  | 'hasApiKey'
  | 'largeStandbyEnabled'
  | 'moveTabOrder'
  | 'newQuickApp'
  | 'quickAppMode'
  | 'setQuickAppMode'
  | 'executable'
  | 'setExecutable'
  | 'argumentLines'
  | 'setArgumentLines'
  | 'workingDirectory'
  | 'setWorkingDirectory'
  | 'appUrl'
  | 'setAppUrl'
  | 'leaveDelayMs'
  | 'positionMode'
  | 'quickApps'
  | 'removeQuickApp'
  | 'removeWorkflow'
  | 'saveApiKey'
  | 'searchUrlTemplate'
  | 'setSearchUrlTemplate'
  | 'timeZone'
  | 'handleTimeZoneChange'
  | 'selectQuickApp'
  | 'setDefaultTabId'
  | 'setShowSuggestions'
  | 'setTheme'
  | 'setWeatherLocation'
  | 'setWorkflowName'
  | 'setWorkflowUrls'
  | 'showInfoWhenIdleEnabled'
  | 'showSuggestions'
  | 'standbyBorderEnabled'
  | 'tabOrder'
  | 'textColor'
  | 'theme'
  | 'toggleTabVisibility'
  | 'weatherLocation'
  | 'weatherUnit'
  | 'workflowName'
  | 'workflowUrls'
  | 'workflows'
>;
export function SettingsTab(p: Props & { category: SettingsCategoryId }) {
  const { t, i18n } = useTranslation();
  const { language, handleLanguageChange, showTrayEnabled, handleShowTrayChange } =
    useSettingsContext();
  const [apiKeyDraft, setApiKeyDraft] = useState('');
  const boolOptions = [
    { value: 'true', label: t('enabled') },
    { value: 'false', label: t('disabled') },
  ];
  const positions = [
    { value: 'top-left', label: t('topLeft') },
    { value: 'top-center', label: t('topCenter') },
    { value: 'top-right', label: t('topRight') },
    { value: 'bottom-left', label: t('bottomLeft') },
    { value: 'bottom-center', label: t('bottomCenter') },
    { value: 'bottom-right', label: t('bottomRight') },
  ];
  const timeZoneOptions = [
    { value: 'system', label: t('system'), keywords: ['system'] },
    ...supportedTimeZones.map((timeZone) => {
      const city = timeZone.split('/').at(-1)?.replaceAll('_', ' ') ?? timeZone;
      return {
        value: timeZone,
        label: timeZone,
        keywords: [timeZone.replaceAll('_', ' '), city],
      };
    }),
  ];
  const validSearchUrlTemplate = isValidSearchUrlTemplate(p.searchUrlTemplate);
  const number = (value: number, decimals = 0) =>
    new Intl.NumberFormat(i18n.language, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  return (
    <ElasticScrollArea id="settings-container" className={styles.container}>
      {p.category === 'general' && (
        <>
          <PrefGroup>
            <PrefRow label={t('language')}>
              <Select
                label={t('language')}
                value={language}
                onValueChange={(value) => handleLanguageChange(languagePreference(value))}
                options={[
                  { value: 'system', label: t('system') },
                  { value: 'zh-CN', label: '简体中文' },
                  { value: 'en', label: 'English' },
                  { value: 'zh-TW', label: '繁體中文' },
                  { value: 'ja', label: '日本語' },
                ]}
              />
            </PrefRow>
            <PrefRow label={t('hourFormat')}>
              <Select
                label={t('hourFormat')}
                value={p.hourFormat ? '12-hr' : '24-hr'}
                onValueChange={p.handleHourFormatChange}
                options={[
                  { value: '12-hr', label: t('hour12') },
                  { value: '24-hr', label: t('hour24') },
                ]}
              />
            </PrefRow>
            <PrefRow label={t('timeZone')}>
              <SearchableSelect
                label={t('timeZone')}
                value={p.timeZone}
                onValueChange={p.handleTimeZoneChange}
                options={timeZoneOptions}
                searchPlaceholder={t('searchTimeZones')}
                emptyLabel={t('noTimeZoneMatches')}
              />
            </PrefRow>
          </PrefGroup>
          <PrefGroup>
            <PrefRow label={t('autoLaunch')}>
              <Select
                label={t('autoLaunch')}
                value={String(p.autoLaunchEnabled)}
                onValueChange={p.handleAutoLaunchChange}
                options={boolOptions}
              />
            </PrefRow>
            {window.electronAPI?.platform === 'darwin' && (
              <PrefRow label={t('showTray')} hint={t('showTrayHint')}>
                <Select
                  label={t('showTray')}
                  value={String(showTrayEnabled)}
                  onValueChange={handleShowTrayChange}
                  options={boolOptions}
                />
              </PrefRow>
            )}
          </PrefGroup>
          <InlineNotices area="settings" codes={['autoLaunchFailed']} />
          {window.electronAPI?.platform === 'darwin' && (
            <InlineNotices area="settings" codes={['showTrayFailed']} />
          )}
          <InlineNotices area="system" />
          <InlineNotices area="settings" codes={['stateSaveFailed']} />
          {p.displays.length > 0 && (
            <PrefGroup>
              <PrefRow label={t('display')}>
                <Select
                  label={t('display')}
                  value={p.currentDisplayId || String(p.displays[0].id)}
                  onValueChange={p.handleDisplayChange}
                  options={p.displays.map((display, index) => ({
                    value: String(display.id),
                    label:
                      display.label === `Display ${display.id}`
                        ? t('displayFallback', { number: number(index + 1) })
                        : display.label,
                  }))}
                />
              </PrefRow>
            </PrefGroup>
          )}
        </>
      )}
      {p.category === 'appearance' && (
        <>
          <PrefGroup>
            <PrefRow label={t('theme')}>
              <Select
                label={t('theme')}
                value={p.theme === 'default' ? 'none' : p.theme}
                onValueChange={p.setTheme}
                options={[
                  { value: 'none', label: t('defaultTheme') },
                  { value: 'sleek-black', label: t('sleekBlack') },
                  { value: 'win95', label: 'Windows 95' },
                ]}
              />
            </PrefRow>
            <PrefRow label={t('islandCornerRadius')} hint={t('islandCornerRadiusHint')} stacked>
              <PreferenceSlider
                label={t('islandCornerRadius')}
                startLabel={t('sliderSquare')}
                endLabel={t('sliderRounded')}
                min={0}
                max={60}
                stages={5}
                value={p.islandCornerRadius}
                disabled={p.theme === 'win95'}
                onValueChange={p.handleIslandCornerRadiusChange}
              />
            </PrefRow>
            <PrefRow label={t('islandBorder')}>
              <Select
                label={t('islandBorder')}
                value={String(p.islandBorderEnabled)}
                onValueChange={p.handleIslandBorderChange}
                options={[
                  { value: 'true', label: t('show') },
                  { value: 'false', label: t('hide') },
                ]}
              />
            </PrefRow>
            <PrefRow label={t('hideInactive')}>
              <Select
                label={t('hideInactive')}
                value={String(p.hideNotActiveIslandEnabled)}
                onValueChange={p.handlehideNotActiveIslandChange}
                options={[
                  { value: 'true', label: t('yes') },
                  { value: 'false', label: t('no') },
                ]}
              />
            </PrefRow>
          </PrefGroup>
          <PrefCard caption={t('positionMode')}>
            <div className={styles.positionCard}>
              <div className={styles.positionGrid}>
                {positions.map((position) => (
                  <label key={position.value} className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="positionMode"
                      value={position.value}
                      checked={p.positionMode === position.value}
                      onChange={() => p.handlePositionChange(position.value)}
                    />
                    <span className={styles.radioCustom} />
                    <span>{position.label}</span>
                  </label>
                ))}
              </div>
              <div className={styles.separator} />
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="positionMode"
                  value="free"
                  checked={p.isFree}
                  onChange={() => p.handlePositionChange('free')}
                />
                <span className={styles.radioCustom} />
                <span>{t('free')}</span>
              </label>
              <AnimatePresence propagate>
                {p.isFree && (
                  <motion.div
                    className={styles.manualPosition}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <PrefRow label={t('positionX')} stacked>
                      <PreferenceSlider
                        label={t('positionX')}
                        startLabel={t('sliderLeft')}
                        endLabel={t('sliderRight')}
                        min={0}
                        max={100}
                        step={0.1}
                        stages={5}
                        value={p.islandX}
                        onValueChange={p.handleIslandXChange}
                      />
                    </PrefRow>
                    <PrefRow label={t('positionY')} stacked>
                      <PreferenceSlider
                        label={t('positionY')}
                        startLabel={t('sliderTop')}
                        endLabel={t('sliderBottom')}
                        min={0}
                        max={500}
                        stages={7}
                        value={p.islandY}
                        onValueChange={p.handleIslandYChange}
                      />
                    </PrefRow>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </PrefCard>
          <PrefCard caption={t('colorsAssets')}>
            <div className={styles.prefStack}>
              <PrefRow label={t('islandColor')}>
                <input
                  className={`${styles.input} ${styles.colorInput}`}
                  aria-label={t('islandColor')}
                  placeholder="#000000"
                  value={p.bgColor}
                  onChange={p.handleBgColorChange}
                />
              </PrefRow>
              <PrefRow label={t('textColor')}>
                <input
                  className={`${styles.input} ${styles.colorInput}`}
                  aria-label={t('textColor')}
                  placeholder="#FAFAFA"
                  value={p.textColor}
                  onChange={p.handleTextColorChange}
                />
              </PrefRow>
              <PrefRow label={t('backgroundImage')} hint={t('backgroundImageHint')} stacked>
                <input
                  className={styles.input}
                  aria-label={t('backgroundImage')}
                  placeholder={t('backgroundImageHint')}
                  value={p.bgImage}
                  onChange={p.handleBgImageChange}
                  aria-invalid={p.backgroundImageError}
                  aria-describedby={p.backgroundImageError ? 'background-image-error' : undefined}
                />
                {p.backgroundImageError && (
                  <p id="background-image-error" className={styles.fieldError} role="alert">
                    {t('backgroundImageFailed')}
                  </p>
                )}
              </PrefRow>
            </div>
          </PrefCard>
        </>
      )}
      {p.category === 'behavior' && (
        <>
          <PrefGroup>
            <PrefRow label={t('batteryAlerts')}>
              <Select
                label={t('batteryAlerts')}
                value={String(p.batteryAlertsEnabled)}
                onValueChange={p.handleBatteryAlertsChange}
                options={boolOptions}
              />
            </PrefRow>
            <PrefRow label={t('standby')}>
              <Select
                label={t('standby')}
                value={String(p.standbyBorderEnabled)}
                onValueChange={p.handleStandbyChange}
                options={boolOptions}
              />
            </PrefRow>
            <PrefRow label={t('largeStandby')}>
              <Select
                label={t('largeStandby')}
                value={String(p.largeStandbyEnabled)}
                onValueChange={p.handleLargeStandbyChange}
                options={boolOptions}
              />
            </PrefRow>
            <PrefRow label={t('idleInfo')}>
              <Select
                label={t('idleInfo')}
                value={String(p.showInfoWhenIdleEnabled)}
                onValueChange={p.handleShowInfoWhenIdleChange}
                options={boolOptions}
              />
            </PrefRow>
            <PrefRow label={t('mouseLeaveDelay')} hint={t('mouseLeaveDelayHint')} stacked>
              <PreferenceSlider
                label={t('mouseLeaveDelay')}
                startLabel={t('sliderImmediate')}
                endLabel={t('sliderLater')}
                min={0}
                max={2000}
                step={50}
                stages={3}
                value={p.leaveDelayMs}
                onValueChange={p.handleLeaveDelayChange}
              />
            </PrefRow>
          </PrefGroup>
        </>
      )}
      {p.category === 'pages' && (
        <>
          <PrefCard caption={t('tabManagement')}>
            <p className={styles.prefCardHint}>{t('tabInstructions')}</p>
            <div className={styles.tabList}>
              {p.tabOrder.map((id, index) => {
                const tab = TABS.find((item) => item.id === id);
                if (!tab) return null;
                const hidden = p.hiddenTabs.includes(id);
                const visibilityLabel = t(hidden ? 'show' : 'hide');
                return (
                  <div
                    key={id}
                    className={`${styles.tabItem} ${hidden ? styles.hidden : ''}`}
                    draggable
                    data-island-interactive
                    onDragStart={(event) => {
                      event.dataTransfer.setData('text/plain', String(index));
                      event.currentTarget.dataset.dragging = 'true';
                    }}
                    onDragEnd={(event) => {
                      delete event.currentTarget.dataset.dragging;
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.currentTarget.dataset.dropTarget = 'true';
                    }}
                    onDragLeave={(event) => {
                      delete event.currentTarget.dataset.dropTarget;
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      delete event.currentTarget.dataset.dropTarget;
                      p.moveTabOrder(Number(event.dataTransfer.getData('text/plain')), index);
                    }}
                  >
                    <GripVertical size={14} className={styles.grip} />
                    {tab.icon(p.textColor)}
                    <span className={styles.tabName}>
                      {tab.title ?? t(tab.nameKey ?? 'tabOverview')}
                    </span>
                    <button
                      className={styles.iconButton}
                      title={t('defaultTab')}
                      aria-label={t('defaultTab')}
                      onClick={() => {
                        p.setDefaultTabId(id);
                      }}
                    >
                      <Star
                        size={15}
                        fill={p.defaultTabId === id ? '#ffd700' : 'none'}
                        color={p.defaultTabId === id ? '#ffd700' : 'currentColor'}
                      />
                    </button>
                    <button
                      className={styles.iconButton}
                      title={visibilityLabel}
                      aria-label={visibilityLabel}
                      onClick={() => p.toggleTabVisibility(id)}
                    >
                      {hidden ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                    <button
                      className={styles.iconButton}
                      disabled={index === 0}
                      aria-label={t('moveTabUp')}
                      onClick={() => p.moveTabOrder(index, index - 1)}
                    >
                      <ChevronUp size={15} />
                    </button>
                    <button
                      className={styles.iconButton}
                      disabled={index === p.tabOrder.length - 1}
                      aria-label={t('moveTabDown')}
                      onClick={() => p.moveTabOrder(index, index + 1)}
                    >
                      <ChevronDown size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
          </PrefCard>
          <PrefCard caption={t('browserSearchSettings')}>
            <div className={styles.prefStack}>
              <PrefRow label={t('searchEngineUrl')} hint={t('searchEngineUrlHint')} stacked>
                <input
                  className={`${styles.input} ${!validSearchUrlTemplate ? styles.invalidInput : ''}`}
                  aria-label={t('searchEngineUrl')}
                  aria-invalid={!validSearchUrlTemplate}
                  value={p.searchUrlTemplate}
                  onChange={(event) => p.setSearchUrlTemplate(event.target.value)}
                />
                <AnimatePresence initial={false}>
                  {!validSearchUrlTemplate && (
                    <motion.p
                      className={styles.fieldError}
                      role="alert"
                      initial={{ opacity: 0, filter: 'blur(10px)' }}
                      animate={{ opacity: 1, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, filter: 'blur(10px)' }}
                      transition={{ duration: 0.2 }}
                    >
                      {t('invalidSearchUrlTemplate')}
                    </motion.p>
                  )}
                </AnimatePresence>
              </PrefRow>
            </div>
          </PrefCard>
          <PrefGroup caption={t('weather')}>
            <PrefRow label={t('location')}>
              <input
                className={styles.input}
                aria-label={t('location')}
                placeholder={t('locationHint')}
                value={p.weatherLocation}
                onChange={(event) => {
                  p.setWeatherLocation(event.target.value);
                }}
              />
            </PrefRow>
            <PrefRow label={t('unit')}>
              <Select
                label={t('unit')}
                value={p.weatherUnit}
                onValueChange={p.handleWeatherUnitChange}
                options={[
                  { value: 'f', label: t('fahrenheit') },
                  { value: 'c', label: t('celsius') },
                ]}
              />
            </PrefRow>
          </PrefGroup>
        </>
      )}
      {p.category === 'shortcuts' && (
        <>
          <PrefCard caption={t('quickApps')}>
            <div className={styles.prefStack}>
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
                <div className={styles.row}>
                  <input
                    className={styles.input}
                    aria-label={t('quickAppNameHint')}
                    value={p.newQuickApp}
                    placeholder={t('quickAppNameHint')}
                    onChange={(event) => p.handleQuickAppInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') p.addQuickApp();
                      if (event.key === 'Escape') p.setShowSuggestions(false);
                    }}
                  />
                  <button
                    className={styles.primaryButton}
                    aria-label={t('addApp')}
                    onClick={p.addQuickApp}
                  >
                    <Plus size={18} />
                  </button>
                </div>
                {p.quickAppMode === 'installed' &&
                  p.showSuggestions &&
                  p.appSuggestions.length > 0 && (
                    <div className={styles.suggestions} data-island-interactive>
                      {p.appSuggestions.map((app) => (
                        <button
                          key={`${app.name}-${JSON.stringify(app.target)}`}
                          className={styles.suggestion}
                          onPointerDown={(event) => {
                            event.preventDefault();
                            p.selectQuickApp(app);
                          }}
                        >
                          <span>{app.name}</span>
                          <span className={styles.launchHint}>{t('installedApps')}</span>
                        </button>
                      ))}
                    </div>
                  )}
              </div>
              {p.quickAppMode === 'command' && (
                <div className={styles.quickAppFields}>
                  <input
                    className={styles.input}
                    aria-label={t('executablePath')}
                    placeholder={t('executablePath')}
                    value={p.executable}
                    onChange={(event) => p.setExecutable(event.target.value)}
                  />
                  <textarea
                    className={`${styles.input} ${styles.argumentInput}`}
                    aria-label={t('arguments')}
                    placeholder={t('argumentsHint')}
                    value={p.argumentLines}
                    onChange={(event) => p.setArgumentLines(event.target.value)}
                  />
                  <input
                    className={styles.input}
                    aria-label={t('workingDirectory')}
                    placeholder={t('workingDirectory')}
                    value={p.workingDirectory}
                    onChange={(event) => p.setWorkingDirectory(event.target.value)}
                  />
                </div>
              )}
              {p.quickAppMode === 'url' && (
                <input
                  className={styles.input}
                  aria-label={t('applicationUrl')}
                  placeholder="https://example.com"
                  value={p.appUrl}
                  onChange={(event) => p.setAppUrl(event.target.value)}
                />
              )}
              <InlineNotices area="quick-apps" />
              <div className={styles.appList}>
                <AnimatePresence propagate>
                  {p.quickApps.map((app, index) => (
                    <motion.div
                      key={app.id}
                      className={styles.appRow}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, x: -20, height: 0, padding: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <input
                        className={styles.appName}
                        aria-label={t('appName')}
                        value={app.name}
                        onChange={(event) => p.handleQaChange(index, event.target.value)}
                      />
                      <button
                        className={styles.dangerButton}
                        aria-label={t('removeApp', { name: app.name })}
                        onClick={() => p.removeQuickApp(index)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </PrefCard>
          <PrefCard caption={t('manageWorkflows')}>
            <div className={styles.prefStack}>
              <div id="add-workflow-form" className={styles.workflowForm}>
                <label className={styles.label} htmlFor="workflow-name">
                  {t('workflowName')}
                </label>
                <input
                  id="workflow-name"
                  className={styles.input}
                  placeholder={t('workflowNameHint')}
                  value={p.workflowName}
                  onChange={(event) => p.setWorkflowName(event.target.value)}
                />
                <label className={styles.workflowLabel} htmlFor="workflow-apps">
                  {t('workflowApps')}
                </label>
                <textarea
                  id="workflow-apps"
                  className={`${styles.input} ${styles.workflowInput}`}
                  placeholder={t('workflowAppsHint')}
                  value={p.workflowUrls}
                  onChange={(event) => p.setWorkflowUrls(event.target.value)}
                />
                <button className={styles.primaryButton} onClick={p.addWorkflow}>
                  {t('saveWorkflow')}
                </button>
              </div>
              <div id="workflows-list" className={styles.workflowList}>
                <AnimatePresence propagate>
                  {p.workflows.map((workflow, index) => (
                    <motion.div
                      key={`wf-${workflow.name}-${index}`}
                      className={styles.workflowRow}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, x: -20, height: 0, padding: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className={styles.workflowSummary}>
                        <strong>{workflow.name}</strong>
                        <span className={styles.itemCount}>
                          {t('items', { count: workflow.urls.length })}
                        </span>
                      </div>
                      <button
                        className={styles.dangerButton}
                        onClick={() => p.removeWorkflow(index)}
                      >
                        <Trash2 size={14} />
                        <span>{t('remove')}</span>
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </PrefCard>
        </>
      )}
      {p.category === 'integrations' && (
        <>
          <PrefCard caption={t('aiBaseUrl')}>
            <div className={styles.prefStack}>
              <input
                className={styles.input}
                aria-label={t('aiBaseUrl')}
                value={p.aiBaseUrl}
                placeholder="https://api.openai.com/v1"
                onChange={(event) => p.handleApiBaseUrlChange(event.target.value)}
              />
            </div>
          </PrefCard>
          <PrefCard caption={t('aiModel')}>
            <div className={styles.prefStack}>
              <input
                className={styles.input}
                aria-label={t('aiModel')}
                value={p.aiModel}
                placeholder="model-name"
                onChange={(event) => p.handleAiModelChange(event.target.value)}
              />
            </div>
          </PrefCard>
          <PrefCard caption={t('apiKey')}>
            <div className={styles.prefStack}>
              <div className={styles.keyRow}>
                <input
                  className={[styles.input, styles.keyInput].join(' ')}
                  aria-label={t('apiKey')}
                  type="password"
                  autoComplete="new-password"
                  placeholder={t('apiKeyHint')}
                  value={apiKeyDraft}
                  onChange={(event) => setApiKeyDraft(event.target.value)}
                />
                <div className={styles.keyActions}>
                  <button
                    className={styles.primaryButton}
                    disabled={!apiKeyDraft.trim()}
                    onClick={() => {
                      void p.saveApiKey(apiKeyDraft).then((saved) => {
                        if (saved) setApiKeyDraft('');
                      });
                    }}
                  >
                    {p.hasApiKey ? t('changeApiKey') : t('saveApiKey')}
                  </button>
                  {p.hasApiKey && (
                    <button
                      className={styles.dangerButton}
                      title={t('removeApiKey')}
                      aria-label={t('removeApiKey')}
                      onClick={() => {
                        void p.saveApiKey('').then((saved) => {
                          if (saved) setApiKeyDraft('');
                        });
                      }}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                      <span>{t('remove')}</span>
                    </button>
                  )}
                </div>
              </div>
              {p.hasApiKey && <p className={styles.keyHint}>{t('apiKeyConfigured')}</p>}
              <InlineNotices area="settings" codes={['secretStorageUnavailable']} />
            </div>
          </PrefCard>
        </>
      )}
      {p.category === 'about' && (
        <>
          <PrefGroup caption={t('aboutSystem')}>
            <PrefRow label={t('applicationName')}>
              <span className={styles.aboutValue}>{productName}</span>
            </PrefRow>
            <PrefRow label={t('appVersion')}>
              <span className={styles.aboutValue}>{version}</span>
            </PrefRow>
            <PrefRow label={t('developer')}>
              <span className={styles.aboutValue}>{author.name}</span>
            </PrefRow>
            <PrefRow label={t('license')}>
              <button
                type="button"
                className={styles.aboutLink}
                onClick={() => void window.electronAPI.openExternal(licenseUrl)}
              >
                {license}
                <ExternalLink size={13} aria-hidden="true" />
              </button>
            </PrefRow>
            <PrefRow label={t('repository')}>
              <button
                type="button"
                className={styles.aboutLink}
                onClick={() => void window.electronAPI.openExternal(repositoryUrl)}
              >
                {repositoryUrl.replace(/^https:\/\//, '')}
                <ExternalLink size={13} aria-hidden="true" />
              </button>
            </PrefRow>
            <PrefRow label={t('feedback')}>
              <button
                type="button"
                className={styles.aboutLink}
                onClick={() => void window.electronAPI.openExternal(bugs.url)}
              >
                {t('reportIssue')}
                <ExternalLink size={13} aria-hidden="true" />
              </button>
            </PrefRow>
            <PrefRow label={t('diagnostics')}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => {
                  void window.electronAPI.openDiagnosticsFolder().catch(() => {});
                }}
              >
                {t('openDiagnosticsFolder')}
              </button>
            </PrefRow>
          </PrefGroup>
          <InlineNotices area="settings" codes={['diagnosticsFolderOpenFailed']} />
          <PrefCard>
            <div className={styles.aboutQuit}>
              <p className={styles.hint}>{t('quitRippleHint')}</p>
              <button
                type="button"
                className={`${styles.dangerButton} ${styles.quitButton}`}
                onClick={() => void window.electronAPI.quitApp()}
              >
                {t('quitRipple')}
              </button>
            </div>
          </PrefCard>
        </>
      )}
    </ElasticScrollArea>
  );
}
