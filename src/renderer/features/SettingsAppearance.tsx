import {
  PreferenceReveal,
  PreferenceGroup,
  PreferenceCard,
  PreferenceRow,
  SettingLink,
} from '../components/preferences';
import type { AppSettings } from '../../shared/appState';
import { useTranslation } from 'react-i18next';
import { Palette } from 'lucide-react';
import { Select } from '../components/Select';
import { InlineNotices } from '../components/InlineNotices';
import { PreferenceSlider } from '../components/PreferenceSlider';
import { NativeColorField } from '../components/NativeColorField';
import { PreferenceSwitch } from '../components/PreferenceSwitch';
import { type SettingsDetail } from '../lib/settingsDetails';
import styles from '../components/preferences/Preferences.module.css';
import { useBackgroundImage } from '../hooks/useBackgroundImage';
import { useSettingsContext } from '../components/SettingsProvider';

export function SettingsAppearance({
  onOpenDetail,
}: {
  onOpenDetail(detail: SettingsDetail): void;
}) {
  const { t } = useTranslation();
  const p = useSettingsContext();
  const positions = [
    { value: 'top-left', label: t('topLeft') },
    { value: 'top-center', label: t('topCenter') },
    { value: 'top-right', label: t('topRight') },
    { value: 'bottom-left', label: t('bottomLeft') },
    { value: 'bottom-center', label: t('bottomCenter') },
    { value: 'bottom-right', label: t('bottomRight') },
  ];
  const isFree = p.settings.positionMode === 'free';
  const { backgroundImageError } = useBackgroundImage(p.settings.backgroundImage);
  return (
    <>
      <PreferenceGroup>
        <PreferenceRow icon={Palette} label={t('theme')}>
          <Select
            label={t('theme')}
            value={p.settings.theme === 'default' ? 'none' : p.settings.theme}
            onValueChange={(value) => p.setTheme(value as AppSettings['theme'])}
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
        </PreferenceRow>
        <PreferenceRow label={t('islandCornerRadius')} hint={t('islandCornerRadiusHint')} stacked>
          <PreferenceSlider
            label={t('islandCornerRadius')}
            startLabel={t('sliderSquare')}
            endLabel={t('sliderRounded')}
            min={0}
            max={60}
            stages={5}
            value={p.settings.islandCornerRadius}
            disabled={p.settings.theme === 'win95'}
            onValueChange={(value) => p.updateSettings({ islandCornerRadius: value })}
          />
        </PreferenceRow>
        <PreferenceRow label={t('islandBorder')}>
          <PreferenceSwitch
            label={t('islandBorder')}
            checked={p.settings.islandBorder}
            onCheckedChange={(value) => p.updateSettings({ islandBorder: value })}
          />
        </PreferenceRow>
        <PreferenceRow label={t('hideInactive')}>
          <PreferenceSwitch
            label={t('hideInactive')}
            checked={p.settings.hideIslandWhenInactive}
            onCheckedChange={(value) => p.updateSettings({ hideIslandWhenInactive: value })}
          />
        </PreferenceRow>
      </PreferenceGroup>
      <PreferenceCard caption={t('positionMode')}>
        <div className={styles.positionCard}>
          <div className={styles.positionGrid}>
            {positions.map((position) => (
              <label key={position.value} className={styles.radioLabel}>
                <input
                  type="radio"
                  name="positionMode"
                  value={position.value}
                  checked={p.settings.positionMode === position.value}
                  onChange={() =>
                    p.updateSettings({
                      positionMode: position.value as AppSettings['positionMode'],
                    })
                  }
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
              checked={isFree}
              onChange={() => p.updateSettings({ positionMode: 'free' })}
            />
            <span className={styles.radioCustom} />
            <span>{t('free')}</span>
          </label>
          <PreferenceReveal visible={isFree} className={styles.manualPosition}>
            <PreferenceRow label={t('positionX')} stacked>
              <PreferenceSlider
                label={t('positionX')}
                startLabel={t('sliderLeft')}
                endLabel={t('sliderRight')}
                min={0}
                max={100}
                step={0.1}
                stages={5}
                value={p.settings.islandX}
                onValueChange={(value) => p.updateSettings({ islandX: value })}
              />
            </PreferenceRow>
            <PreferenceRow label={t('positionY')} stacked>
              <PreferenceSlider
                label={t('positionY')}
                startLabel={t('sliderTop')}
                endLabel={t('sliderBottom')}
                min={0}
                max={500}
                stages={7}
                value={p.settings.islandY}
                onValueChange={(value) => p.updateSettings({ islandY: value })}
              />
            </PreferenceRow>
          </PreferenceReveal>
        </div>
      </PreferenceCard>
      <PreferenceGroup>
        <SettingLink
          detail={{ page: 'liquidGlass' }}
          label={t('liquidGlassExperimental')}
          value={t(p.settings.settingsGlassEnabled ? 'glassStateEnabled' : 'glassStateDisabled')}
          hint={t('liquidGlassExperimentalHint')}
          navigate={onOpenDetail}
        />
      </PreferenceGroup>
      <PreferenceGroup caption={t('colorsAssets')}>
        <PreferenceRow label={t('islandColor')}>
          <NativeColorField
            label={t('islandColor')}
            value={p.settings.backgroundColor}
            onValueChange={(value) => p.updateSettings({ backgroundColor: value })}
          />
        </PreferenceRow>
        <PreferenceRow label={t('textColor')}>
          <NativeColorField
            label={t('textColor')}
            value={p.settings.textColor}
            onValueChange={(value) => p.updateSettings({ textColor: value })}
          />
        </PreferenceRow>
        <InlineNotices area="settings" codes={['colorPickerFailed']} />
        <SettingLink
          detail={{ page: 'backgroundImage' }}
          label={t('backgroundImage')}
          value={
            p.settings.backgroundImage === 'none' ? t('notConfigured') : p.settings.backgroundImage
          }
          hint={t('backgroundImageHint')}
          navigate={onOpenDetail}
        />
        {backgroundImageError && (
          <p className={styles.fieldError} role="alert">
            {t('backgroundImageFailed')}
          </p>
        )}
      </PreferenceGroup>
    </>
  );
}
