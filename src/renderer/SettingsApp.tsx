import { recordSettingsContext } from './lib/diagnostics';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { LayoutGroup, motion } from 'motion/react';
import { PanelLeft } from 'lucide-react';
import { productName, version } from '../../package.json';
import { useTranslation } from 'react-i18next';
import { SettingsTab } from './features/SettingsTab';
import { useSettingsContext } from './components/SettingsProvider';
import { useOverlay } from './components/OverlayProvider';
import { SETTINGS_CATEGORIES, type SettingsCategoryId } from './lib/settingsCategories';
import styles from './styles/SettingsApp.module.css';
import { useReducedMotionPreference } from './hooks/useReducedMotionPreference';
import { GlassBackButton } from './components/GlassBackButton';
import { detailLabels, detailEntryId, type SettingsDetail } from './lib/settingsDetails';
import { GlassPreferencesContext } from './components/liquidGlass/GlassPreferences';

export default function SettingsApp() {
  const { t } = useTranslation();
  const { settings: glass, updateSettings } = useSettingsContext();
  const { setContainer, setOpenId } = useOverlay();
  const [category, setCategory] = useState<SettingsCategoryId>('guide');
  const [detail, setDetail] = useState<SettingsDetail | null>(null);
  useEffect(() => recordSettingsContext(category, detail?.page ?? null), [category, detail?.page]);
  const history = useRef<{ detail: SettingsDetail | null; scroll: number; entry: string }[]>([]);
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
    history.current = [];
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
    if (requestedDetail.current && detailEntryId(requestedDetail.current) === detailEntryId(next))
      return;
    const previous = {
      detail,
      scroll:
        document.querySelector(detail ? '#settings-detail-container' : '#settings-container')
          ?.scrollTop ?? 0,
      entry: detailEntryId(next),
    };
    requestedDetail.current = next;
    restore.current = { scroll: 0, entry: null };
    animateChange(() => {
      history.current.push(previous);
      setOpenId(null);
      setDetail(next);
    }, 'forward');
  };
  const closeDetail = () => {
    const previous = history.current.at(-1);
    requestedDetail.current = previous?.detail ?? null;
    restore.current = { scroll: previous?.scroll ?? 0, entry: previous?.entry ?? null };
    animateChange(() => {
      history.current.pop();
      setOpenId(null);
      setDetail(previous?.detail ?? null);
    }, 'back');
  };
  useLayoutEffect(() => {
    if (!restore.current.entry) return;
    const scroll = document.querySelector(
      detail ? '#settings-detail-container' : '#settings-container',
    );
    if (scroll) scroll.scrollTop = restore.current.scroll;
    document
      .querySelector<HTMLElement>(`[data-settings-entry="${CSS.escape(restore.current.entry)}"]`)
      ?.focus({ preventScroll: true });
    restore.current.entry = null;
  }, [detail]);

  return (
    <GlassPreferencesContext.Provider value={glass}>
      <div
        className={styles.app}
        data-settings
        data-platform={window.electronAPI?.platform}
        data-sidebar-expanded={glass.settingsSidebarExpanded || undefined}
        data-sidebar-translucent={glass.settingsSidebarTranslucent || undefined}
        data-glass-host
        data-glass-enabled={glass.settingsGlassEnabled}
      >
        <aside className={styles.sidebar} aria-label={t('tabSettings')}>
          <LayoutGroup id="settings-navigation">
            <div className={styles.rail}>
              <button
                type="button"
                className={styles.sidebarToggle}
                aria-label={t('toggleSettingsSidebar')}
                aria-expanded={!!glass.settingsSidebarExpanded}
                aria-controls="settings-sidebar-panel"
                onClick={() =>
                  updateSettings({ settingsSidebarExpanded: !glass.settingsSidebarExpanded })
                }
              >
                <PanelLeft size={20} aria-hidden="true" />
              </button>
              <nav className={styles.nav}>
                {SETTINGS_CATEGORIES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`${styles.navItem} ${item.id === category ? styles.navItemActive : ''}`}
                    aria-label={t(item.labelKey)}
                    title={t(item.labelKey)}
                    aria-current={item.id === category ? 'page' : undefined}
                    data-settings-category={item.id}
                    onClick={() => selectCategory(item.id)}
                  >
                    {item.id === category && (
                      <motion.span
                        className={styles.navIndicator}
                        layoutId="settings-rail-selection"
                        initial={false}
                        transition={
                          reducedMotion
                            ? { duration: 0 }
                            : { type: 'spring', stiffness: 440, damping: 38 }
                        }
                        aria-hidden="true"
                      />
                    )}
                    <item.icon size={21} aria-hidden="true" />
                  </button>
                ))}
              </nav>
            </div>
            <div
              id="settings-sidebar-panel"
              className={styles.sidebarPanel}
              aria-hidden={!glass.settingsSidebarExpanded}
              inert={!glass.settingsSidebarExpanded}
            >
              <div className={styles.sidebarPanelContent}>
                <div className={styles.brand}>
                  <strong>{productName}</strong>
                  <span>{version}</span>
                </div>
                <nav className={styles.nav} aria-label={t('settingsSidebarCategories')}>
                  {SETTINGS_CATEGORIES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`${styles.categoryItem} ${item.id === category ? styles.navItemActive : ''}`}
                      aria-current={item.id === category ? 'page' : undefined}
                      onClick={() => selectCategory(item.id)}
                    >
                      {item.id === category && (
                        <motion.span
                          className={styles.navIndicator}
                          layoutId="settings-panel-selection"
                          initial={false}
                          transition={
                            reducedMotion
                              ? { duration: 0 }
                              : { type: 'spring', stiffness: 440, damping: 38 }
                          }
                          aria-hidden="true"
                        />
                      )}
                      {t(item.labelKey)}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </LayoutGroup>
        </aside>
        <div className={styles.pane}>
          <header className={styles.detailHeader}>
            {detail && <GlassBackButton label={t('backToSettings')} onClick={closeDetail} />}
            <h1>{t(detail ? detailLabels[detail.page] : active.labelKey)}</h1>
          </header>
          <main className={styles.main}>
            <SettingsTab
              category={category}
              detail={detail}
              onOpenDetail={openDetail}
              onBack={closeDetail}
              onNavigateCategory={selectCategory}
            />
          </main>
        </div>
        <div ref={setContainer} className={styles.overlay} />
      </div>
    </GlassPreferencesContext.Provider>
  );
}
