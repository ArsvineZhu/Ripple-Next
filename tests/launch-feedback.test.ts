/** @vitest-environment happy-dom */
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { WorkflowsTab } from '../src/renderer/features/WorkflowsTab';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../src/renderer/components/NotificationProvider', () => ({
  useNotifications: () => ({ notices: [], dismiss: vi.fn() }),
}));
vi.mock('../src/renderer/components/ElasticScrollArea', () => ({
  ElasticScrollArea: ({ children }: { children: unknown }) => children,
}));
vi.mock('motion/react', async () => {
  const { createElement } = await import('react');
  return {
    AnimatePresence: ({ children }: { children: unknown }) => children,
    motion: Object.fromEntries(
      ['div', 'p'].map((tag) => [
        tag,
        ({
          initial: _initial,
          animate: _animate,
          exit: _exit,
          ...props
        }: Record<string, unknown>) => createElement(tag, props),
      ]),
    ),
  };
});
afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

it('shows a failed quick launch on its own app item and clears it on retry', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const launch = vi
    .fn()
    .mockRejectedValueOnce(new Error('native failure'))
    .mockResolvedValue({ failures: [] });
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: { launchTargets: launch },
  });
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  await act(async () =>
    root.render(
      createElement(WorkflowsTab, {
        workflows: [{ name: 'Daily', targets: [{ kind: 'url', url: 'https://example.com' }] }],
        bgColor: '#000',
        textColor: '#fff',
        quickApps: [
          { id: 'one', name: 'ChatGPT', target: { kind: 'url', url: 'https://example.com' } },
          { id: 'two', name: 'Firefox', target: { kind: 'url', url: 'https://example.org' } },
        ],
      }),
    ),
  );
  const [first, second] = Array.from(
    container.querySelectorAll<HTMLButtonElement>('#quick-apps button'),
  );
  await act(async () => first.click());
  expect(first.parentElement?.querySelector('[role="alert"]')?.textContent).toContain(
    'appLaunchFailed',
  );
  expect(second.parentElement?.querySelector('[role="alert"]')).toBeNull();
  await act(async () => first.click());
  expect(container.querySelector('[role="alert"]')).toBeNull();
  await act(async () => root.unmount());
  Reflect.deleteProperty(window, 'electronAPI');
});
