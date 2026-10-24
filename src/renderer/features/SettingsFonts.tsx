import { ArrowUp, ArrowDown, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  appendFonts,
  defaultUIFont,
  fontChoiceKey,
  fontStack,
  uiFontLabels,
  uiFontChoices,
  type FontChoice,
} from '../../shared/fonts';
import type { SettingsValues } from '../components/SettingsProvider';
import { SearchableSelect } from '../components/SearchableSelect';
import { InlineNotices } from '../components/InlineNotices';
import {
  PreferenceButton,
  PreferenceCard,
  PreferenceGroup,
  PreferenceIconButton,
  PreferenceRow,
} from '../components/preferences';
import styles from './SettingsFonts.module.css';

export function SettingsFonts({ settings }: { settings: SettingsValues }) {
  const { t } = useTranslation();
  const fonts = settings.settings.uiFont;
  const [systemFonts, setSystemFonts] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sample, setSample] = useState(
    () => `${t('fontSample')}\nAa Bb 0123456789 · 中文 · 日本語 · Ελληνικά`,
  );
  useEffect(() => {
    let active = true;
    void window.electronAPI
      ?.listSystemFonts?.()
      .then((found) => {
        if (active) setSystemFonts(found);
      })
      .catch(() => {
        if (active) setError(t('fontCatalogFailed'));
      });
    return () => {
      active = false;
    };
  }, [t]);
  const label = (font: FontChoice) =>
    font.kind === 'builtin' ? t(uiFontLabels[font.id]) : font.family;
  const available: FontChoice[] = [
    ...uiFontChoices.map((id) => ({ kind: 'builtin' as const, id })),
    ...systemFonts.map((family) => ({ kind: 'system' as const, family })),
  ];
  const add = (additions: FontChoice[]) => {
    const next = appendFonts(fonts, additions);
    if (next.length > 32 || next.some((font) => font.kind === 'file' && font.faces.length > 32)) {
      setError(t('fontLimit'));
      return;
    }
    void settings.updateSettings({ uiFont: next });
  };
  const move = (index: number, offset: number) => {
    const next = [...fonts];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    void settings.updateSettings({ uiFont: next });
  };
  const chooseFiles = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await window.electronAPI.chooseFontFiles();
      if (result.fonts.length) add(result.fonts);
      if (result.errors.length)
        setError(
          `${t('fontImportFailed')} ${result.errors.map((item) => `${item.file}: ${item.message}`).join('; ')}`,
        );
    } catch (error) {
      setError(
        `${t('fontImportFailed')} ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className={styles.page} aria-label={t('fontSettings')}>
      <p className={styles.intro}>{t('fontSettingsHint')}</p>
      <PreferenceCard caption={t('fontOrder')}>
        <ol className={styles.fontList}>
          {fonts.map((font, index) => (
            <li
              key={fontChoiceKey(font)}
              className={styles.fontItem}
              data-font-choice={fontChoiceKey(font)}
            >
              <span className={styles.order} aria-hidden="true">
                {index + 1}
              </span>
              <div className={styles.copy}>
                <strong>{label(font)}</strong>
                <span>
                  {t(
                    font.kind === 'file'
                      ? 'fontSourceFile'
                      : font.kind === 'system'
                        ? 'fontSourceSystem'
                        : 'fontSourceBuiltin',
                  )}
                  {font.kind === 'file' && ` · ${t('fontFaceCount', { count: font.faces.length })}`}
                </span>
              </div>
              <div className={styles.actions}>
                <PreferenceIconButton
                  label={t('fontMoveUp', { font: label(font) })}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp size={16} />
                </PreferenceIconButton>
                <PreferenceIconButton
                  label={t('fontMoveDown', { font: label(font) })}
                  disabled={index === fonts.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown size={16} />
                </PreferenceIconButton>
                <PreferenceIconButton
                  label={t('fontRemove', { font: label(font) })}
                  disabled={fonts.length === 1}
                  onClick={() =>
                    void settings.updateSettings({ uiFont: fonts.filter((_, i) => i !== index) })
                  }
                >
                  <Trash2 size={16} />
                </PreferenceIconButton>
              </div>
            </li>
          ))}
        </ol>
      </PreferenceCard>
      <PreferenceGroup>
        <PreferenceRow label={t('fontAdd')}>
          <SearchableSelect
            value=""
            label={t('fontAdd')}
            searchPlaceholder={t('fontSearch')}
            emptyLabel={t('fontNoMatches')}
            disabled={fonts.length >= 32}
            options={available
              .filter(
                (font) => !fonts.some((current) => fontChoiceKey(current) === fontChoiceKey(font)),
              )
              .map((font) => ({
                value: fontChoiceKey(font),
                label: label(font),
                description: t(font.kind === 'builtin' ? 'fontSourceBuiltin' : 'fontSourceSystem'),
              }))}
            onValueChange={(key) => {
              const font = available.find((font) => fontChoiceKey(font) === key);
              if (font) add([font]);
            }}
          />
        </PreferenceRow>
        <PreferenceRow label={t('fontImport')} hint={t('fontImportHint')}>
          <PreferenceButton
            disabled={busy || fonts.length >= 32}
            onClick={() => void chooseFiles()}
          >
            <Plus size={16} />
            {t('fontChooseFiles')}
          </PreferenceButton>
        </PreferenceRow>
      </PreferenceGroup>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <InlineNotices area="settings" codes={['fontLoadFailed']} />
      <PreferenceCard caption={t('fontPreview')}>
        <textarea
          className={styles.sample}
          aria-label={t('fontPreview')}
          value={sample}
          onChange={(event) => setSample(event.target.value)}
          style={{ fontFamily: `${fontStack(fonts)}, sans-serif` }}
        />
      </PreferenceCard>
      <PreferenceButton
        variant="secondary"
        onClick={() => void settings.updateSettings({ uiFont: structuredClone(defaultUIFont) })}
      >
        <RotateCcw size={16} />
        {t('fontReset')}
      </PreferenceButton>
    </section>
  );
}
