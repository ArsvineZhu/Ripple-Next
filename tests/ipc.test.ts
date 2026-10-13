import { beforeEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({
  sender: { id: 99, isDestroyed: () => false, send: vi.fn(), once: vi.fn() },
  island: {
    id: 1,
    isDestroyed: () => false,
    send: vi.fn(),
    once: vi.fn(),
    setBackgroundThrottling: vi.fn(),
  },
  settings: {
    id: 2,
    isDestroyed: () => false,
    send: vi.fn(),
    once: vi.fn(),
    setBackgroundThrottling: vi.fn(),
  },
  handlers: new Map<string, (event: { sender: unknown }, ...args: unknown[]) => unknown>(),
  events: new Map<string, (event: { sender: unknown }, ...args: unknown[]) => unknown>(),
  shape: vi.fn(),
  openDiagnosticsFolder: vi.fn(),
  recordApplicationError: vi.fn(),
  readClipboard: vi.fn(),
  writeClipboard: vi.fn(),
  recordDiagnostic: vi.fn(),
  markRendererReady: vi.fn(),
  showMainWindow: vi.fn(),
  showColorPicker: vi.fn(),
  colorOwner: { isDestroyed: () => false },
  window: {
    webContents: null as unknown,
    focus: vi.fn(),
    setBounds: vi.fn(),
    setIgnoreMouseEvents: vi.fn(),
  },
}));
mock.window.webContents = mock.island;
vi.mock('electron', () => ({
  BrowserWindow: { fromWebContents: () => mock.colorOwner },
  clipboard: { readText: mock.readClipboard, writeText: mock.writeClipboard },
  ipcMain: {
    handle: (
      channel: string,
      callback: (event: { sender: unknown }, ...args: unknown[]) => unknown,
    ) => mock.handlers.set(channel, callback),
    on: (channel: string, callback: (event: { sender: unknown }, ...args: unknown[]) => unknown) =>
      mock.events.set(channel, callback),
  },
  screen: {
    getAllDisplays: () => [],
    getPrimaryDisplay: () => ({
      id: 1,
      bounds: { x: 0, y: 0, width: 1920, height: 1080 },
    }),
  },
  shell: { openExternal: vi.fn() },
  app: { getLocale: () => 'zh-HK' },
}));
vi.mock('../src/main/window', () => ({
  getMainWindow: () => mock.window,
  showMainWindow: mock.showMainWindow,
  markRendererReady: mock.markRendererReady,
  applyWindowInputRegion: mock.shape,
}));
vi.mock('../src/main/services/media', () => ({
  createMediaService: () => ({
    getSnapshot: vi.fn(),
    selectSession: vi.fn(),
    openSession: vi.fn(),
    control: vi.fn(),
    close: vi.fn(),
  }),
}));
vi.mock('../src/main/tray', () => ({ setTrayLocale: vi.fn() }));
vi.mock('../src/main/settingsWindow', () => ({ openSettingsWindow: vi.fn() }));
vi.mock('../src/main/services/colorPicker', () => ({
  showNativeColorPicker: mock.showColorPicker,
}));
import { setTrayLocale } from '../src/main/tray';
import { registerIPC } from '../src/main/ipc';
import { defaultAppState } from '../src/shared/appState';
import { clearWindowRoles, registerWindowRole } from '../src/main/windowRoles';
import type { WebContents } from 'electron';

const services = {
  stateStore: {
    load: async () => defaultAppState,
    update: async () => defaultAppState,
  },
  secretStore: {
    setApiKey: async () => {},
    hasApiKey: async () => false,
  },
  assistant: {
    start: async () => null,
    cancel: () => {},
  },
  notices: {
    report: vi.fn(),
    rendererReady: vi.fn(),
  },
  diagnostics: {
    record: mock.recordDiagnostic,
    openFolder: mock.openDiagnosticsFolder,
    recordError: mock.recordApplicationError,
  },
  applyShowTray: vi.fn(),
};

describe('IPC boundary', () => {
  beforeEach(() => {
    mock.handlers.clear();
    mock.events.clear();
    mock.shape.mockClear();
    mock.island.send.mockClear();
    mock.settings.send.mockClear();
    mock.markRendererReady.mockClear();
    mock.island.setBackgroundThrottling.mockClear();
    mock.settings.setBackgroundThrottling.mockClear();
    mock.settings.once.mockClear();
    mock.showMainWindow.mockClear();
    mock.showColorPicker.mockReset().mockResolvedValue(null);
    mock.openDiagnosticsFolder.mockReset().mockResolvedValue(undefined);
    mock.recordApplicationError.mockClear();
    services.notices.report.mockClear();
    services.notices.rendererReady.mockClear();
    clearWindowRoles();
    registerWindowRole(mock.island as unknown as WebContents, 'island');
    registerWindowRole(mock.settings as unknown as WebContents, 'settings');
    registerIPC(services);
  });
  it('allows the island and settings windows and rejects every other sender', async () => {
    await expect(mock.handlers.get('focus-window')!({ sender: mock.sender })).rejects.toThrow(
      'Unknown IPC sender',
    );
    await expect(
      mock.handlers.get('focus-window')!({ sender: mock.island }),
    ).resolves.toBeUndefined();
    await expect(
      mock.handlers.get('get-app-bootstrap')!({ sender: mock.settings }),
    ).resolves.toEqual({ state: defaultAppState, hasApiKey: false });
  });
  it('restricts the native color picker to Settings and validates RGB before invoking it', async () => {
    const choose = mock.handlers.get('show-color-picker')!;
    await expect(choose({ sender: mock.sender }, '#123456')).rejects.toThrow('Unknown IPC sender');
    await expect(choose({ sender: mock.island }, '#123456')).rejects.toThrow(
      'Invalid settings color',
    );
    for (const value of ['#123', 'red', '#123456;exit', null, 123])
      await expect(choose({ sender: mock.settings }, value)).rejects.toThrow(
        'Invalid settings color',
      );
    expect(mock.showColorPicker).not.toHaveBeenCalled();
    await expect(choose({ sender: mock.settings }, '#123456')).resolves.toBeNull();
    expect(mock.showColorPicker).toHaveBeenCalledWith(mock.colorOwner, '#123456');
    mock.showColorPicker.mockResolvedValue('#ABCDEF');
    await expect(choose({ sender: mock.settings }, '#123456')).resolves.toBe('#ABCDEF');
    mock.showColorPicker.mockRejectedValue(new Error('Picker unavailable'));
    await expect(choose({ sender: mock.settings }, '#123456')).rejects.toThrow(
      'Picker unavailable',
    );
    expect(services.notices.report).toHaveBeenLastCalledWith(
      'colorPickerFailed',
      'Picker unavailable',
      'error',
      'settings',
    );
  });
  it('accepts only valid input rectangles from an allowed renderer', () => {
    const rect = { x: 10, y: 20, width: 170, height: 40, scaleFactor: 1.5 };
    const send = mock.events.get('set-window-input-shape')!;
    send({ sender: mock.sender }, rect);
    send({ sender: mock.island }, { ...rect, width: NaN });
    send({ sender: mock.island }, { ...rect, scaleFactor: 0 });
    expect(mock.shape).not.toHaveBeenCalled();
    send({ sender: mock.island }, rect);
    expect(mock.shape).toHaveBeenCalledWith(rect);
    send({ sender: mock.settings }, { ...rect, x: 40 });
    expect(mock.shape).toHaveBeenCalledWith({ ...rect, x: 40 });
  });
  it('broadcasts persisted app state to every registered window', async () => {
    const next = {
      ...defaultAppState,
      settings: { ...defaultAppState.settings, showTray: false },
    };
    services.stateStore.update = async () => next;
    await mock.handlers.get('update-app-state')!(
      { sender: mock.settings },
      { settings: { showTray: false } },
    );
    expect(mock.island.send).toHaveBeenCalledWith('app-state-changed', next);
    expect(mock.settings.send).toHaveBeenCalledWith('app-state-changed', next);
  });
  it('marks only the island ready when its renderer reports ready', async () => {
    await mock.handlers.get('renderer-ready')!({ sender: mock.settings });
    expect(mock.markRendererReady).not.toHaveBeenCalled();
    expect(services.notices.rendererReady).toHaveBeenCalledWith('settings');
    await mock.handlers.get('renderer-ready')!({ sender: mock.island });
    expect(mock.markRendererReady).toHaveBeenCalledOnce();
    expect(services.notices.rendererReady).toHaveBeenCalledWith('island');
  });
  it('allows only Settings to hold preview and releases it when the owner closes', async () => {
    const setPreview = mock.handlers.get('set-island-preview')!;
    await expect(setPreview({ sender: mock.island }, true)).rejects.toThrow();
    await expect(setPreview({ sender: mock.settings }, 'true')).rejects.toThrow();
    await setPreview({ sender: mock.settings }, true);
    expect(mock.island.send).toHaveBeenCalledWith('island-preview-changed', true);
    expect(mock.island.setBackgroundThrottling).toHaveBeenLastCalledWith(false);
    expect(mock.settings.setBackgroundThrottling).toHaveBeenLastCalledWith(false);
    expect(mock.showMainWindow).toHaveBeenCalled();
    await expect(mock.handlers.get('get-island-preview')!({ sender: mock.island })).resolves.toBe(
      true,
    );
    const destroyed = mock.settings.once.mock.calls.at(-1)![1] as () => void;
    destroyed();
    expect(mock.island.send).toHaveBeenLastCalledWith('island-preview-changed', false);
    await expect(mock.handlers.get('get-island-preview')!({ sender: mock.island })).resolves.toBe(
      false,
    );
  });
  it('reads the system locale and accepts only supported resolved tray languages', async () => {
    const event = { sender: mock.island };
    await expect(mock.handlers.get('get-system-locale')!(event)).resolves.toBe('zh-HK');
    await expect(mock.handlers.get('set-ui-locale')!(event, 'de')).rejects.toThrow(
      'Invalid locale',
    );
    await mock.handlers.get('set-ui-locale')!(event, 'ja');
    expect(setTrayLocale).toHaveBeenCalledWith('ja');
  });
  it('applies menu bar icon visibility after persisting the setting', async () => {
    const event = { sender: mock.island };
    await mock.handlers.get('update-app-state')!(event, {
      settings: { showTray: false },
    });
    expect(services.applyShowTray).toHaveBeenCalledWith(false);
  });
  it('rejects commands outside the media contract before executing platform code', async () => {
    await expect(
      mock.handlers.get('control-system-media')!({ sender: mock.island }, 'shell-command'),
    ).rejects.toThrow('Invalid media command');
  });
  it('opens the diagnostics directory through the service', async () => {
    await mock.handlers.get('open-diagnostics-folder')!({
      sender: mock.island,
    });
    expect(mock.openDiagnosticsFolder).toHaveBeenCalledOnce();
  });
  it('reads native clipboard text without recording its contents', async () => {
    mock.readClipboard.mockReturnValue('private clipboard text');
    const result = await mock.handlers.get('read-clipboard-text')!({
      sender: mock.island,
    });
    expect(result).toBe('private clipboard text');
    expect(JSON.stringify(mock.recordDiagnostic.mock.calls)).not.toContain(
      'private clipboard text',
    );
  });
  it('records a polled failure once, counts repeats, and records recovery', async () => {
    mock.recordDiagnostic.mockClear();
    const event = { sender: mock.island };
    const error = Object.assign(new Error('private clipboard message'), {
      code: 'EACCES',
    });
    mock.readClipboard
      .mockImplementationOnce(() => {
        throw error;
      })
      .mockImplementationOnce(() => {
        throw error;
      })
      .mockReturnValue('recovered private text');
    const read = mock.handlers.get('read-clipboard-text')!;
    await expect(read(event)).rejects.toBe(error);
    await expect(read(event)).rejects.toBe(error);
    await expect(read(event)).resolves.toBe('recovered private text');
    expect(mock.recordDiagnostic.mock.calls.map(([entry]) => entry.phase)).toEqual([
      'failed',
      'recovered',
    ]);
    expect(mock.recordDiagnostic.mock.calls[1][0].repeated).toBe(1);
    expect(JSON.stringify(mock.recordDiagnostic.mock.calls)).not.toContain('private');
  });
  it('records IPC failure channel and system code without recording arguments', async () => {
    mock.recordDiagnostic.mockClear();
    const error = Object.assign(new Error('private arguments'), {
      code: 'EACCES',
    });
    mock.openDiagnosticsFolder.mockRejectedValueOnce(error);
    await expect(
      mock.handlers.get('open-diagnostics-folder')!({ sender: mock.island }),
    ).rejects.toBe(error);
    expect(mock.recordDiagnostic).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'ipc-operation',
        channel: 'open-diagnostics-folder',
        phase: 'failed',
        error: expect.objectContaining({ code: 'EACCES' }),
      }),
    );
    expect(JSON.stringify(mock.recordDiagnostic.mock.calls)).not.toContain('private arguments');
  });
  it('opens the settings window through the dedicated channel', async () => {
    const { openSettingsWindow } = await import('../src/main/settingsWindow');
    await mock.handlers.get('open-settings')!({ sender: mock.island });
    expect(openSettingsWindow).toHaveBeenCalledOnce();
  });
  it('reports diagnostics folder failures in Settings and preserves the IPC rejection', async () => {
    const error = new Error('Could not open diagnostics directory');
    mock.openDiagnosticsFolder.mockRejectedValueOnce(error);
    await expect(
      mock.handlers.get('open-diagnostics-folder')!({
        sender: mock.island,
      }),
    ).rejects.toBe(error);
    expect(services.notices.report).toHaveBeenCalledWith(
      'diagnosticsFolderOpenFailed',
      'Could not open diagnostics directory',
      'error',
      'settings',
    );
    expect(mock.recordDiagnostic).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'open-diagnostics-folder',
        phase: 'failed',
      }),
    );
  });
});
