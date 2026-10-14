import { describe, expect, it } from 'vitest';
import { islandPages } from '../../../src/renderer/lib/tabs';
import { defaultPageLayoutContext } from '../../../src/renderer/lib/tabGeometry';
import { nextTabId } from '../../../src/renderer/lib/navigation';
import { modeReducer, resolveMode } from '../../../src/renderer/lib/modes';

describe('Island navigation and modes', () => {
  it('keeps registered identities, configured order, hidden pages and media availability', () => {
    const visible = islandPages.visible(
      ['settings', 'playing', 'search', 'tasks', 'workflows', 'overview', 'assistant', 'clipboard'],
      ['workflows', 'assistant'],
      defaultPageLayoutContext,
    );
    expect(visible).toEqual(['search', 'tasks', 'overview', 'clipboard']);
    expect(nextTabId(visible, 'clipboard', 1)).toBe('search');
    expect(nextTabId(visible, 'search', -1)).toBe('clipboard');
    expect(nextTabId([], 'overview', 1)).toBe('overview');
  });
  it('keeps Overview reachable when every available page is hidden', () => {
    const hidden = islandPages.definitions.map((page) => page.id);
    expect(islandPages.visible(hidden, hidden, defaultPageLayoutContext)).toEqual(['overview']);
  });
  it('preserves standby precedence and explicit expansion', () => {
    expect(resolveMode('still', true, true)).toBe('quick');
    expect(resolveMode('still', false, true)).toBe('large');
    expect(resolveMode('large', true, false)).toBe('large');
    expect(modeReducer('quick', (mode) => (mode === 'large' ? 'quick' : 'large'))).toBe('large');
  });
});
