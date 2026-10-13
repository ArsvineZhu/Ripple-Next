import { useState } from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Command,
  MousePointer2,
  Settings2,
} from 'lucide-react';
import { useReducedMotionPreference } from '../hooks/useReducedMotionPreference';
import type { SettingsCategoryId } from '../lib/settingsCategories';
import { PrefCard } from './SettingsPreferences';
import styles from './SettingsGuide.module.css';

export function SettingsGuide({ navigate }: { navigate(category: SettingsCategoryId): void }) {
  const { t } = useTranslation();
  const reduced = useReducedMotionPreference();
  const [mode, setMode] = useState<'still' | 'quick' | 'large'>('still');
  const [page, setPage] = useState(0);
  const pages = ['tabOverview', 'tabSearch', 'tabWorkflows'] as const;
  const keys = [
    { keys: ['←', '→'], title: 'guidePages', text: 'guidePagesHint' },
    { keys: ['Ctrl', '1–7'], title: 'guideJump', text: 'guideJumpHint' },
    { keys: ['Enter', 'Space', 'Esc'], title: 'guideControls', text: 'guideControlsHint' },
    { keys: ['←', '→', 'Shift', 'Home', 'End'], title: 'guideSliders', text: 'guideSlidersHint' },
    { keys: ['↑', '↓', 'Home', 'End'], title: 'guideMusic', text: 'guideMusicHint' },
  ] as const;
  return (
    <>
      <section className={styles.intro}>
        <h1>{t('guideTitle')}</h1>
        <p>{t('guideIntro')}</p>
      </section>
      <PrefCard caption={t('guideIsland')}>
        <div className={styles.card}>
          <div className={styles.demoStage}>
            <motion.button
              type="button"
              className={styles.demoIsland}
              aria-label={t('guideDemoLabel')}
              onPointerEnter={() => {
                if (mode === 'still') setMode('quick');
              }}
              onPointerLeave={() => {
                if (mode === 'quick') setMode('still');
              }}
              onClick={() => setMode(mode === 'large' ? 'still' : 'large')}
              animate={{
                width: mode === 'large' ? 270 : mode === 'quick' ? 220 : 140,
                height: mode === 'large' ? 145 : mode === 'quick' ? 72 : 40,
                borderRadius: mode === 'large' ? 30 : mode === 'quick' ? 28 : 20,
              }}
              transition={
                reduced ? { duration: 0 } : { type: 'spring', stiffness: 350, damping: 32 }
              }
            >
              {mode === 'large' ? (
                <>
                  <span className={styles.demoTabs}>{t(pages[page])}</span>
                  <motion.strong
                    key={page}
                    initial={reduced ? false : { opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    {page === 0
                      ? '12:30'
                      : page === 1
                        ? t('guideSearchDemo')
                        : t('guideWorkflowDemo')}
                  </motion.strong>
                  <small>{t('guideDemoCaption')}</small>
                </>
              ) : (
                <>
                  <strong>12:30</strong>
                  {mode === 'quick' && <small>{t('guideQuickCaption')}</small>}
                </>
              )}
            </motion.button>
            <MousePointer2 className={styles.pointer} size={23} aria-hidden="true" />
          </div>
          <p>{t('guideIslandHint')}</p>
          <div className={styles.demoActions}>
            {(['still', 'quick', 'large'] as const).map((value) => (
              <button
                type="button"
                key={value}
                aria-pressed={mode === value}
                onClick={() => setMode(value)}
              >
                {t(
                  value === 'still'
                    ? 'guideStill'
                    : value === 'quick'
                      ? 'guideQuick'
                      : 'guideLarge',
                )}
              </button>
            ))}
          </div>
          <div className={styles.pageActions}>
            <button
              type="button"
              aria-label={t('guidePreviousDemo')}
              onClick={() => {
                setMode('large');
                setPage((value) => (value + 2) % 3);
              }}
            >
              <ArrowLeft size={16} />
            </button>
            <span>{t('guideTryPages')}</span>
            <button
              type="button"
              aria-label={t('guideNextDemo')}
              onClick={() => {
                setMode('large');
                setPage((value) => (value + 1) % 3);
              }}
            >
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </PrefCard>
      <PrefCard caption={t('guideKeyboard')}>
        <div className={styles.card}>
          {keys.map((row) => (
            <div className={styles.keyRow} key={row.title}>
              <div className={styles.keyCaps}>
                {row.keys.map((key) => (
                  <kbd key={key}>{key}</kbd>
                ))}
              </div>
              <div>
                <strong>{t(row.title)}</strong>
                <p>{t(row.text)}</p>
              </div>
            </div>
          ))}
          <div className={styles.gesture}>
            <Command size={20} aria-hidden="true" />
            <p>{t('guideGestures')}</p>
          </div>
        </div>
      </PrefCard>
      <PrefCard caption={t('guideSettings')}>
        <div className={styles.card}>
          <div className={styles.settingDiagram} aria-hidden="true">
            <Settings2 size={26} />
            <span>{t('guideSettingsRow')}</span>
            <ChevronDown size={18} />
            <span>{t('guideSettingsEditor')}</span>
          </div>
          <p>{t('guideAutosave')}</p>
          <p>{t('guideSecrets')}</p>
          <p>{t('guideColors')}</p>
          <div className={styles.connections} aria-label={t('guideAIFlow')}>
            <span>Base URL #1</span>
            <ArrowRight size={16} />
            <span>API Key #1</span>
            <ArrowRight size={16} />
            <span>{t('aiModel')} #1</span>
          </div>
          <p>{t('guideAIFlowHint')}</p>
          <div className={styles.links}>
            <button type="button" onClick={() => navigate('appearance')}>
              {t('settingsNavAppearance')}
              <ArrowRight size={14} />
            </button>
            <button type="button" onClick={() => navigate('integrations')}>
              {t('settingsNavIntegrations')}
              <ArrowRight size={14} />
            </button>
            <button type="button" onClick={() => navigate('shortcuts')}>
              {t('settingsNavShortcuts')}
              <ArrowRight size={14} />
            </button>
          </div>
          <p>{t('guideReopen')}</p>
        </div>
      </PrefCard>
    </>
  );
}
