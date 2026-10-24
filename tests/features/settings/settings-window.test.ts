import { beforeEach, describe, expect, it, vi } from 'vitest';

type MockWindow = {
  id: number;
  webContents: {
    id: number;
    isDestroyed: () => boolean;
    send: ReturnType<typeof vi.fn>;
    once: ReturnType<typeof vi.fn>;
  };
  isDestroyed: () => boolean;
  isMinimized: () => boolean;
  restore: ReturnType<typeof vi.fn>;
  show: ReturnType<typeof vi.fn>;
  focus: ReturnType<typeof vi.fn>;
  moveTop: ReturnType<typeof vi.fn>;
  once: (event: string, cb: () => void) => void;
  on: (event: string, cb: () => void) => void;
  loadURL: ReturnType<typeof vi.fn>;
  loadFile: ReturnType<typeof vi.fn>;
  destroy: () => void;
};

const mock = vi.hoisted(() => {
  const windows: MockWindow[] = [];
  let nextId = 1;
  let lastOptions: Record<string, unknown> | undefined;
  const app = {
    focus: vi.fn(),
    setActivationPolicy: vi.fn(),
  };
  class MockBrowserWindow {
    id = nextId++;
    #destroyed = false;
    #closed: Array<() => void> = [];
    #ready: Array<() => void> = [];
    restore = vi.fn();
    show = vi.fn();
    focus = vi.fn();
    moveTop = vi.fn();
    setBackgroundColor = vi.fn();
    setMenu = vi.fn();
    setTitleBarOverlay = vi.fn();
    setVibrancy = vi.fn();
    setBackgroundMaterial = vi.fn();
    webContents = {
      id: this.id + 100,
      isDestroyed: () => this.#destroyed,
      send: vi.fn(),
      once: vi.fn((event: string, cb: () => void) => {
        if (event === 'destroyed') {
          this.#closed.push(() => {
            this.#destroyed = true;
            cb();
          });
        }
      }),
    };
    loadURL = vi.fn(async () => {
      for (const cb of this.#ready) cb();
    });
    loadFile = vi.fn(async () => {
      for (const cb of this.#ready) cb();
    });
    constructor(options: Record<string, unknown> = {}) {
      lastOptions = options;
      windows.push(this as unknown as MockWindow);
    }
    isDestroyed() {
      return this.#destroyed;
    }
    isMinimized() {
      return false;
    }
    once(event: string, cb: () => void) {
      if (event === 'ready-to-show') this.#ready.push(cb);
    }
    on(event: string, cb: () => void) {
      if (event === 'closed') this.#closed.push(cb);
    }
    destroy() {
      this.#destroyed = true;
      for (const cb of this.#closed) cb();
    }
  }
  return {
    windows,
    osRelease: '10.0.26300',
    BrowserWindow: MockBrowserWindow,
    app,
    get lastOptions() {
      return lastOptions;
    },
  };
});

vi.mock('node:os', () => ({ release: () => mock.osRelease }));

vi.mock('electron', () => ({
  BrowserWindow: mock.BrowserWindow,
  app: mock.app,
  nativeTheme: {
    shouldUseDarkColors: false,
    on: vi.fn(),
    off: vi.fn(),
  },
}));
vi.mock('../../../src/main/assets', () => ({ getIconPath: () => '/tmp/icon.png' }));
vi.mock('../../../src/main/services/windowDiagnostics', () => ({
  attachWindowDiagnostics: vi.fn(),
}));

import {
  clearSettingsWindow,
  configureSettingsWindow,
  getSettingsWindow,
  openSettingsWindow,
  setSettingsSidebarTranslucent,
} from '../../../src/main/settingsWindow';
import { clearWindowRoles, getWindowRole } from '../../../src/main/windowRoles';
import { nativeTheme, type WebContents } from 'electron';

describe('settings window singleton', () => {
  beforeEach(() => {
    mock.windows.length = 0;
    mock.osRelease = '10.0.26300';
    clearSettingsWindow();
    clearWindowRoles();
    mock.app.focus.mockClear();
    mock.app.setActivationPolicy.mockClear();
    configureSettingsWindow({
      diagnostics: {
        record: vi.fn(),
        recordError: vi.fn(),
        openFolder: vi.fn(),
      } as never,
      onLoadError: vi.fn(),
      sidebarTranslucent: false,
    });
  });

  it('creates one window lazily and focuses it on the next open', () => {
    const first = openSettingsWindow();
    expect(mock.windows).toHaveLength(1);
    expect(getSettingsWindow()).toBe(first);
    expect(getWindowRole(first.webContents as unknown as WebContents)).toBe('settings');
    expect(mock.lastOptions?.skipTaskbar).toBe(false);
    expect(mock.lastOptions?.backgroundColor).toBe('#00000000');
    expect(mock.lastOptions).not.toHaveProperty('type');
    expect(mock.lastOptions?.transparent ?? false).toBe(process.platform === 'linux');
    const second = openSettingsWindow();
    expect(mock.windows).toHaveLength(1);
    expect(second).toBe(first);
    expect(first.show).toHaveBeenCalled();
    expect(first.focus).toHaveBeenCalled();
  });

  it('forgets the window after it closes so the next open creates another', () => {
    const first = openSettingsWindow() as unknown as { destroy: () => void };
    first.destroy();
    expect(getSettingsWindow()).toBeNull();
    openSettingsWindow();
    expect(mock.windows).toHaveLength(2);
  });

  it('disables Windows accent highlighting without changing other platforms', () => {
    const previousPlatform = process.platform;
    try {
      for (const platform of ['win32', 'darwin', 'linux']) {
        Object.defineProperty(process, 'platform', { configurable: true, value: platform });
        clearSettingsWindow();
        openSettingsWindow();
        if (platform === 'win32') {
          expect(mock.lastOptions?.accentColor).toBe(false);
          expect(mock.lastOptions?.thickFrame).toBe(true);
          expect(mock.lastOptions?.roundedCorners).toBe(true);
          expect(mock.lastOptions?.transparent ?? false).toBe(false);
        } else expect(mock.lastOptions).not.toHaveProperty('accentColor');
      }
    } finally {
      Object.defineProperty(process, 'platform', { configurable: true, value: previousPlatform });
    }
  });

  it('uses LuLu-style activation policy for the Dock without dock.show/hide', () => {
    const previousPlatform = process.platform;
    Object.defineProperty(process, 'platform', { configurable: true, value: 'darwin' });
    try {
      const first = openSettingsWindow() as unknown as {
        destroy: () => void;
        show: ReturnType<typeof vi.fn>;
        focus: ReturnType<typeof vi.fn>;
        moveTop: ReturnType<typeof vi.fn>;
      };
      // regular before/while presenting; ready-to-show also presents
      expect(mock.app.setActivationPolicy).toHaveBeenCalledWith('regular');
      expect(first.show).toHaveBeenCalled();
      expect(first.focus).toHaveBeenCalled();
      expect(mock.app.focus).toHaveBeenCalledWith({ steal: true });
      expect(first.moveTop).toHaveBeenCalled();
      expect(mock.app).not.toHaveProperty('dock');

      mock.app.setActivationPolicy.mockClear();
      openSettingsWindow();
      expect(mock.app.setActivationPolicy).toHaveBeenCalledWith('regular');

      mock.app.setActivationPolicy.mockClear();
      first.destroy();
      expect(getSettingsWindow()).toBeNull();
      expect(mock.app.setActivationPolicy).toHaveBeenCalledWith('accessory');
      expect(mock.app.setActivationPolicy).not.toHaveBeenCalledWith('regular');
    } finally {
      Object.defineProperty(process, 'platform', {
        configurable: true,
        value: previousPlatform,
      });
    }
  });
});

it.each(['win32', 'darwin', 'linux'])(
  '%s changes only the native sidebar backdrop without recreating the settings window',
  (platform) => {
    const previous = process.platform;
    Object.defineProperty(process, 'platform', { configurable: true, value: platform });
    try {
      clearSettingsWindow();
      configureSettingsWindow({
        diagnostics: { record: vi.fn() } as never,
        onLoadError: vi.fn(),
        sidebarTranslucent: true,
      });
      const window = openSettingsWindow();
      expect(mock.lastOptions?.titleBarStyle).toBe('hidden');
      expect(mock.lastOptions?.backgroundColor).toBe('#00000000');
      if (platform === 'darwin') expect(window.setVibrancy).toHaveBeenLastCalledWith('sidebar');
      else expect(window.setMenu).toHaveBeenCalledWith(null);
      if (platform === 'win32')
        expect(window.setBackgroundMaterial).toHaveBeenLastCalledWith('acrylic');
      setSettingsSidebarTranslucent(false);
      expect(window.setBackgroundColor).toHaveBeenLastCalledWith('#f5f5f7');
      if (platform === 'win32')
        expect(window.setBackgroundMaterial).toHaveBeenLastCalledWith('none');
      if (platform === 'darwin') expect(window.setVibrancy).toHaveBeenLastCalledWith(null);
      expect(getSettingsWindow()).toBe(window);
      const sync = vi.mocked(nativeTheme.on).mock.calls.at(-1)![1] as () => void;
      Object.assign(nativeTheme, { shouldUseDarkColors: true });
      sync();
      expect(window.setBackgroundColor).toHaveBeenLastCalledWith('#111111');
      window.destroy();
    } finally {
      Object.assign(nativeTheme, { shouldUseDarkColors: false });
      Object.defineProperty(process, 'platform', { configurable: true, value: previous });
    }
  },
);

it('keeps the solid window fallback when Windows has no system backdrop material', () => {
  const previous = process.platform;
  Object.defineProperty(process, 'platform', { configurable: true, value: 'win32' });
  mock.osRelease = '10.0.19045';
  try {
    clearSettingsWindow();
    configureSettingsWindow({
      diagnostics: { record: vi.fn() } as never,
      onLoadError: vi.fn(),
      sidebarTranslucent: true,
    });
    const window = openSettingsWindow();
    expect(mock.lastOptions?.backgroundColor).toBe('#f5f5f7');
    expect(window.setBackgroundMaterial).not.toHaveBeenCalled();
    window.destroy();
  } finally {
    mock.osRelease = '10.0.26300';
    Object.defineProperty(process, 'platform', { configurable: true, value: previous });
  }
});
