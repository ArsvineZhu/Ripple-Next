import { useId } from 'react';
import { MapPin } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { PreferenceSwitch } from '../components/PreferenceSwitch';
import { useReducedMotionPreference } from '../hooks/useReducedMotionPreference';
import { useWeatherPreview } from '../hooks/useWeatherPreview';
import type { SettingsFormProps } from './SettingsEditor';
import { PrefCard, PrefRow } from './SettingsPreferences';
import styles from './SettingsTab.module.css';
import { localeForFormatting } from '../../shared/i18n';

export function WeatherLocationEditor({ settings: p }: { settings: SettingsFormProps }) {
  const { t, i18n } = useTranslation();
  const id = useId();
  const reduced = useReducedMotionPreference();
  const automatic = p.weatherLocation === 'auto:ip';
  const { snapshot, loading } = useWeatherPreview(automatic, p.weatherRefreshToken);
  const eastAsian = ['zh', 'ja'].includes(
    new Intl.Locale(localeForFormatting(i18n.language)).language,
  );
  const address = snapshot?.location
    ? (eastAsian
        ? [snapshot.location.country, snapshot.location.region]
        : [snapshot.location.region, snapshot.location.country]
      )
        .filter(Boolean)
        .join(eastAsian ? '，' : ', ')
    : '';
  return (
    <PrefCard>
      <div className={styles.prefStack}>
        <PrefRow label={t('automaticLocation')} hint={t('automaticLocationHint')}>
          <PreferenceSwitch
            label={t('automaticLocation')}
            checked={automatic}
            onCheckedChange={p.setAutomaticLocation}
          />
        </PrefRow>
        <AnimatePresence initial={false} mode="wait">
          {automatic ? (
            <motion.div
              key="preview"
              className={styles.animatedFields}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.2 }}
            >
              <span className={styles.label}>{t('detectedLocation')}</span>
              <div className={styles.locationPreview} aria-live="polite" aria-busy={loading}>
                <MapPin size={24} strokeWidth={1.7} aria-hidden="true" />
                {snapshot?.location ? (
                  <div className={styles.locationAddress}>
                    <strong>{snapshot.location.city}</strong>
                    <span>{address}</span>
                  </div>
                ) : (
                  <p className={styles.locationStatus}>
                    {loading
                      ? t('detectingLocation')
                      : snapshot?.error === 'missing-key'
                        ? t('weatherKeyMissing')
                        : t('locationLookupFailed')}
                  </p>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="manual"
              className={styles.animatedFields}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.2 }}
            >
              <p className={styles.hint}>{t('manualLocationHint')}</p>
              {(['locationCity', 'locationRegion', 'locationCountry'] as const).map(
                (key, index) => (
                  <label className={styles.fieldLabel} key={key} htmlFor={`${id}-${index}`}>
                    {t(key)}
                    <input
                      id={`${id}-${index}`}
                      className={styles.input}
                      value={p.weatherLocationParts[index]}
                      onChange={(e) => {
                        const parts = [...p.weatherLocationParts] as [string, string, string];
                        parts[index] = e.target.value;
                        p.setWeatherLocationParts(parts);
                      }}
                    />
                  </label>
                ),
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PrefCard>
  );
}
