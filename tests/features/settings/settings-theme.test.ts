/** @vitest-environment happy-dom */
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { AppStateProvider } from '../../../src/renderer/components/AppStateProvider';
import { SettingsAppearance } from '../../../src/renderer/features/SettingsAppearance';
import { useSettings } from '../../../src/renderer/hooks/useSettings';
import { defaultAppState, isAppStatePatch, type AppStatePatch } from '../../../src/shared/appState';
import type { ElectronAPI } from '../../../src/shared/contracts';

vi.mock('../../../src/renderer/i18n', () => ({ changeLanguagePreference: vi.fn() }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const notify = vi.fn();
vi.mock('../../../src/renderer/components/NotificationProvider', () => ({
  useNotifications: () => ({ notify, notices: [], dismiss: vi.fn() }),
}));
vi.mock('../../../src/renderer/components/SettingsProvider', () => ({
  useSettingsContext: () => useSettings(),
}));
vi.mock('../../../src/renderer/hooks/useBackgroundImage', () => ({
  useBackgroundImage: () => ({ backgroundImageError: null }),
}));
vi.mock('../../../src/renderer/components/NativeColorField', () => ({
  NativeColorField: () => null,
}));
vi.mock('../../../src/renderer/components/PreferenceSlider', () => ({
  PreferenceSlider: () => null,
}));
vi.mock('../../../src/renderer/components/PreferenceSwitch', () => ({
  PreferenceSwitch: () => null,
}));
vi.mock('../../../src/renderer/components/Select', () => ({
  Select: ({
    value,
    options,
    onValueChange,
    label,
  }: {
    value: string;
    options: { value: string; label: string }[];
    onValueChange(value: string): void;
    label: string;
  }) =>
    createElement(
      'select',
      {
        value,
        'aria-label': label,
        onChange: (event: { target: { value: string } }) => onValueChange(event.target.value),
      },
      ...options.map((option) =>
        createElement('option', { key: option.value, value: option.value }, option.label),
      ),
    ),
}));

it('commits every displayed theme with its colors using the formal state contract, including return to Default', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  let stored = structuredClone(defaultAppState);
  const update = vi.fn(async (patch: AppStatePatch) => {
    if (!isAppStatePatch(patch)) throw new TypeError('Invalid app state update');
    stored = { ...stored, ...patch, settings: { ...stored.settings, ...patch.settings } };
    return stored;
  });
  window.electronAPI = {
    updateAppState: update,
    onAppStateChanged: () => () => {},
  } as unknown as ElectronAPI;
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () =>
      root.render(
        createElement(
          AppStateProvider,
          { initialState: stored },
          createElement(SettingsAppearance, { onOpenDetail: vi.fn() }),
        ),
      ),
    );
    for (const [label, theme, backgroundColor, textColor] of [
      ['sleekBlack', 'sleek-black', 'rgba(0, 0, 0, 0.64)', 'rgba(255, 255, 255)'],
      ['Windows 95', 'win95', 'rgba(195, 195, 195)', 'rgba(0, 0, 0)'],
      ['defaultTheme', 'default', '#000000', '#FFFFFF'],
    ]) {
      const select = host.querySelector<HTMLSelectElement>('select[aria-label="theme"]')!;
      const option = Array.from(select.options).find((item) => item.textContent === label)!;
      await act(async () => {
        select.value = option.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      });
      expect(update).toHaveBeenLastCalledWith({ settings: { theme, backgroundColor, textColor } });
      expect(stored.settings.theme).toBe(theme);
      expect(select.value).toBe(theme);
    }
    expect(notify).not.toHaveBeenCalled();
  } finally {
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
    Reflect.deleteProperty(window, 'electronAPI');
  }
});
