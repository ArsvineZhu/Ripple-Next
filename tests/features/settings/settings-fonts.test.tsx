// @vitest-environment happy-dom
import { act, useLayoutEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SettingsFonts } from '../../../src/renderer/features/SettingsFonts';
import { defaultAppState } from '../../../src/shared/appState';
import type { FontChoice } from '../../../src/shared/fonts';
import type { SettingsValues } from '../../../src/renderer/components/SettingsProvider';
import type { ElectronAPI } from '../../../src/shared/contracts';
const t = (key: string, options?: Record<string, unknown>) =>
  options?.font ? `${key}:${options.font}` : key;
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t }) }));
vi.mock('../../../src/renderer/components/InlineNotices', () => ({ InlineNotices: () => null }));
vi.mock('../../../src/renderer/components/SearchableSelect', () => ({
  SearchableSelect: ({
    options,
    label,
    onValueChange,
  }: {
    options: { value: string; label: string }[];
    label: string;
    onValueChange(value: string): void;
  }) => (
    <select aria-label={label} value="" onChange={(event) => onValueChange(event.target.value)}>
      <option value="" />
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));
let host: HTMLDivElement, root: ReturnType<typeof createRoot>, chosen: FontChoice[];
const imported: FontChoice = {
  kind: 'file',
  family: 'File Family',
  faces: [{ id: 'c'.repeat(64), weight: [400, 400], style: 'normal' }],
};
function Harness() {
  const [uiFont, setFont] = useState(defaultAppState.settings.uiFont);
  useLayoutEffect(() => {
    chosen = uiFont;
  }, [uiFont]);
  const settings = {
    settings: { ...defaultAppState.settings, uiFont },
    updateSettings: async (patch: { uiFont: FontChoice[] }) => {
      setFont(patch.uiFont);
      return true;
    },
  } as SettingsValues;
  return <SettingsFonts settings={settings} />;
}
beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  window.electronAPI = {
    listSystemFonts: vi.fn(async () => ['Latin Family', 'Fallback Family']),
    chooseFontFiles: vi.fn(async () => ({ fonts: [imported], errors: [] })),
  } as unknown as ElectronAPI;
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root.render(<Harness />));
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(window, 'electronAPI');
});
const click = async (label: string) =>
  act(async () => {
    host.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!.click();
  });
async function add(family: string) {
  const select = host.querySelector('select')!;
  await act(async () => {
    select.value = `system:${family}`;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
it('adds and reorders generic system/file sources while preserving preview text, and restores the default', async () => {
  await add('Latin Family');
  await click('fontMoveUp:Latin Family');
  await add('Fallback Family');
  await click('fontRemove:fontDefault');
  expect(chosen).toEqual([
    { kind: 'system', family: 'Latin Family' },
    { kind: 'system', family: 'Fallback Family' },
  ]);
  const preview = host.querySelector('textarea')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(
      preview,
      'Latin and 字形',
    );
    preview.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await click('fontMoveUp:Fallback Family');
  expect(host.querySelector('textarea')).toBe(preview);
  expect(preview.value).toBe('Latin and 字形');
  await act(async () =>
    [...host.querySelectorAll('button')]
      .find((button) => button.textContent?.includes('fontChooseFiles'))!
      .click(),
  );
  expect(chosen[2]).toEqual(imported);
  await act(async () =>
    [...host.querySelectorAll('button')]
      .find((button) => button.textContent?.includes('fontReset'))!
      .click(),
  );
  expect(chosen).toEqual(defaultAppState.settings.uiFont);
  expect(
    host.querySelector<HTMLButtonElement>('button[aria-label="fontRemove:fontDefault"]')!.disabled,
  ).toBe(true);
});
