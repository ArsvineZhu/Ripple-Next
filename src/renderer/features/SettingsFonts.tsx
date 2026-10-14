import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { uiFontLabels, type UiFont } from '../../shared/fonts';
import type { SettingsFormProps } from './SettingsEditor';
import styles from './SettingsFonts.module.css';

const families = {
  default: "'OpenRunde', var(--font-cjk), sans-serif",
  system: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  'alibaba-puhuiti': "'Alibaba PuHuiTi 3', system-ui, sans-serif",
};

export function SettingsFonts({ settings }: { settings: SettingsFormProps }) {
  const { t } = useTranslation();
  return (
    <section className={styles.page} aria-label={t('fontSettings')}>
      <p className={styles.intro}>{t('fontSettingsHint')}</p>
      <div className={styles.choices}>
        {(Object.keys(uiFontLabels) as UiFont[]).map((font) => (
          <label key={font} className={styles.choice} data-selected={settings.uiFont === font}>
            <input
              type="radio"
              name="ui-font"
              value={font}
              checked={settings.uiFont === font}
              aria-label={t(uiFontLabels[font])}
              onChange={() => settings.setUiFont(font)}
            />
            <div className={styles.copy}>
              <strong>{t(uiFontLabels[font])}</strong>
              <span>
                {t(
                  font === 'default'
                    ? 'fontDefaultHint'
                    : font === 'system'
                      ? 'fontSystemHint'
                      : 'fontAlibabaHint',
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
