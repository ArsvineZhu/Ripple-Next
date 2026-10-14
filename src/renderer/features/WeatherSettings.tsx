import { useId } from 'react';
import { MapPin } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { PreferenceSwitch } from '../components/PreferenceSwitch';
import { useReducedMotionPreference } from '../hooks/useReducedMotionPreference';
import { useWeather } from '../hooks/useWeather';
import type { SettingsFormProps } from './SettingsEditor';
import { PrefCard, PrefRow } from './SettingsPreferences';
import styles from './SettingsTab.module.css';
import { localeForFormatting } from '../../shared/i18n';

export function WeatherLocationEditor({ settings: p }: { settings: SettingsFormProps }) {
  const { t, i18n } = useTranslation();
  const id = useId();
  const reduced = useReducedMotionPreference();
  const preferences = p.settings.weather;
  const automatic = preferences.location.mode === 'automatic';
  const { snapshot, loading } = useWeather(automatic, 60_000);
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
            onCheckedChange={(checked) =>
              p.updateSettings({
                weather: {
                  ...preferences,
                  location: { ...preferences.location, mode: checked ? 'automatic' : 'manual' },
                },
              })
            }
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
              {(['city', 'region', 'country'] as const).map((key, index) => (
                <label className={styles.fieldLabel} key={key} htmlFor={`${id}-${index}`}>
                  {t((['locationCity', 'locationRegion', 'locationCountry'] as const)[index])}
                  <input
                    id={`${id}-${index}`}
                    className={styles.input}
                    value={preferences.location[key]}
                    onChange={(e) => {
                      p.updateSettings({
                        weather: {
                          ...preferences,
                          location: { ...preferences.location, [key]: e.target.value },
                        },
                      });
                    }}
                  />
                </label>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PrefCard>
  );
}
