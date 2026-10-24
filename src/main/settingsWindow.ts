import { DiagnosticError } from '../shared/diagnosticError';
import path from 'node:path';
import { release } from 'node:os';
import { app, BrowserWindow, nativeTheme } from 'electron';
import { getIconPath } from './assets';
import type { DiagnosticsService } from './services/diagnostics';
import { attachWindowDiagnostics } from './services/windowDiagnostics';
import { registerWindowRole } from './windowRoles';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

let settingsWindow: BrowserWindow | null = null;
let translucentSidebar = true;
const supportsBackdrop = () =>
  process.platform === 'darwin' ||
  process.platform === 'linux' ||
  (process.platform === 'win32' && Number(release().split('.')[2]) >= 22621);

export function setSettingsSidebarTranslucent(enabled: boolean): void {
  translucentSidebar = enabled;
  if (settingsWindow && !settingsWindow.isDestroyed()) syncSettingsAppearance(settingsWindow);
}

function syncSettingsAppearance(window: BrowserWindow): void {
  const translucent = translucentSidebar && supportsBackdrop();
  window.setBackgroundColor(translucent ? '#00000000' : settingsWindowBackgroundColor());
  if (process.platform === 'darwin') window.setVibrancy(translucent ? 'sidebar' : null);
  if (process.platform === 'win32' && supportsBackdrop())
    window.setBackgroundMaterial(translucent ? 'acrylic' : 'none');
  if (process.platform !== 'darwin')
    window.setTitleBarOverlay({
      color: '#00000000',
      symbolColor: nativeTheme.shouldUseDarkColors ? '#ffffff' : '#111111',
      height: 44,
    });
}
let configured: {
  diagnostics: DiagnosticsService;
  onLoadError: (error: unknown) => void;
} | null = null;

/** Match the settings shell OS light/dark tokens (not island themes). */
function settingsWindowBackgroundColor(): string {
  return nativeTheme.shouldUseDarkColors ? '#111111' : '#f5f5f7';
}

export function configureSettingsWindow(options: {
  diagnostics: DiagnosticsService;
  onLoadError: (error: unknown) => void;
  sidebarTranslucent?: boolean;
}): void {
  configured = options;
  translucentSidebar = options.sidebarTranslucent ?? true;
}

export function getSettingsWindow(): BrowserWindow | null {
  return settingsWindow;
}

/**
 * LuLu makeActive: regular policy first, then show the window, then strong activation.
 * Do not call dock.show()/hide(); setActivationPolicy alone drives the Dock tile.
 */
function presentSettingsWindow(window: BrowserWindow): void {
  if (process.platform === 'darwin') app.setActivationPolicy('regular');
  if (window.isMinimized()) window.restore();
  window.show();
  window.focus();
  if (process.platform === 'darwin') {
    app.focus({ steal: true });
    window.moveTop();
  }
}

/** LuLu closeWindow path for Ripple: only Settings closing returns to accessory (Island stays up). */
function onSettingsWindowClosed(): void {
  if (process.platform === 'darwin') app.setActivationPolicy('accessory');
}

/** Own the singleton pointer, role, OS chrome sync, and close cleanup. */
function wireSettingsWindow(window: BrowserWindow): void {
  settingsWindow = window;
  registerWindowRole(window.webContents, 'settings');
  const syncBackground = () => {
    if (!window.isDestroyed()) {
      syncSettingsAppearance(window);
    }
  };
  nativeTheme.on('updated', syncBackground);
  window.on('closed', () => {
    nativeTheme.off('updated', syncBackground);
    if (settingsWindow === window) settingsWindow = null;
    onSettingsWindowClosed();
  });
}

/**
 * Attach an existing BrowserWindow as the settings window (tests and step-1 seam).
 * Production code should call openSettingsWindow() instead.
 */
export function attachSettingsWindow(window: BrowserWindow): void {
  wireSettingsWindow(window);
}

/** Test seam: drop the attached settings window without destroying it. */
export function clearSettingsWindow(): void {
  settingsWindow = null;
}

/** One settings window: create on demand, focus if it already exists, destroy on close. */
export function openSettingsWindow(): BrowserWindow {
  if (!configured) throw new DiagnosticError('Settings window is not configured');
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    presentSettingsWindow(settingsWindow);
    return settingsWindow;
  }

  const { diagnostics, onLoadError } = configured;
  if (process.platform === 'darwin') app.setActivationPolicy('regular');
  const window = new BrowserWindow({
    width: 920,
    height: 640,
    minWidth: 760,
    minHeight: 520,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    ...(process.platform === 'darwin'
      ? { trafficLightPosition: { x: 12, y: 14 } }
      : {
          titleBarOverlay: {
            color: '#00000000',
            symbolColor: nativeTheme.shouldUseDarkColors ? '#ffffff' : '#111111',
            height: 44,
          },
        }),
    ...(process.platform === 'linux' ? { transparent: true } : {}),
    ...(process.platform === 'win32'
      ? {
          thickFrame: true,
          roundedCorners: true,
          backgroundMaterial:
            translucentSidebar && supportsBackdrop() ? ('acrylic' as const) : ('none' as const),
        }
      : {}),
    title: 'Ripple Next',
    backgroundColor: supportsBackdrop() ? '#00000000' : settingsWindowBackgroundColor(),
    // Keep Windows' active-window border neutral even when the OS accent color is enabled.
    ...(process.platform === 'win32' ? { accentColor: false } : {}),
    // Settings is a normal window: on the taskbar while open, never click-through.
    skipTaskbar: false,
    // HIG: a settings window accommodates the size of the current pane, so its minimize and zoom
    // buttons are dimmed (macOS only; the option has no meaning on Windows or Linux).
    ...(process.platform === 'darwin' ? { minimizable: false, maximizable: false } : {}),
    icon: getIconPath(),
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
      devTools: false,
      backgroundThrottling: true,
    },
  });
  if (process.platform !== 'darwin') window.setMenu(null);
  wireSettingsWindow(window);
  syncSettingsAppearance(window);
  attachWindowDiagnostics(window, diagnostics, 'settings');
  diagnostics.record({
    kind: 'window-lifecycle',
    event: 'created',
    role: 'settings',
    windowId: window.id,
    webContentsId: window.webContents.id,
  });

  window.once('ready-to-show', () => {
    if (!window.isDestroyed()) presentSettingsWindow(window);
  });

  const devServerUrl =
    typeof MAIN_WINDOW_VITE_DEV_SERVER_URL === 'undefined'
      ? undefined
      : MAIN_WINDOW_VITE_DEV_SERVER_URL;
  const viteName =
    typeof MAIN_WINDOW_VITE_NAME === 'undefined' ? 'main_window' : MAIN_WINDOW_VITE_NAME;
  if (devServerUrl) {
    void window.loadURL(`${devServerUrl}#settings`).catch(onLoadError);
  } else {
    const rendererPath = path.join(__dirname, `../renderer/${viteName}/index.html`);
    void window.loadFile(rendererPath, { hash: 'settings' }).catch(onLoadError);
  }
  return window;
}
