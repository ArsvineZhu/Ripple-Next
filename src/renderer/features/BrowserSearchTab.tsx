import styles from './BrowserSearchTab.module.css';
import { useTranslation } from 'react-i18next';
import { AnimatePresence } from 'motion/react';
import { InlineNotices } from '../components/InlineNotices';
import { useBrowserSearch } from '../hooks/useBrowserSearch';
import { TextEntry, Feedback } from '../components/content';
export function BrowserSearchTab() {
  const { browserSearch, setBrowserSearch, searchBrowser, searchError, setSearchError } =
    useBrowserSearch();
  const { t } = useTranslation();
  return (
    <div className={styles.container}>
      <InlineNotices area="browser-search" />
      <TextEntry
        id="browser-searchbar"
        label={t('searchHint')}
        placeholder={t('searchHint')}
        value={browserSearch}
        onValueChange={(value) => {
          setBrowserSearch(value);
          setSearchError(null);
        }}
        onSubmit={searchBrowser}
        large
        centered
        className={styles.searchInput}
      />
      <AnimatePresence initial={false}>
        {searchError && <Feedback className={styles.error}>{t(searchError)}</Feedback>}
      </AnimatePresence>
    </div>
  );
}
