import { useCallback, useState } from 'react';
import type { NoticeCode } from '../../shared/contracts';
import { useAppState } from '../components/AppStateProvider';
import { createSearchUrl, isValidSearchUrlTemplate } from '../lib/search';

export function useBrowserSearch() {
  const { state } = useAppState();
  const [browserSearch, setBrowserSearch] = useState('');
  const [searchError, setSearchError] = useState<NoticeCode | null>(null);
  const searchUrlTemplate = state.settings.searchUrlTemplate;
  const searchBrowser = useCallback(async () => {
    const query = browserSearch.trim();
    if (!query) return;

    const target = createSearchUrl(query, searchUrlTemplate);
    if (!target) {
      setSearchError(
        isValidSearchUrlTemplate(searchUrlTemplate)
          ? 'invalidSearchTarget'
          : 'invalidSearchUrlTemplate',
      );
      return;
    }

    setSearchError(null);
    try {
      await window.electronAPI.openExternal(target);
    } catch {
      setSearchError('searchOpenFailed');
    }
  }, [browserSearch, searchUrlTemplate]);
  return { browserSearch, setBrowserSearch, searchBrowser, searchError, setSearchError };
}
