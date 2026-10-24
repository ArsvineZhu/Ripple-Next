import { useTranslation } from 'react-i18next';
import { PreferenceSlider } from '../components/PreferenceSlider';
import { PreferenceSwitch } from '../components/PreferenceSwitch';
import { PreferenceGroup, PreferenceRow } from '../components/preferences';
import { useSettingsContext } from '../components/SettingsProvider';

export function SettingsBehavior() {
  const { t } = useTranslation();
  const p = useSettingsContext();
  return (
    <>
      <PreferenceGroup>
        <PreferenceRow label={t('hideInactive')}>
          <PreferenceSwitch
            label={t('hideInactive')}
            checked={p.settings.hideIslandWhenInactive}
            onCheckedChange={(value) => p.updateSettings({ hideIslandWhenInactive: value })}
          />
        </PreferenceRow>

        <PreferenceRow label={t('batteryAlerts')}>
          <PreferenceSwitch
            label={t('batteryAlerts')}
            checked={p.settings.batteryAlerts}
            onCheckedChange={(value) => p.updateSettings({ batteryAlerts: value })}
          />
        </PreferenceRow>
        <PreferenceRow label={t('standby')} hint={t('standbyHint')}>
          <PreferenceSwitch
            label={t('standby')}
            checked={p.settings.standbyMode}
            onCheckedChange={(value) => p.updateSettings({ standbyMode: value })}
          />
        </PreferenceRow>
        <PreferenceRow label={t('largeStandby')} hint={t('largeStandbyHint')}>
          <PreferenceSwitch
            label={t('largeStandby')}
            checked={p.settings.largeStandbyMode}
            onCheckedChange={(value) => p.updateSettings({ largeStandbyMode: value })}
          />
        </PreferenceRow>
        <PreferenceRow label={t('idleInfo')}>
          <PreferenceSwitch
            label={t('idleInfo')}
            checked={p.settings.showInfoWhenIdle}
            onCheckedChange={(value) => p.updateSettings({ showInfoWhenIdle: value })}
          />
        </PreferenceRow>
        <PreferenceRow label={t('mouseLeaveDelay')} hint={t('mouseLeaveDelayHint')} stacked>
          <PreferenceSlider
            label={t('mouseLeaveDelay')}
            startLabel={t('sliderImmediate')}
            endLabel={t('sliderLater')}
            min={0}
            max={2000}
            step={50}
            stages={3}
            value={p.settings.leaveDelayMs}
            onValueChange={(value) => p.updateSettings({ leaveDelayMs: value })}
          />
        </PreferenceRow>
      </PreferenceGroup>
    </>
  );
}
