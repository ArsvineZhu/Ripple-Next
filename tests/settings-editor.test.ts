// @vitest-environment happy-dom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { SettingsEditor, type SettingsFormProps } from '../src/renderer/features/SettingsEditor';
import type { SettingsDetail } from '../src/renderer/lib/settingsDetails';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../src/renderer/components/InlineNotices', () => ({ InlineNotices: () => null }));
vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: unknown }) => children,
  motion: {
    div: ({ children, className }: { children: unknown; className?: string }) =>
      createElement('div', { className }, children as never),
    label: ({ children, className }: { children: unknown; className?: string }) =>
      createElement('label', { className }, children as never),
  },
}));
let host: HTMLDivElement, root: ReturnType<typeof createRoot>;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});
async function mount(page: SettingsDetail, settings: Partial<SettingsFormProps>) {
  const back = vi.fn();
  await act(async () =>
    root.render(
      createElement(SettingsEditor, {
        detail: page,
        settings: settings as SettingsFormProps,
        onBack: back,
      }),
    ),
  );
  return back;
}
async function fill(input: HTMLInputElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function submit() {
  await act(async () =>
    host
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
  );
}

it('edits manual city, region and country as three fields and saves one compatible location', async () => {
  const setLocation = vi.fn();
  const back = await mount(
    { page: 'weatherLocation' },
    { weatherLocation: 'Tokyo, Tokyo, Japan', setWeatherLocation: setLocation },
  );
  const fields = [...host.querySelectorAll<HTMLInputElement>('input:not([type=checkbox])')];
  expect(fields.map((field) => field.value)).toEqual(['Tokyo', 'Tokyo', 'Japan']);
  await fill(fields[0], 'London');
  await fill(fields[1], 'England');
  await fill(fields[2], 'United Kingdom');
  await submit();
  expect(setLocation).toHaveBeenCalledWith('London, England, United Kingdom');
  expect(back).toHaveBeenCalledOnce();
});
it('uses the existing provider IP query for auto mode and hides manual fields', async () => {
  const setLocation = vi.fn();
  await mount(
    { page: 'weatherLocation' },
    { weatherLocation: 'Tokyo', setWeatherLocation: setLocation },
  );
  await act(async () => host.querySelector<HTMLInputElement>('[role=switch]')!.click());
  expect(host.querySelectorAll('input:not([type=checkbox])')).toHaveLength(0);
  await submit();
  expect(setLocation).toHaveBeenCalledWith('auto:ip');
});
it('keeps invalid search-template drafts out of saved state', async () => {
  const save = vi.fn();
  const back = await mount(
    { page: 'searchTemplate' },
    { searchUrlTemplate: 'https://example.com/?q={query}', setSearchUrlTemplate: save },
  );
  const input = host.querySelector('input')!;
  await fill(input, 'https://example.com/');
  await submit();
  expect(save).not.toHaveBeenCalled();
  expect(back).not.toHaveBeenCalled();
  expect(input.getAttribute('aria-invalid')).toBe('true');
  await fill(input, 'https://example.com/search?q={query}');
  await submit();
  expect(save).toHaveBeenCalledWith('https://example.com/search?q={query}');
  expect(back).toHaveBeenCalledOnce();
});
