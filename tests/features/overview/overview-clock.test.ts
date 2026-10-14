// @vitest-environment happy-dom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { useOverview } from '../../../src/renderer/hooks/useOverview';
import { defaultAppState } from '../../../src/shared/appState';
vi.mock('../../../src/renderer/components/AppStateProvider', () => ({
  useAppState: () => ({ state: defaultAppState }),
}));
vi.mock('../../../src/renderer/hooks/useWeather', () => ({
  useWeather: () => ({ snapshot: null }),
}));

const format = vi.hoisted(() =>
  vi.fn((_language, _hourFormat, date: Date) => String(date.getUTCMinutes())),
);
vi.mock('../../../src/renderer/lib/date', () => ({
  formatTime: format,
  formatOverviewDate: () => 'date',
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ i18n: { language: 'en' } }) }));
vi.mock('../../../src/renderer/lib/diagnostics', () => ({ recordRendererError: vi.fn() }));

it('updates the displayed minute at the boundary and refreshes immediately after resuming', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-08T10:23:30Z'));
  format.mockClear();
  const host = document.createElement('div');
  const root = createRoot(host);
  function Clock() {
    const { time } = useOverview();
    return createElement('span', null, time);
  }
  try {
    await act(async () => root.render(createElement(Clock)));
    await act(async () => vi.advanceTimersByTimeAsync(29_000));
    expect(format).toHaveBeenCalledTimes(1);
    expect(host.textContent).toBe('23');
    await act(async () => vi.advanceTimersByTimeAsync(1000));
    expect(format).toHaveBeenCalledTimes(2);
    expect(host.textContent).toBe('24');
    vi.setSystemTime(new Date('2026-10-08T10:30:20Z'));
    await act(async () => window.dispatchEvent(new Event('focus')));
    expect(host.textContent).toBe('30');
    expect(vi.getTimerCount()).toBe(1);
  } finally {
    await act(async () => root.unmount());
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
    vi.unstubAllGlobals();
  }
});
