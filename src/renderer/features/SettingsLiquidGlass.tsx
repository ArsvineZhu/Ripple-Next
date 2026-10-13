import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { defaultGlassPreferences } from '../../shared/glassPreferences';
import { PreferenceSwitch } from '../components/PreferenceSwitch';
import { useReducedMotionPreference } from '../hooks/useReducedMotionPreference';
import type { SettingsFormProps } from './SettingsEditor';
import { PrefGroup, PrefRow, PrefNumberField } from './SettingsPreferences';
import styles from './SettingsTab.module.css';

export function SettingsLiquidGlass({ settings: p }: { settings: SettingsFormProps }) {
  const { t } = useTranslation();
  const reduced = useReducedMotionPreference();
  const glass = p.glassPreferences;
  const fields = [
    ['glassIor', 'glassIorLabel', 1, 2.5, 0.1],
    ['glassRefraction', 'glassRefractionLabel', 0, 2, 0.1],
    ['glassDispersion', 'glassDispersionLabel', 0, 0.2, 0.01],
    ['glassBlur', 'glassBlurLabel', 0, 12, 0.5],
    ['glassSaturation', 'glassSaturationLabel', 0, 3, 0.1],
    ['glassSpecular', 'glassSpecularLabel', 0, 2, 0.1],
    ['glassElasticity', 'glassElasticityLabel', 0, 0.5, 0.05],
    ['glassSnapPixels', 'glassSnapLabel', 4, 20, 1],
  ] as const;
  return (
    <>
      <PrefGroup>
        <PrefRow label={t('settingsGlassEnabled')} hint={t('settingsGlassEnabledHint')}>
          <PreferenceSwitch
            label={t('settingsGlassEnabled')}
            checked={glass.settingsGlassEnabled}
            onCheckedChange={(settingsGlassEnabled) =>
              p.setGlassPreferences({ settingsGlassEnabled })
            }
          />
        </PrefRow>
        <PrefRow label={t('islandGlassEnabled')} hint={t('islandGlassUnavailable')}>
          <PreferenceSwitch
            label={t('islandGlassEnabled')}
            checked={false}
            disabled
            onCheckedChange={() => {}}
          />
        </PrefRow>
      </PrefGroup>
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
            <PrefGroup caption={t('glassParameters')}>
              <PrefRow label={t('glassDragDeformationLabel')} hint={t('glassDragDeformationHint')}>
                <PreferenceSwitch
                  label={t('glassDragDeformationLabel')}
                  checked={glass.glassDragDeformation}
                  onCheckedChange={(glassDragDeformation) =>
                    p.setGlassPreferences({ glassDragDeformation })
                  }
                />
              </PrefRow>
              {fields.map(([key, label, min, max, step]) => (
                <PrefNumberField
                  key={key}
                  label={t(label)}
                  min={min}
                  max={max}
                  step={step}
                  value={glass[key]}
                  placeholder={String(defaultGlassPreferences[key])}
                  onChange={(value) =>
                    p.setGlassPreferences({ [key]: value ?? defaultGlassPreferences[key] })
                  }
                />
              ))}
            </PrefGroup>
            <button
              type="button"
              className={styles.addRowButton}
              onClick={() => {
                const {
                  settingsGlassEnabled: _settings,
                  islandGlassEnabled: _island,
                  ...parameters
                } = defaultGlassPreferences;
                p.setGlassPreferences(parameters);
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
