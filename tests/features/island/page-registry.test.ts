import { expect, it } from 'vitest';
import { createIslandPageRegistry } from '../../../src/renderer/lib/tabs';
import { defaultPageLayoutContext } from '../../../src/renderer/lib/tabGeometry';
import type { IslandPageDefinition } from '../../../src/renderer/lib/tabs';
import { isAppState, defaultAppState } from '../../../src/shared/appState';

const customPage: IslandPageDefinition = {
  id: 'custom-dashboard',
  title: 'My dashboard',
  icon: () => null,
  render: () => 'Custom content',
  layout: ({ viewportHeight }) => ({ width: 520, height: viewportHeight / 2 }),
  available: ({ workflowCount }) => workflowCount > 0,
  radius: 24,
};

it('extends page rendering, order, availability and measured layout through one registration', () => {
  const registry = createIslandPageRegistry([customPage]);
  const context = { ...defaultPageLayoutContext, viewportHeight: 800 };
  expect(registry.orderedIds(['custom-dashboard', 'overview'])[0]).toBe(customPage.id);
  expect(registry.visible(['overview'], [], context)).toContain(customPage.id);
  expect(registry.visible([], [], { ...context, workflowCount: 0 })).not.toContain(customPage.id);
  expect(registry.size(customPage.id, context)).toEqual({ width: 520, height: 400 });
  expect(registry.size(customPage.id, { ...context, viewportHeight: 600 })).toEqual({
    width: 520,
    height: 300,
  });
  expect(registry.radius(customPage.id)).toBe(24);
  expect(registry.get(customPage.id)?.render).toBe(customPage.render);
});

it('preserves future page identifiers without imposing built-in ordinal or page-count constraints', () => {
  expect(
    isAppState({
      ...defaultAppState,
      settings: {
        ...defaultAppState.settings,
        tabOrder: [...defaultAppState.settings.tabOrder, customPage.id],
        defaultTabId: customPage.id,
        hiddenTabs: [customPage.id],
      },
    }),
  ).toBe(true);
});

it('rejects duplicate identities and invalid custom layout results', () => {
  expect(() => createIslandPageRegistry([{ ...customPage, id: 'overview' }])).toThrow('Duplicate');
  const registry = createIslandPageRegistry([{ ...customPage, layout: { width: 0, height: 100 } }]);
  expect(() => registry.size(customPage.id, defaultPageLayoutContext)).toThrow('Invalid page size');
});
