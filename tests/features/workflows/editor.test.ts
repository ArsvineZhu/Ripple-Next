// @vitest-environment happy-dom
import { act, createElement } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createReactFixture, fillInput as fill } from '../../shared/fixtures/react';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../../src/renderer/hooks/useReducedMotionPreference', () => ({
  useReducedMotionPreference: () => true,
}));
vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: unknown }) => children,
  motion: {
    div: ({ children, className }: { children: unknown; className: string }) =>
      createElement('div', { className }, children as never),
  },
}));
let mounted: ReturnType<typeof createReactFixture>;
let host: HTMLDivElement, root: ReturnType<typeof createReactFixture>['root'];
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  mounted = createReactFixture();
  ({ host, root } = mounted);
});
afterEach(async () => {
  await mounted.close();
  vi.unstubAllGlobals();
});
import { WorkflowEditor } from '../../../src/renderer/features/WorkflowEditor';
import { defaultAppState } from '../../../src/shared/appState';
const fixture = vi.hoisted(() => ({ state: {} as typeof defaultAppState, updateState: vi.fn() }));
vi.mock('../../../src/renderer/components/AppStateProvider', () => ({
  useAppState: () => fixture,
}));
beforeEach(() => {
  fixture.state = structuredClone(defaultAppState);
  fixture.updateState.mockReset();
});
it('keeps commas inside a workflow target and saves each added row independently', async () => {
  await act(async () => root.render(createElement(WorkflowEditor)));
  await fill(host.querySelector('input')!, 'Reading');
  await fill(host.querySelectorAll('input')[1], 'https://example.test/a,b');
  expect(fixture.updateState).toHaveBeenLastCalledWith({
    workflows: [{ name: 'Reading', targets: [{ kind: 'url', url: 'https://example.test/a,b' }] }],
  });
  fixture.state.workflows = [
    { name: 'Reading', targets: [{ kind: 'url', url: 'https://example.test/a,b' }] },
  ];
  await act(async () =>
    host.querySelector<HTMLButtonElement>('button[class*=addRowButton]')!.click(),
  );
  await fill(host.querySelectorAll('input')[2], 'docs.google.com');
  expect(fixture.updateState).toHaveBeenLastCalledWith({
    workflows: [
      {
        name: 'Reading',
        targets: [
          { kind: 'url', url: 'https://example.test/a,b' },
          { kind: 'url', url: 'https://docs.google.com' },
        ],
      },
    ],
  });
  expect(host.querySelector('button[type=submit]')).toBeNull();
});
