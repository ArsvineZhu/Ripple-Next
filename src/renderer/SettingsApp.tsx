import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { LayoutGroup, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { SettingsTab } from './features/SettingsTab';
import { useSettingsWindowController } from './hooks/useSettingsWindowController';
import { useOverlay } from './components/OverlayProvider';
import { SETTINGS_CATEGORIES, type SettingsCategoryId } from './lib/settingsCategories';
import styles from './styles/SettingsApp.module.css';
import { useReducedMotionPreference } from './hooks/useReducedMotionPreference';
import { GlassBackButton } from './components/GlassBackButton';
import { detailLabels, detailEntryId, type SettingsDetail } from './lib/settingsDetails';

export default function SettingsApp() {
  const { t } = useTranslation();
  const controller = useSettingsWindowController();
  const { setContainer, setOpenId } = useOverlay();
  const [category, setCategory] = useState<SettingsCategoryId>('general');
  const [detail, setDetail] = useState<SettingsDetail | null>(null);
  const restore = useRef<{ scroll: number; entry: string | null }>({ scroll: 0, entry: null });
  const reducedMotion = useReducedMotionPreference();
  const transitionRef = useRef<ViewTransition | null>(null);
  const requestedCategory = useRef(category);
  const requestedDetail = useRef<SettingsDetail | null>(null);
  const transitionVersion = useRef(0);
  const active = SETTINGS_CATEGORIES.find((item) => item.id === category) ?? SETTINGS_CATEGORIES[0];
  useEffect(() => {
    void window.electronAPI?.setIslandPreview?.(category === 'appearance').catch(() => {});
    return () => {
      void window.electronAPI?.setIslandPreview?.(false).catch(() => {});
    };
  }, [category]);

  const animateChange = (change: () => void, direction: 'category' | 'forward' | 'back') => {
    const version = ++transitionVersion.current;
    transitionRef.current?.skipTransition();
    document.documentElement.setAttribute('data-settings-motion', direction);
    const commit = () => {
      if (transitionVersion.current === version) flushSync(change);
    };
    if (reducedMotion || !document.startViewTransition) {
      commit();
      return;
    }
    transitionRef.current = document.startViewTransition(commit);
    // Skipping an in-flight snapshot is expected when another category is selected.
    void transitionRef.current.ready.catch(() => {});
  };

  const selectCategory = (next: SettingsCategoryId) => {
    if (next === requestedCategory.current && !requestedDetail.current) return;
    requestedCategory.current = next;
    requestedDetail.current = null;
    restore.current.entry = null;
    animateChange(() => {
      setOpenId(null);
      setDetail(null);
      setCategory(next);
    }, 'category');
  };

  useEffect(() => {
    if (reducedMotion) transitionRef.current?.skipTransition();
    return () => transitionRef.current?.skipTransition();
  }, [reducedMotion]);

  // HIG: "Update the window's title to reflect the currently visible pane." The pane name belongs to
  // the title bar, so it is not repeated as a heading in the content area.
  useEffect(() => {
    document.title = t(detail ? detailLabels[detail.page] : active.labelKey);
  }, [active.labelKey, detail, t]);

  const openDetail = (next: SettingsDetail) => {
    requestedDetail.current = next;
    restore.current = {
      scroll: document.querySelector('#settings-container')?.scrollTop ?? 0,
      entry: detailEntryId(next),
    };
    animateChange(() => {
      setOpenId(null);
      setDetail(next);
    }, 'forward');
  };
  const closeDetail = () => {
    requestedDetail.current = null;
    animateChange(() => {
      setOpenId(null);
      setDetail(null);
    }, 'back');
  };
  useLayoutEffect(() => {
    if (detail || !restore.current.entry) return;
    const scroll = document.querySelector('#settings-container');
    if (scroll) scroll.scrollTop = restore.current.scroll;
    document
      .querySelector<HTMLElement>(`[data-settings-entry="${CSS.escape(restore.current.entry)}"]`)
      ?.focus({ preventScroll: true });
    restore.current.entry = null;
  }, [detail]);

  return (
    <div className={styles.app} data-settings data-glass-host>
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
        {detail && (
          <header className={styles.detailHeader}>
            <GlassBackButton label={t('backToSettings')} onClick={closeDetail} />
            <h1>{t(detailLabels[detail.page])}</h1>
          </header>
        )}
        <main className={styles.main}>
          <SettingsTab
            {...controller}
            category={category}
            detail={detail}
            onOpenDetail={openDetail}
            onBack={closeDetail}
          />
        </main>
      </div>
      <div ref={setContainer} className={styles.overlay} />
    </div>
  );
}
