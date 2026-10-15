// @vitest-environment happy-dom
import { act, createElement, useEffect, useReducer } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { useBatteryAlerts } from '../../../src/renderer/hooks/useBatteryAlerts';
import { useDeviceAlerts } from '../../../src/renderer/hooks/useDeviceAlerts';
import { modeReducer } from '../../../src/renderer/lib/modes';
import type { IslandMode } from '../../../src/shared/contracts';

vi.mock('../../../src/renderer/lib/diagnostics', () => ({ recordRendererError: vi.fn() }));

it('keeps a page expanded when the charging notification expires', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.useFakeTimers();
  const host = document.createElement('div');
  const root = createRoot(host);
  let expand!: () => void;
  function Harness() {
    const [mode, setMode] = useReducer(modeReducer, 'still' as IslandMode);
    useEffect(() => {
      expand = () => setMode('large');
    }, [setMode]);
    useBatteryAlerts({ percent: 80, charging: true, enabled: true, setMode });
    return createElement('span', null, mode);
  }
  try {
    await act(async () => root.render(createElement(Harness)));
    expect(host.textContent).toBe('quick');
    await act(async () => expand());
    await act(async () => vi.advanceTimersByTimeAsync(1500));
    expect(host.textContent).toBe('large');
  } finally {
    await act(async () => root.unmount());
    vi.useRealTimers();
    vi.unstubAllGlobals();
  }
});

it('keeps capture notifications inside the expanded mode and clears their timer on unmount', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.useFakeTimers();
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: {
      getCameraStatus: vi.fn(async () => true),
      getMicrophoneStatus: vi.fn(async () => true),
      getBluetoothStatus: vi.fn(async () => false),
    },
  });
  const host = document.createElement('div');
  const root = createRoot(host);
  function Harness() {
    const [mode, setMode] = useReducer(modeReducer, 'large' as IslandMode);
    const alerts = useDeviceAlerts(setMode);
    return createElement('span', null, `${mode}:${alerts.cameraAlert || alerts.microphoneAlert}`);
  }
  try {
    await act(async () => root.render(createElement(Harness)));
    expect(host.textContent).toBe('large:true');
    await act(async () => vi.advanceTimersByTimeAsync(3000));
    expect(host.textContent).toBe('large:true');
  } finally {
    await act(async () => root.unmount());
    expect(vi.getTimerCount()).toBe(0);
    Reflect.deleteProperty(window, 'electronAPI');
    vi.useRealTimers();
    vi.unstubAllGlobals();
  }
});

it('rereads device events received during a request and does not sample healthy native listeners', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.useFakeTimers();
  let notify!: () => void, finish!: (value: boolean) => void;
  const stop = vi.fn();
  const camera = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise<boolean>((resolve) => {
          finish = resolve;
        }),
    )
    .mockResolvedValue(true);
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: {
      systemEventCapabilities: { devices: true },
      getBluetoothStatus: vi.fn(async () => false),
      getCameraStatus: camera,
      getMicrophoneStatus: vi.fn(async () => false),
      onDevicesChanged: (listener: () => void) => {
        notify = listener;
        return stop;
      },
    },
  });
  const host = document.createElement('div');
  const root = createRoot(host);
  function Harness() {
    const [, setMode] = useReducer(modeReducer, 'still' as IslandMode);
    const alerts = useDeviceAlerts(setMode);
    return createElement('span', null, String(alerts.cameraInUse));
  }
  try {
    await act(async () => root.render(createElement(Harness)));
    await act(async () => {
      notify();
      finish(false);
    });
    expect(camera).toHaveBeenCalledTimes(2);
    expect(host.textContent).toBe('true');
    await act(async () => vi.advanceTimersByTimeAsync(90_000));
    expect(camera).toHaveBeenCalledTimes(2);
  } finally {
    await act(async () => root.unmount());
    expect(stop).toHaveBeenCalledOnce();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  }
});
