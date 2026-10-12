/** @vitest-environment happy-dom */
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import SettingsApp from '../src/renderer/SettingsApp';

const preferences = vi.hoisted(() => ({ reduced: false }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../src/renderer/hooks/useSettingsWindowController', () => ({
  useSettingsWindowController: () => ({}),
}));
vi.mock('../src/renderer/hooks/useReducedMotionPreference', () => ({
  useReducedMotionPreference: () => preferences.reduced,
}));
vi.mock('../src/renderer/components/OverlayProvider', () => ({
  useOverlay: () => ({ setContainer: () => {} }),
}));
vi.mock('../src/renderer/features/SettingsTab', () => ({
  SettingsTab: ({ category }: { category: string }) =>
    createElement('input', { 'data-category': category, defaultValue: '' }),
}));

let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
let snapshots: { commit: () => void; skipTransition: ReturnType<typeof vi.fn> }[];

beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  preferences.reduced = false;
  snapshots = [];
  Object.defineProperty(document, 'startViewTransition', {
    configurable: true,
    value: vi.fn((commit: () => void) => {
      const transition = { commit, skipTransition: vi.fn(), ready: Promise.resolve() };
      snapshots.push(transition);
      return transition;
    }),
  });
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root.render(createElement(SettingsApp)));
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  Reflect.deleteProperty(document, 'startViewTransition');
  vi.unstubAllGlobals();
});

async function choose(index: number) {
  await act(async () =>
    host
      .querySelectorAll('nav button')
      [index].dispatchEvent(new MouseEvent('click', { bubbles: true })),
  );
}

it('keeps the latest selection when snapshot callbacks complete out of order', async () => {
  await choose(1);
  await choose(2);
  expect(snapshots[0].skipTransition).toHaveBeenCalledOnce();
  await act(async () => snapshots[1].commit());
  await act(async () => snapshots[0].commit());
  expect(host.querySelector('input')?.dataset.category).toBe('behavior');
  expect(host.querySelector('[aria-current="page"]')?.textContent).toBe('settingsNavBehavior');
});

it('retains editor state and the mounted control during category transitions', async () => {
  const input = host.querySelector('input')!;
  input.value = 'unsaved draft';
  await choose(1);
  await act(async () => snapshots[0].commit());
  expect(host.querySelector('input')).toBe(input);
  expect(input.value).toBe('unsaved draft');
});

it.each(['reduced motion', 'no View Transition API'])(
  'switches immediately with %s',
  async (mode) => {
    if (mode === 'reduced motion') {
      preferences.reduced = true;
      await act(async () => root.render(createElement(SettingsApp)));
    } else {
      Reflect.deleteProperty(document, 'startViewTransition');
    }
    await choose(1);
    expect(host.querySelector('input')?.dataset.category).toBe('appearance');
    expect(snapshots).toHaveLength(0);
  },
);
