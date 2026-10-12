import { describe, expect, it } from 'vitest';
import { defaultPageLayoutContext, expandedTabSize } from '../src/renderer/lib/tabGeometry';
import { TABS } from '../src/renderer/lib/tabs';

describe('expandedTabSize', () => {
  it('uses compact empty workflows while preserving the original Tasks layout', () => {
    expect(expandedTabSize('workflows', { ...defaultPageLayoutContext, workflowCount: 0 })).toEqual(
      expandedTabSize('search'),
    );
    expect(expandedTabSize('tasks', { ...defaultPageLayoutContext, taskCount: 0 })).toEqual({
      width: 380,
      height: 250,
    });
    expect(expandedTabSize('tasks')).toEqual({ width: 380, height: 250 });
    expect(expandedTabSize('workflows')).toEqual({ width: 480, height: 210 });
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
