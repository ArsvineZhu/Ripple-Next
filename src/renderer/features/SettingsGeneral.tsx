import {
  PreferenceReveal,
  PreferenceGroup,
  PreferenceRow,
  SettingLink,
} from '../components/preferences';
import { useTranslation } from 'react-i18next';
import { Languages, Clock3, SunMoon, Globe2, Power, Monitor } from 'lucide-react';
import { useMemo, useEffect } from 'react';
import { Select } from '../components/Select';
import { SearchableSelect } from '../components/SearchableSelect';
import { languagePreference, baseLanguage, localeForFormatting } from '../../shared/i18n';
import { uiFontLabels } from '../../shared/fonts';
import { InlineNotices } from '../components/InlineNotices';
import { PreferenceSwitch } from '../components/PreferenceSwitch';
import { supportedTimeZones } from '../lib/date';
import { type SettingsDetail } from '../lib/settingsDetails';
import { useSettingsContext } from '../components/SettingsProvider';

export function SettingsGeneral({ onOpenDetail }: { onOpenDetail(detail: SettingsDetail): void }) {
  const { t, i18n } = useTranslation();
  const p = useSettingsContext();
  const number = (value: number, decimals = 0) =>
    new Intl.NumberFormat(localeForFormatting(i18n.language), {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  const { language, showTray: showTrayEnabled } = p.settings;
  const { autoLaunchPending, setDisplays } = p;
  useEffect(() => {
    void window.electronAPI
      .getDisplays()
      .then(setDisplays)
      .catch(() => {});
  }, [setDisplays]);
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
  return (
    <>
      <PreferenceGroup>
        <PreferenceRow icon={Languages} label={t('language')}>
          <Select
            label={t('language')}
            value={baseLanguage(language)}
            onValueChange={(value) => p.updateSettings({ language: languagePreference(value) })}
            options={[
              { value: 'system', label: t('system'), description: t('systemLanguageHint') },
              { value: 'zh-CN', label: '简体中文' },
              { value: 'en', label: 'English' },
              { value: 'zh-TW', label: '繁體中文' },
              { value: 'ja', label: '日本語' },
            ]}
          />
        </PreferenceRow>
        <PreferenceReveal visible={baseLanguage(language) === 'zh-CN'}>
          <PreferenceRow label={t('chineseStyle')} hint={t('chineseStyleHint')}>
            <Select
              label={t('chineseStyle')}
              value={language}
              onValueChange={(value) => p.updateSettings({ language: languagePreference(value) })}
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
          </PreferenceRow>
        </PreferenceReveal>
        <SettingLink
          detail={{ page: 'fonts' }}
          label={t('fontSettings')}
          value={p.settings.uiFont
            .map((font) => (font.kind === 'builtin' ? t(uiFontLabels[font.id]) : font.family))
            .join(' → ')}
          hint={t('fontSettingsRowHint')}
          navigate={onOpenDetail}
        />
        <PreferenceRow icon={Clock3} label={t('hourFormat')} hint={t('hourFormatHint')}>
          <PreferenceSwitch
            label={t('hourFormat')}
            checked={p.settings.hourFormat === '12-hr'}
            onCheckedChange={(checked) =>
              p.updateSettings({ hourFormat: checked ? '12-hr' : '24-hr' })
            }
          />
        </PreferenceRow>
        <PreferenceReveal visible={p.settings.hourFormat === '12-hr'}>
          <PreferenceRow icon={SunMoon} label={t('showAmPm')}>
            <PreferenceSwitch
              label={t('showAmPm')}
              checked={p.settings.showAmPm}
              onCheckedChange={(value) => p.updateSettings({ showAmPm: value })}
            />
          </PreferenceRow>
        </PreferenceReveal>
        <PreferenceRow icon={Globe2} label={t('timeZone')}>
          <SearchableSelect
            label={t('timeZone')}
            value={p.settings.timeZone}
            onValueChange={(value) => p.updateSettings({ timeZone: value })}
            options={timeZoneOptions}
            searchPlaceholder={t('searchTimeZones')}
            emptyLabel={t('noTimeZoneMatches')}
          />
        </PreferenceRow>
      </PreferenceGroup>
      <PreferenceGroup>
        <PreferenceRow icon={Power} label={t('autoLaunch')}>
          <PreferenceSwitch
            label={t('autoLaunch')}
            checked={p.settings.autoLaunch}
            disabled={autoLaunchPending}
            busy={autoLaunchPending}
            onCheckedChange={p.setAutoLaunch}
          />
        </PreferenceRow>
        {window.electronAPI?.platform === 'darwin' && (
          <PreferenceRow label={t('showTray')} hint={t('showTrayHint')}>
            <PreferenceSwitch
              label={t('showTray')}
              checked={showTrayEnabled}
              onCheckedChange={(checked) => p.updateSettings({ showTray: checked })}
            />
          </PreferenceRow>
        )}
      </PreferenceGroup>
      <InlineNotices area="settings" codes={['autoLaunchFailed']} />
      {window.electronAPI?.platform === 'darwin' && (
        <InlineNotices area="settings" codes={['showTrayFailed']} />
      )}
      <InlineNotices area="system" />
      <InlineNotices area="settings" codes={['stateSaveFailed']} />
      {p.displays.length > 0 && (
        <PreferenceGroup>
          <PreferenceRow icon={Monitor} label={t('display')}>
            <Select
              label={t('display')}
              value={p.settings.displayId || String(p.displays[0].id)}
              onValueChange={(value) => p.updateSettings({ displayId: value })}
              options={p.displays.map((display, index) => ({
                value: String(display.id),
                label:
                  display.label === `Display ${display.id}`
                    ? t('displayFallback', { number: number(index + 1) })
                    : display.label,
              }))}
            />
          </PreferenceRow>
        </PreferenceGroup>
      )}
      <PreferenceGroup>
        <PreferenceRow label={t('sidebarTranslucent')}>
          <PreferenceSwitch
            label={t('sidebarTranslucent')}
            checked={p.settings.settingsSidebarTranslucent}
            onCheckedChange={(value) => p.updateSettings({ settingsSidebarTranslucent: value })}
          />
        </PreferenceRow>
      </PreferenceGroup>
    </>
  );
}
