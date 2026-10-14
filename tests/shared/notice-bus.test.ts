import { beforeEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({
  showMainWindow: vi.fn(),
  island: { id: 1, isDestroyed: () => false, send: vi.fn(), once: vi.fn() },
  settings: { id: 2, isDestroyed: () => false, send: vi.fn(), once: vi.fn() },
}));
vi.mock('../../src/main/window', () => ({
  showMainWindow: mock.showMainWindow,
  getMainWindow: () => null,
}));
vi.mock('electron', () => ({
  app: { setActivationPolicy: vi.fn(), focus: vi.fn() },
  nativeTheme: { shouldUseDarkColors: false, on: vi.fn(), off: vi.fn() },
  BrowserWindow: class {},
}));
import { createNoticeBus } from '../../src/main/services/noticeBus';
import {
  attachSettingsWindow,
  clearSettingsWindow,
  getSettingsWindow,
} from '../../src/main/settingsWindow';
import { clearWindowRoles, registerWindowRole } from '../../src/main/windowRoles';
import type { BrowserWindow, WebContents } from 'electron';

describe('notice bus window routing', () => {
  beforeEach(() => {
    mock.showMainWindow.mockClear();
    mock.island.send.mockClear();
    mock.settings.send.mockClear();
    clearWindowRoles();
    clearSettingsWindow();
    registerWindowRole(mock.island as unknown as WebContents, 'island');
    attachSettingsWindow({
      webContents: mock.settings,
      on: vi.fn(),
    } as unknown as BrowserWindow);
  });
  it('queues per window until that role is ready and never shows the island for settings', () => {
    expect(getSettingsWindow()?.webContents).toBe(mock.settings);
    const bus = createNoticeBus();
    bus.report('stateSaveFailed', 'save failed');
    bus.report('windowLoadFailed', 'load failed');
    expect(mock.island.send).not.toHaveBeenCalled();
    expect(mock.settings.send).not.toHaveBeenCalled();
    bus.rendererReady('settings');
    expect(mock.showMainWindow).not.toHaveBeenCalled();
    expect(mock.settings.send).toHaveBeenCalledOnce();
    expect(mock.settings.send.mock.calls[0][0]).toBe('app-notice');
    expect(mock.settings.send.mock.calls[0][1]).toMatchObject({
      code: 'stateSaveFailed',
      area: 'settings',
    });
    expect(mock.island.send).not.toHaveBeenCalled();
    bus.rendererReady('island');
    expect(mock.showMainWindow).toHaveBeenCalledOnce();
    expect(mock.island.send).toHaveBeenCalledOnce();
    expect(mock.island.send.mock.calls[0][1]).toMatchObject({
      code: 'windowLoadFailed',
      area: 'system',
    });
  });
  it('delivers later notices to the window that owns the area', () => {
    const bus = createNoticeBus();
    bus.rendererReady('island');
    bus.rendererReady('settings');
    bus.report('secretStorageUnavailable', 'no keychain');
    bus.report('inputShapeFailed', 'shape');
    expect(mock.settings.send.mock.calls.at(-1)?.[1]).toMatchObject({
      area: 'settings',
      code: 'secretStorageUnavailable',
    });
    expect(mock.island.send.mock.calls.at(-1)?.[1]).toMatchObject({
      area: 'system',
      code: 'inputShapeFailed',
    });
  });
});
