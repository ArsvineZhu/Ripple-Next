// @vitest-environment happy-dom
import { act, createElement, useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

vi.mock('../src/renderer/i18n', () => ({ changeLanguagePreference: vi.fn() }));
import { AppStateProvider } from '../src/renderer/components/AppStateProvider';
import { useSettings } from '../src/renderer/hooks/useSettings';
import { defaultAppState } from '../src/shared/appState';
import type { AppState, AppStatePatch } from '../src/shared/appState';
import type { ElectronAPI } from '../src/shared/contracts';
import { freeIslandPosition } from '../src/renderer/lib/islandPosition';

const notify = vi.fn();
vi.mock('../src/renderer/components/NotificationProvider', () => ({
  useNotifications: () => ({ notify }),
}));
const views = new Map<string, ReturnType<typeof useSettings>>();
const listeners = new Set<(state: AppState) => void>();
let root: ReturnType<typeof createRoot>;
let host: HTMLDivElement;
let requests: {
  patch: AppStatePatch;
  resolve(state: AppState): void;
  reject(error: Error): void;
}[];

function Harness({ name }: { name: string }) {
  const settings = useSettings(false);
  useLayoutEffect(() => {
    views.set(name, settings);
  });
  return createElement(
    'output',
    { 'data-window': name },
    `${settings.settings.islandX},${settings.settings.islandY}`,
  );
}

beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  requests = [];
  listeners.clear();
  views.clear();
  notify.mockClear();
  window.electronAPI = {
    updateAppState: (patch: AppStatePatch) =>
      new Promise<AppState>((resolve, reject) => {
        requests.push({ patch, resolve, reject });
      }),
    onAppStateChanged: (callback: (state: AppState) => void) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
  } as unknown as ElectronAPI;
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(async () =>
    root.render(
      createElement(
        'div',
        {},
        ...['settings', 'island'].map((name) =>
          createElement(
            AppStateProvider,
            { key: name, initialState: structuredClone(defaultAppState) },
            createElement(Harness, { name }),
          ),
        ),
      ),
    ),
  );
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

async function acknowledge(index: number, values: { islandX?: number; islandY?: number }) {
  const state = { ...defaultAppState, settings: { ...defaultAppState.settings, ...values } };
  await act(async () => {
    for (const listener of listeners) listener(state);
    requests[index].resolve(state);
  });
}

it('updates position without pointer release and reflects saved changes in the other window', async () => {
  await act(async () => {
    void views.get('settings')!.updateSettings({ islandX: 62.5 });
  });
  expect(views.get('settings')!.settings.islandX).toBe(62.5);
  expect(requests[0].patch.settings?.islandX).toBe(62.5);
  await acknowledge(0, { islandX: 62.5 });
  expect(views.get('island')!.settings.islandX).toBe(62.5);
  await act(async () => {
    void views.get('settings')!.updateSettings({ islandY: 0 });
  });
  await acknowledge(1, { islandX: 62.5, islandY: 0 });
  expect(views.get('island')!.settings.islandY).toBe(0);
});

it('keeps the latest rapid edits over an old acknowledgement and merges pending axes', async () => {
  await act(async () => {
    void views.get('settings')!.updateSettings({ islandX: 60 });
  });
  await act(async () => {
    views.get('settings')!.updateSettings({ islandX: 70 });
    views.get('settings')!.updateSettings({ islandX: 80 });
    views.get('settings')!.updateSettings({ islandY: 123 });
  });
  expect(requests).toHaveLength(1);
  await acknowledge(0, { islandX: 60 });
  expect(views.get('settings')!.settings.islandX).toBe(80);
  expect(views.get('settings')!.settings.islandY).toBe(123);
  expect(requests[1].patch.settings).toEqual({ islandX: 80, islandY: 123 });
  await acknowledge(1, { islandX: 80, islandY: 123 });
  expect(views.get('island')!.settings.islandX).toBe(80);
});

it('reports a failed save and applies authoritative position again', async () => {
  await act(async () => {
    void views.get('settings')!.updateSettings({ islandX: 75 });
  });
  await act(async () => requests[0].reject(new Error('Storage failed')));
  expect(notify).toHaveBeenCalledWith(expect.objectContaining({ code: 'stateSaveFailed' }));
  expect(views.get('settings')!.settings.islandX).toBe(defaultAppState.settings.islandX);
});

it('awaits one autostart preference commit, ignores overlapping toggles and restores the flag on failure', async () => {
  const settings = views.get('settings')!;
  await act(async () => {
    void settings.setAutoLaunch(true);
    void settings.setAutoLaunch(false);
  });
  expect(requests).toHaveLength(1);
  expect(requests[0].patch.settings).toEqual({ autoLaunch: true });
  expect(views.get('settings')!.autoLaunchPending).toBe(true);
  await act(async () => requests[0].reject(new Error('Startup unavailable')));
  expect(views.get('settings')!.autoLaunchPending).toBe(false);
  expect(views.get('settings')!.settings.autoLaunch).toBe(false);
});
it('maps horizontal endpoints to visible edges and preserves vertical zero', () => {
  const size = { width: 380, height: 250 };
  const viewport = { width: 1920, height: 1080 };
  expect(freeIslandPosition(0, 0, size, viewport)).toMatchObject({ left: 190, top: 0 });
  expect(freeIslandPosition(50, 20, size, viewport)).toMatchObject({ left: 960, top: 20 });
  expect(freeIslandPosition(100, 2000, size, viewport)).toMatchObject({ left: 1730, top: 830 });
});
