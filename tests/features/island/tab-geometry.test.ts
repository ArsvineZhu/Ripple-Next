import { describe, expect, it } from 'vitest';
import { defaultPageLayoutContext } from '../../../src/renderer/lib/tabGeometry';
import { TABS, islandPages } from '../../../src/renderer/lib/tabs';

describe('registered page geometry', () => {
  it('uses compact empty workflows while preserving the original Tasks layout', () => {
    expect(
      islandPages.size('workflows', { ...defaultPageLayoutContext, workflowCount: 0 }),
    ).toEqual(islandPages.size('search', defaultPageLayoutContext));
    expect(islandPages.size('tasks', { ...defaultPageLayoutContext, taskCount: 0 })).toEqual({
      width: 380,
      height: 250,
    });
    expect(islandPages.size('tasks', defaultPageLayoutContext)).toEqual({
      width: 380,
      height: 250,
    });
    expect(islandPages.size('workflows', defaultPageLayoutContext)).toEqual({
      width: 480,
      height: 210,
    });
  });
  it('offers only the seven Island feature pages', () => {
    expect(TABS.map((tab) => tab.id)).toEqual([
      'search',
      'workflows',
      'overview',
      'playing',
      'assistant',
      'clipboard',
      'tasks',
    ]);
    expect(TABS.some((tab) => String(tab.nameKey) === 'tabSettings')).toBe(false);
  });
});
