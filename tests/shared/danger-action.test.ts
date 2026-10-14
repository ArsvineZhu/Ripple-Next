// @vitest-environment happy-dom
import { act, createElement } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createReactFixture } from './fixtures/react';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../src/renderer/hooks/useReducedMotionPreference', () => ({
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
import { DangerAction } from '../../src/renderer/components/DangerAction';
it('executes a dangerous action only after confirmation and allows cancellation', async () => {
  const remove = vi.fn().mockResolvedValue(undefined);
  await act(async () =>
    root.render(createElement(DangerAction, { label: 'Remove model #1', onConfirm: remove })),
  );
  await act(async () => host.querySelector<HTMLButtonElement>('button[aria-label]')!.click());
  expect(remove).not.toHaveBeenCalled();
  const dialog = host.querySelector('dialog')!;
  expect(dialog.open).toBe(true);
  await act(async () => dialog.querySelector<HTMLButtonElement>('button')!.click());
  expect(dialog.open).toBe(false);
  expect(remove).not.toHaveBeenCalled();
  await act(async () => host.querySelector<HTMLButtonElement>('button[aria-label]')!.click());
  await act(async () => dialog.querySelectorAll<HTMLButtonElement>('button')[1].click());
  expect(remove).toHaveBeenCalledOnce();
  expect(dialog.open).toBe(false);
});
