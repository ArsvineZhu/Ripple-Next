/** @vitest-environment happy-dom */
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import SettingsApp from '../src/renderer/SettingsApp';
import { defaultGlassPreferences } from '../src/shared/glassPreferences';
import type { ElectronAPI } from '../src/shared/contracts';

const preferences = vi.hoisted(() => ({ reduced: false }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../src/renderer/components/SettingsProvider', () => ({
  useSettingsContext: () => ({ settings: defaultGlassPreferences }),
}));
vi.mock('../src/renderer/hooks/useReducedMotionPreference', () => ({
  useReducedMotionPreference: () => preferences.reduced,
}));
vi.mock('../src/renderer/components/OverlayProvider', () => ({
  useOverlay: () => ({ setContainer: () => {}, setOpenId: () => {} }),
}));
vi.mock('../src/renderer/features/SettingsTab', () => ({
  SettingsTab: ({
    category,
    detail,
    onOpenDetail,
  }: {
    category: string;
    detail?: { page: string };
    onOpenDetail(detail: { page: string }): void;
  }) =>
    createElement(
      'div',
      {},
      createElement('input', { 'data-category': category, defaultValue: '' }),
      createElement(
        'button',
        {
          'data-settings-entry': 'aiEndpoints',
          onClick: () => onOpenDetail({ page: 'aiEndpoints' }),
        },
        detail ? 'detail' : 'edit',
      ),
    ),
}));

let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
let snapshots: { commit: () => void; skipTransition: ReturnType<typeof vi.fn> }[];

beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  preferences.reduced = false;
  snapshots = [];
  window.electronAPI = {
    setIslandPreview: vi.fn().mockResolvedValue(undefined),
    reportDiagnostic: vi.fn(),
  } as unknown as ElectronAPI;
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
  const category = ['guide', 'appearance', 'behavior'][index];
  await act(async () =>
    host
      .querySelector(`[data-settings-category="${category}"]`)!
      .dispatchEvent(new MouseEvent('click', { bubbles: true })),
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
it('opens a detail with a fixed back header and restores its opener focus', async () => {
  await act(async () => host.querySelector<HTMLButtonElement>('[data-settings-entry]')!.click());
  await act(async () => snapshots.at(-1)!.commit());
  const back = host.querySelector<HTMLButtonElement>('button[aria-label="backToSettings"]')!;
  expect(back).not.toBeNull();
  expect(back.closest('header')).not.toBeNull();
  await act(async () => back.click());
  await act(async () => snapshots.at(-1)!.commit());
  expect(host.querySelector('header')).toBeNull();
  expect(document.activeElement).toBe(host.querySelector('[data-settings-entry]'));
});

it('can return to the current category before an editor snapshot commits', async () => {
  await act(async () => host.querySelector<HTMLButtonElement>('[data-settings-entry]')!.click());
  await choose(0);
  expect(snapshots).toHaveLength(2);
  await act(async () => snapshots[1].commit());
  await act(async () => snapshots[0].commit());
  expect(host.querySelector('header')).toBeNull();
  expect(host.querySelector('[data-settings-entry]')?.textContent).toBe('edit');
});

it('retains editor state and the mounted control during category transitions', async () => {
  const input = host.querySelector('input')!;
  input.value = 'unsaved draft';
  await choose(1);
  await act(async () => snapshots[0].commit());
  expect(host.querySelector('input')).toBe(input);
  expect(input.value).toBe('unsaved draft');
});

it('holds preview only in Appearance and releases it when leaving or unmounting', async () => {
  await choose(1);
  await act(async () => snapshots[0].commit());
  expect(window.electronAPI.setIslandPreview).toHaveBeenLastCalledWith(true);
  await choose(2);
  await act(async () => snapshots[1].commit());
  expect(window.electronAPI.setIslandPreview).toHaveBeenLastCalledWith(false);
});

it('keeps Appearance preview active when the window is occluded', async () => {
  await choose(1);
  await act(async () => snapshots[0].commit());
  const calls = vi.mocked(window.electronAPI.setIslandPreview).mock.calls.length;
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
  try {
    await act(async () => document.dispatchEvent(new Event('visibilitychange')));
    expect(window.electronAPI.setIslandPreview).toHaveBeenCalledTimes(calls);
    expect(window.electronAPI.setIslandPreview).toHaveBeenLastCalledWith(true);
  } finally {
    Reflect.deleteProperty(document, 'visibilityState');
  }
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
