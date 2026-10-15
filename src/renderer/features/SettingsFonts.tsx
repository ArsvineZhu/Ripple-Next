import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { uiFontLabels, uiFontChoices } from '../../shared/fonts';
import type { SettingsValues } from '../components/SettingsProvider';
import styles from './SettingsFonts.module.css';

const families = {
  default: "'Alibaba PuHuiTi 3', system-ui, sans-serif",
  system: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  openrunde: "'OpenRunde', system-ui, sans-serif",
};

export function SettingsFonts({ settings }: { settings: SettingsValues }) {
  const { t } = useTranslation();
  const selectedFont = settings.settings.uiFont;
  return (
    <section className={styles.page} aria-label={t('fontSettings')}>
      <p className={styles.intro}>{t('fontSettingsHint')}</p>
      <div className={styles.choices}>
        {uiFontChoices.map((font) => (
          <label key={font} className={styles.choice} data-selected={selectedFont === font}>
            <input
              type="radio"
              name="ui-font"
              value={font}
              checked={selectedFont === font}
              aria-label={t(uiFontLabels[font])}
              onChange={() => settings.updateSettings({ uiFont: font })}
            />
            <div className={styles.copy}>
              <strong>{t(uiFontLabels[font])}</strong>
              <span>
                {t(
                  font === 'default'
                    ? 'fontDefaultHint'
                    : font === 'system'
                      ? 'fontSystemHint'
                      : 'fontOpenRundeHint',
                )}
              </span>
              <p className={styles.sample} style={{ fontFamily: families[font] }}>
                {t('fontSample')}
              </p>
              <p className={styles.numbers} style={{ fontFamily: families[font] }}>
                12:30 0123456789
              </p>
            </div>
            <Check className={styles.check} size={20} aria-hidden="true" />
          </label>
        ))}
      </div>
    </section>
  );
}
