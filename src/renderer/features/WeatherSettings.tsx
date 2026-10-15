import { PreferenceTextField, PreferenceCard, PreferenceRow } from '../components/preferences';
import { MapPin } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { PreferenceSwitch } from '../components/PreferenceSwitch';
import { useReducedMotionPreference } from '../hooks/useReducedMotionPreference';
import { useWeather } from '../hooks/useWeather';
import type { SettingsValues } from '../components/SettingsProvider';
import styles from '../components/preferences/Preferences.module.css';
import { localeForFormatting } from '../../shared/i18n';

export function WeatherLocationEditor({ settings: p }: { settings: SettingsValues }) {
  const { t, i18n } = useTranslation();
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
    <PreferenceCard>
      <div className={styles.prefStack}>
        <PreferenceRow label={t('automaticLocation')} hint={t('automaticLocationHint')}>
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
        </PreferenceRow>
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
                <PreferenceTextField
                  key={key}
                  label={t((['locationCity', 'locationRegion', 'locationCountry'] as const)[index])}
                  value={preferences.location[key]}
                  onValueChange={(value) =>
                    p.updateSettings({
                      weather: {
                        ...preferences,
                        location: { ...preferences.location, [key]: value },
                      },
                    })
                  }
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PreferenceCard>
  );
}
