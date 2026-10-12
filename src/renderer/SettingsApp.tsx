import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { LayoutGroup, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { SettingsTab } from './features/SettingsTab';
import { useSettingsWindowController } from './hooks/useSettingsWindowController';
import { useOverlay } from './components/OverlayProvider';
import { SETTINGS_CATEGORIES, type SettingsCategoryId } from './lib/settingsCategories';
import styles from './styles/SettingsApp.module.css';
import { useReducedMotionPreference } from './hooks/useReducedMotionPreference';

export default function SettingsApp() {
  const { t } = useTranslation();
  const controller = useSettingsWindowController();
  const { setContainer } = useOverlay();
  const [category, setCategory] = useState<SettingsCategoryId>('general');
  const reducedMotion = useReducedMotionPreference();
  const transitionRef = useRef<ViewTransition | null>(null);
  const requestedCategory = useRef(category);
  const active = SETTINGS_CATEGORIES.find((item) => item.id === category) ?? SETTINGS_CATEGORIES[0];
  useEffect(() => {
    void window.electronAPI?.setIslandPreview?.(category === 'appearance').catch(() => {});
    return () => {
      void window.electronAPI?.setIslandPreview?.(false).catch(() => {});
    };
  }, [category]);

  const selectCategory = (next: SettingsCategoryId) => {
    if (next === requestedCategory.current) return;
    requestedCategory.current = next;
    transitionRef.current?.skipTransition();
    const commit = () => {
      if (requestedCategory.current === next) flushSync(() => setCategory(next));
    };
    if (reducedMotion || !document.startViewTransition) {
      commit();
      return;
    }
    transitionRef.current = document.startViewTransition(commit);
    // Skipping an in-flight snapshot is expected when another category is selected.
    void transitionRef.current.ready.catch(() => {});
  };

  useEffect(() => {
    if (reducedMotion) transitionRef.current?.skipTransition();
    return () => transitionRef.current?.skipTransition();
  }, [reducedMotion]);

  // HIG: "Update the window's title to reflect the currently visible pane." The pane name belongs to
  // the title bar, so it is not repeated as a heading in the content area.
  useEffect(() => {
    document.title = t(active.labelKey);
  }, [active.labelKey, t]);

  return (
    <div className={styles.app} data-settings>
      <aside className={styles.sidebar} aria-label={t('tabSettings')}>
        <LayoutGroup id="settings-navigation">
          <nav className={styles.nav}>
            {SETTINGS_CATEGORIES.map((item) => {
              const selected = item.id === category;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`${styles.navItem} ${selected ? styles.navItemActive : ''}`}
                  aria-current={selected ? 'page' : undefined}
                  onClick={() => selectCategory(item.id)}
                >
                  {selected && (
                    <motion.span
                      className={styles.navIndicator}
                      layoutId="active-category"
                      initial={false}
                      transition={
                        reducedMotion
                          ? { duration: 0 }
                          : { type: 'spring', stiffness: 440, damping: 38 }
                      }
                      aria-hidden="true"
                    />
                  )}
                  <span className={styles.navLabel}>{t(item.labelKey)}</span>
                </button>
              );
            })}
          </nav>
        </LayoutGroup>
      </aside>
      <div className={styles.pane}>
        <main className={styles.main}>
          <SettingsTab {...controller} category={category} />
        </main>
      </div>
      <div ref={setContainer} className={styles.overlay} />
    </div>
  );
}
