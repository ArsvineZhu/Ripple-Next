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
    BrowserWindow: MockBrowserWindow,
    app,
    get lastOptions() {
      return lastOptions;
    },
  };
});

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
} from '../../../src/main/settingsWindow';
import { clearWindowRoles, getWindowRole } from '../../../src/main/windowRoles';
import type { WebContents } from 'electron';

describe('settings window singleton', () => {
  beforeEach(() => {
    mock.windows.length = 0;
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
    });
  });

  it('creates one window lazily and focuses it on the next open', () => {
    const first = openSettingsWindow();
    expect(mock.windows).toHaveLength(1);
    expect(getSettingsWindow()).toBe(first);
    expect(getWindowRole(first.webContents as unknown as WebContents)).toBe('settings');
    expect(mock.lastOptions?.skipTaskbar).toBe(false);
    expect(mock.lastOptions?.backgroundColor).toBe('#ffffff');
    expect(mock.lastOptions).not.toHaveProperty('type');
    expect('transparent' in (mock.lastOptions ?? {}) ? mock.lastOptions?.transparent : false).toBe(
      false,
    );
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
        if (platform === 'win32') expect(mock.lastOptions?.accentColor).toBe(false);
        else expect(mock.lastOptions).not.toHaveProperty('accentColor');
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
