import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import {
  Eye,
  EyeOff,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Star,
  Languages,
  Type,
  Clock3,
  SunMoon,
  Globe2,
  Power,
  Monitor,
  Palette,
  CloudSun,
  Thermometer,
  MapPin,
  Search,
  Image,
  AppWindow,
  Workflow,
  ScrollText,
  type LucideIcon,
  ExternalLink,
} from 'lucide-react';
import { author, bugs, license, productName, repository, version } from '../../../package.json';
import appIcon from '../../assets/icons/icon.png';
import { useMemo } from 'react';
import { TABS } from '../lib/tabs';
import { Select } from '../components/Select';
import { SearchableSelect } from '../components/SearchableSelect';
import { useSettingsContext } from '../components/SettingsProvider';
import { languagePreference, baseLanguage, localeForFormatting } from '../../shared/i18n';
import { uiFontLabels } from '../../shared/fonts';
import { InlineNotices } from '../components/InlineNotices';
import { ElasticScrollArea } from '../components/ElasticScrollArea';
import { PreferenceSlider } from '../components/PreferenceSlider';
import { NativeColorField } from '../components/NativeColorField';
import { PreferenceSwitch } from '../components/PreferenceSwitch';
import { supportedTimeZones } from '../lib/date';
import type { SettingsCategoryId } from '../lib/settingsCategories';
import { SettingsEditor, type SettingsFormProps } from './SettingsEditor';
import { AIConfigurationEntries } from './AISettings';
import { SettingsGuide } from './SettingsGuide';
import { DangerAction } from '../components/DangerAction';
import { PrefGroup, PrefCard, PrefRow, PreferenceLink } from './SettingsPreferences';
import { detailEntryId, type SettingsDetail } from '../lib/settingsDetails';
import { useReducedMotionPreference } from '../hooks/useReducedMotionPreference';
import styles from './SettingsTab.module.css';

const detailIcons: Partial<Record<SettingsDetail['page'], LucideIcon>> = {
  fonts: Type,
  weatherLocation: MapPin,
  weatherApiKey: CloudSun,
  searchTemplate: Search,
  backgroundImage: Image,
  addQuickApp: AppWindow,
  quickAppName: AppWindow,
  addWorkflow: Workflow,
  workflow: Workflow,
  thirdPartyLicenses: ScrollText,
};
const repositoryUrl = repository.url.replace(/\.git$/, '');
const licenseUrl = `${repositoryUrl}/blob/main/LICENSE`;
export function SettingsTab(
  p: SettingsFormProps & {
    category: SettingsCategoryId;
    detail?: SettingsDetail | null;
    onOpenDetail(detail: SettingsDetail): void;
    onBack(): void;
    onNavigateCategory(category: SettingsCategoryId): void;
  },
) {
  const { t, i18n } = useTranslation();
  const reduced = useReducedMotionPreference();
  const {
    language,
    handleLanguageChange,
    showTrayEnabled,
    handleShowTrayChange,
    autoLaunchPending,
  } = useSettingsContext();
  const positions = [
    { value: 'top-left', label: t('topLeft') },
    { value: 'top-center', label: t('topCenter') },
    { value: 'top-right', label: t('topRight') },
    { value: 'bottom-left', label: t('bottomLeft') },
    { value: 'bottom-center', label: t('bottomCenter') },
    { value: 'bottom-right', label: t('bottomRight') },
  ];
  const timeZoneOptions = useMemo(
    () => [
      {
        value: 'system',
        label: t('system'),
        keywords: ['system'],
        description: t('systemTimeZoneHint'),
      },
      ...supportedTimeZones.map((timeZone) => {
        const city = timeZone.split('/').at(-1)?.replaceAll('_', ' ') ?? timeZone;
        return {
          value: timeZone,
          label: timeZone,
          keywords: [timeZone.replaceAll('_', ' '), city],
        };
      }),
    ],
    [t],
  );
  const number = (value: number, decimals = 0) =>
    new Intl.NumberFormat(localeForFormatting(i18n.language), {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  if (p.detail)
    return (
      <SettingsEditor
        key={detailEntryId(p.detail)}
        settings={p}
        detail={p.detail}
        onBack={p.onBack}
        onOpenDetail={p.onOpenDetail}
      />
    );
  const entry = (detail: SettingsDetail, label: string, value?: string, hint?: string) => (
    <PreferenceLink
      label={label}
      value={value}
      hint={hint}
      icon={detailIcons[detail.page]}
      entry={detailEntryId(detail)}
      onClick={() => p.onOpenDetail(detail)}
    />
  );
  return (
    <ElasticScrollArea id="settings-container" className={styles.container}>
      {p.category === 'guide' && <SettingsGuide navigate={p.onNavigateCategory} />}
      {p.category === 'general' && (
        <>
          <PrefGroup>
            <PrefRow icon={Languages} label={t('language')}>
              <Select
                label={t('language')}
                value={baseLanguage(language)}
                onValueChange={(value) => handleLanguageChange(languagePreference(value))}
                options={[
                  { value: 'system', label: t('system'), description: t('systemLanguageHint') },
                  { value: 'zh-CN', label: '简体中文' },
                  { value: 'en', label: 'English' },
                  { value: 'zh-TW', label: '繁體中文' },
                  { value: 'ja', label: '日本語' },
                ]}
              />
            </PrefRow>
            <AnimatePresence initial={false}>
              {baseLanguage(language) === 'zh-CN' && (
                <motion.div
                  key="chinese-style"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: reduced ? 0 : 0.2 }}
                >
                  <PrefRow label={t('chineseStyle')} hint={t('chineseStyleHint')}>
                    <Select
                      label={t('chineseStyle')}
                      value={language}
                      onValueChange={(value) => handleLanguageChange(languagePreference(value))}
                      options={[
                        { value: 'zh-CN', label: t('chineseStandard') },
                        {
                          value: 'zh-ms',
                          label: t('chineseMicrosoft'),
                          description: t('chineseMicrosoftHint'),
                        },
                        {
                          value: 'zh-apple',
                          label: t('chineseApple'),
                          description: t('chineseAppleHint'),
                        },
                      ]}
                    />
                  </PrefRow>
                </motion.div>
              )}
            </AnimatePresence>
            {entry(
              { page: 'fonts' },
              t('fontSettings'),
              t(uiFontLabels[p.uiFont]),
              t('fontSettingsRowHint'),
            )}
            <PrefRow icon={Clock3} label={t('hourFormat')} hint={t('hourFormatHint')}>
              <PreferenceSwitch
                label={t('hourFormat')}
                checked={p.hourFormat}
                onCheckedChange={(checked) => p.handleHourFormatChange(checked ? '12-hr' : '24-hr')}
              />
            </PrefRow>
            <AnimatePresence initial={false}>
              {p.hourFormat && (
                <motion.div
                  key="am-pm"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: reduced ? 0 : 0.2 }}
                  style={{ overflow: 'hidden' }}
                >
                  <PrefRow icon={SunMoon} label={t('showAmPm')}>
                    <PreferenceSwitch
                      label={t('showAmPm')}
                      checked={p.showAmPm}
                      onCheckedChange={p.setShowAmPm}
                    />
                  </PrefRow>
                </motion.div>
              )}
            </AnimatePresence>
            <PrefRow icon={Globe2} label={t('timeZone')}>
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
            <PrefRow icon={Power} label={t('autoLaunch')}>
              <PreferenceSwitch
                label={t('autoLaunch')}
                checked={p.autoLaunchEnabled}
                disabled={autoLaunchPending}
                busy={autoLaunchPending}
                onCheckedChange={p.handleAutoLaunchChange}
              />
            </PrefRow>
            {window.electronAPI?.platform === 'darwin' && (
              <PrefRow label={t('showTray')} hint={t('showTrayHint')}>
                <PreferenceSwitch
                  label={t('showTray')}
                  checked={showTrayEnabled}
                  onCheckedChange={handleShowTrayChange}
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
              <PrefRow icon={Monitor} label={t('display')}>
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
            <PrefRow icon={Palette} label={t('theme')}>
              <Select
                label={t('theme')}
                value={p.theme === 'default' ? 'none' : p.theme}
                onValueChange={p.setTheme}
                options={[
                  { value: 'none', label: t('defaultTheme'), description: t('defaultThemeHint') },
                  {
                    value: 'sleek-black',
                    label: t('sleekBlack'),
                    description: t('sleekBlackHint'),
                  },
                  { value: 'win95', label: 'Windows 95', description: t('win95ThemeHint') },
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
              <PreferenceSwitch
                label={t('islandBorder')}
                checked={p.islandBorderEnabled}
                onCheckedChange={p.handleIslandBorderChange}
              />
            </PrefRow>
            <PrefRow label={t('hideInactive')}>
              <PreferenceSwitch
                label={t('hideInactive')}
                checked={p.hideNotActiveIslandEnabled}
                onCheckedChange={p.handlehideNotActiveIslandChange}
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
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
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
          <PrefGroup>
            {entry(
              { page: 'liquidGlass' },
              t('liquidGlassExperimental'),
              t(
                p.glassPreferences.settingsGlassEnabled
                  ? 'glassStateEnabled'
                  : 'glassStateDisabled',
              ),
              t('liquidGlassExperimentalHint'),
            )}
          </PrefGroup>
          <PrefGroup caption={t('colorsAssets')}>
            <PrefRow label={t('islandColor')}>
              <NativeColorField
                label={t('islandColor')}
                value={p.bgColor}
                onValueChange={p.handleBgColorChange}
              />
            </PrefRow>
            <PrefRow label={t('textColor')}>
              <NativeColorField
                label={t('textColor')}
                value={p.textColor}
                onValueChange={p.handleTextColorChange}
              />
            </PrefRow>
            <InlineNotices area="settings" codes={['colorPickerFailed']} />
            {entry(
              { page: 'backgroundImage' },
              t('backgroundImage'),
              p.bgImage === 'none' ? t('notConfigured') : p.bgImage,
              t('backgroundImageHint'),
            )}
            {p.backgroundImageError && (
              <p className={styles.fieldError} role="alert">
                {t('backgroundImageFailed')}
              </p>
            )}
          </PrefGroup>
        </>
      )}
      {p.category === 'behavior' && (
        <>
          <PrefGroup>
            <PrefRow label={t('batteryAlerts')}>
              <PreferenceSwitch
                label={t('batteryAlerts')}
                checked={p.batteryAlertsEnabled}
                onCheckedChange={p.handleBatteryAlertsChange}
              />
            </PrefRow>
            <PrefRow label={t('standby')} hint={t('standbyHint')}>
              <PreferenceSwitch
                label={t('standby')}
                checked={p.standbyBorderEnabled}
                onCheckedChange={p.handleStandbyChange}
              />
            </PrefRow>
            <PrefRow label={t('largeStandby')} hint={t('largeStandbyHint')}>
              <PreferenceSwitch
                label={t('largeStandby')}
                checked={p.largeStandbyEnabled}
                onCheckedChange={p.handleLargeStandbyChange}
              />
            </PrefRow>
            <PrefRow label={t('idleInfo')}>
              <PreferenceSwitch
                label={t('idleInfo')}
                checked={p.showInfoWhenIdleEnabled}
                onCheckedChange={p.handleShowInfoWhenIdleChange}
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
          <PrefGroup caption={t('browserSearchSettings')}>
            {entry({ page: 'searchTemplate' }, t('searchEngineUrl'), p.searchUrlTemplate)}
          </PrefGroup>
          <PrefGroup caption={t('weather')}>
            <PrefRow
              icon={CloudSun}
              label={t('useBuiltInWeatherApi')}
              hint={t('useBuiltInWeatherApiHint')}
            >
              <PreferenceSwitch
                label={t('useBuiltInWeatherApi')}
                checked={p.useBuiltInWeatherApi}
                onCheckedChange={p.setUseBuiltInWeatherApi}
              />
            </PrefRow>
            <AnimatePresence initial={false}>
              {!p.useBuiltInWeatherApi && (
                <motion.div
                  key="weather-api-key"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: reduced ? 0 : 0.2 }}
                >
                  {entry(
                    { page: 'weatherApiKey' },
                    t('weatherApiKey'),
                    p.hasWeatherApiKey ? '••••••••' : t('notConfigured'),
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            {entry(
              { page: 'weatherLocation' },
              t('location'),
              p.weatherLocation === 'auto:ip'
                ? t('automaticLocation')
                : p.weatherLocation || t('notConfigured'),
            )}
            <PrefRow icon={Thermometer} label={t('unit')} hint={t('unitHint')}>
              <PreferenceSwitch
                label={t('unit')}
                checked={p.weatherUnit === 'c'}
                onCheckedChange={(checked) => p.handleWeatherUnitChange(checked ? 'c' : 'f')}
              />
            </PrefRow>
          </PrefGroup>
        </>
      )}
      {p.category === 'shortcuts' && (
        <>
          <PrefGroup caption={t('quickApps')}>
            {p.quickApps.map((app, index) => (
              <div className={styles.compactItem} key={app.id}>
                {entry({ page: 'quickAppName', appId: app.id }, app.name)}
                <DangerAction
                  label={t('removeApp', { name: app.name })}
                  onConfirm={() => p.removeQuickApp(index)}
                />
              </div>
            ))}
            {entry(
              { page: 'addQuickApp' },
              t('addApp'),
              undefined,
              p.quickApps.length ? undefined : t('quickAppEditorHint'),
            )}
          </PrefGroup>
          <InlineNotices area="quick-apps" />
          <PrefGroup caption={t('manageWorkflows')}>
            {p.workflows.map((workflow, index) => (
              <div className={styles.compactItem} key={index}>
                {entry(
                  { page: 'workflow', index },
                  workflow.name,
                  t('items', { count: workflow.urls.length }),
                )}
                <DangerAction
                  label={t('removeWorkflow', { name: workflow.name })}
                  onConfirm={() => p.removeWorkflow(index)}
                />
              </div>
            ))}
            {entry(
              { page: 'addWorkflow' },
              t('addWorkflow'),
              undefined,
              p.workflows.length ? undefined : t('workflowEditorHint'),
            )}
          </PrefGroup>
        </>
      )}
      {p.category === 'integrations' && (
        <AIConfigurationEntries controller={p.aiConfiguration} navigate={p.onOpenDetail} />
      )}
      {p.category === 'about' && (
        <>
          <section
            className={styles.aboutHero}
            aria-labelledby="about-product-title"
            data-about-hero
          >
            <img src={appIcon} alt="" width={72} height={72} draggable={false} />
            <h2 id="about-product-title">{productName}</h2>
            <p>{t('aboutTagline')}</p>
            <span>
              {t('appVersion')} {version}
            </span>
          </section>
          <PrefGroup>
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
          <PrefGroup>
            {entry(
              { page: 'thirdPartyLicenses' },
              t('thirdPartyLicenses'),
              undefined,
              t('thirdPartyLicenseHint'),
            )}
          </PrefGroup>
          <PrefCard>
            <div className={styles.aboutQuit}>
              <p className={styles.hint}>{t('quitRippleHint')}</p>
              <DangerAction
                label={t('quitRipple')}
                className={styles.quitButton}
                onConfirm={() => window.electronAPI.quitApp()}
              >
                {t('quitRipple')}
              </DangerAction>
            </div>
          </PrefCard>
        </>
      )}
      <InlineNotices area="settings" codes={['stateSaveFailed']} />
    </ElasticScrollArea>
  );
}
