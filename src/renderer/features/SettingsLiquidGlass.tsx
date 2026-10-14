import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { defaultGlassPreferences } from '../../shared/glassPreferences';
import { PreferenceSwitch } from '../components/PreferenceSwitch';
import { PreferenceSlider } from '../components/PreferenceSlider';
import { GlassBackButton } from '../components/GlassBackButton';
import { Select } from '../components/Select';
import { useReducedMotionPreference } from '../hooks/useReducedMotionPreference';
import type { SettingsValues } from '../components/SettingsProvider';
import {
  PreferenceCard,
  PreferenceGroup,
  PreferenceRow,
  PreferenceNumberField,
} from '../components/preferences';
import styles from '../components/preferences/Preferences.module.css';
import previewStyles from './SettingsLiquidGlass.module.css';

function GlassPreview() {
  const { t } = useTranslation();
  const [value, setValue] = useState(50);
  const [checked, setChecked] = useState(true);
  const [choice, setChoice] = useState('default');
  return (
    <div className={previewStyles.sticky}>
      <PreferenceCard caption={t('glassPreview')}>
        <div className={previewStyles.preview} data-glass-preview data-glass-host>
          <div className={previewStyles.header}>
            <p>{t('glassPreviewHint')}</p>
            <GlassBackButton
              label={t('glassPreviewReset')}
              icon={RotateCcw}
              onClick={() => {
                setValue(50);
                setChecked(true);
                setChoice('default');
              }}
            />
          </div>
          <PreferenceSlider
            label={t('glassPreviewSlider')}
            startLabel={t('sliderLeft')}
            endLabel={t('sliderRight')}
            min={0}
            max={100}
            value={value}
            onValueChange={setValue}
          />
          <div className={previewStyles.controls}>
            <Select
              label={t('glassPreviewMenu')}
              value={choice}
              onValueChange={setChoice}
              options={[
                { value: 'default', label: t('defaultTheme'), description: t('defaultThemeHint') },
                { value: 'black', label: t('sleekBlack'), description: t('sleekBlackHint') },
                { value: 'classic', label: 'Windows 95', description: t('win95ThemeHint') },
              ]}
            />
            <div className={previewStyles.switchRow}>
              <span>{t('glassPreviewSwitch')}</span>
              <PreferenceSwitch
                label={t('glassPreviewSwitch')}
                checked={checked}
                onCheckedChange={setChecked}
              />
            </div>
          </div>
        </div>
      </PreferenceCard>
    </div>
  );
}

export function SettingsLiquidGlass({ settings: p }: { settings: SettingsValues }) {
  const { t } = useTranslation();
  const reduced = useReducedMotionPreference();
  const glass = p.settings;
  const fields = [
    ['glassIor', 'glassIorLabel', 1, 2.5, 0.1],
    ['glassRefraction', 'glassRefractionLabel', 0, 2, 0.1],
    ['glassDispersion', 'glassDispersionLabel', 0, 0.2, 0.01],
    ['glassBlur', 'glassBlurLabel', 0, 12, 0.5],
    ['glassSaturation', 'glassSaturationLabel', 0, 3, 0.1],
    ['glassSpecular', 'glassSpecularLabel', 0, 2, 0.1],
    ['glassElasticity', 'glassElasticityLabel', 0, 1, 0.05],
    ['glassSnapPixels', 'glassSnapLabel', 4, 40, 1],
  ] as const;
  return (
    <>
      <PreferenceGroup>
        <PreferenceRow label={t('settingsGlassEnabled')} hint={t('settingsGlassEnabledHint')}>
          <PreferenceSwitch
            label={t('settingsGlassEnabled')}
            checked={glass.settingsGlassEnabled}
            onCheckedChange={(settingsGlassEnabled) => p.updateSettings({ settingsGlassEnabled })}
          />
        </PreferenceRow>
        <PreferenceRow label={t('islandGlassEnabled')} hint={t('islandGlassUnavailable')}>
          <PreferenceSwitch
            label={t('islandGlassEnabled')}
            checked={false}
            disabled
            onCheckedChange={() => {}}
          />
        </PreferenceRow>
      </PreferenceGroup>
      <GlassPreview />
      <AnimatePresence initial={false}>
        {glass.settingsGlassEnabled && (
          <motion.div
            key="glass-parameters"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
            className={styles.animatedFields}
          >
            <PreferenceGroup caption={t('glassParameters')}>
              <PreferenceRow
                label={t('glassDragDeformationLabel')}
                hint={t('glassDragDeformationHint')}
              >
                <PreferenceSwitch
                  label={t('glassDragDeformationLabel')}
                  checked={glass.glassDragDeformation}
                  onCheckedChange={(glassDragDeformation) =>
                    p.updateSettings({ glassDragDeformation })
                  }
                />
              </PreferenceRow>
              {fields.map(([key, label, min, max, step]) => (
                <PreferenceNumberField
                  key={key}
                  label={t(label)}
                  min={min}
                  max={max}
                  step={step}
                  value={glass[key]}
                  placeholder={String(defaultGlassPreferences[key])}
                  onChange={(value) =>
                    p.updateSettings({ [key]: value ?? defaultGlassPreferences[key] })
                  }
                />
              ))}
            </PreferenceGroup>
            <button
              type="button"
              className={styles.addRowButton}
              onClick={() => {
                const {
                  settingsGlassEnabled: _settings,
                  islandGlassEnabled: _island,
                  ...parameters
                } = defaultGlassPreferences;
                p.updateSettings(parameters);
              }}
            >
              {t('restoreGlassDefaults')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
