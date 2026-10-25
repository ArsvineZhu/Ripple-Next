import path from 'node:path';
import { app, BrowserWindow, nativeTheme } from 'electron';
import { getIconPath } from './assets';
import type { DiagnosticsService } from './services/diagnostics';
import { attachWindowDiagnostics } from './services/windowDiagnostics';
import { registerWindowRole } from './windowRoles';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

let recoveryWindow: BrowserWindow | null = null;
let relaunching = false;

export function hasProfileRecoveryWindow() {
  return recoveryWindow !== null && !recoveryWindow.isDestroyed();
}

export function focusProfileRecoveryWindow() {
  const window = recoveryWindow;
  if (!window || window.isDestroyed()) return;
  if (process.platform === 'darwin') app.setActivationPolicy('regular');
  if (window.isMinimized()) window.restore();
  window.show();
  window.focus();
}

export function relaunchAfterProfileReset() {
  relaunching = true;
  app.relaunch();
  app.exit(0);
}

export function openProfileRecoveryWindow(
  diagnostics: DiagnosticsService,
  onLoadError: (error: unknown) => void,
) {
  if (recoveryWindow && !recoveryWindow.isDestroyed()) {
    focusProfileRecoveryWindow();
    return recoveryWindow;
  }
  if (process.platform === 'darwin') app.setActivationPolicy('regular');
  const backgroundColor = nativeTheme.shouldUseDarkColors ? '#111111' : '#f5f5f7';
  const window = new BrowserWindow({
    width: 520,
    height: 460,
    minWidth: 420,
    minHeight: 380,
    center: true,
    show: false,
    autoHideMenuBar: true,
    title: 'Ripple Next',
    backgroundColor,
    skipTaskbar: false,
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
  recoveryWindow = window;
  registerWindowRole(window.webContents, 'settings');
  attachWindowDiagnostics(window, diagnostics, 'settings');
  window.once('ready-to-show', () => {
    if (!window.isDestroyed()) focusProfileRecoveryWindow();
  });
  window.on('closed', () => {
    if (recoveryWindow === window) recoveryWindow = null;
    if (!relaunching) app.quit();
  });
  const devServerUrl =
    typeof MAIN_WINDOW_VITE_DEV_SERVER_URL === 'undefined'
      ? undefined
      : MAIN_WINDOW_VITE_DEV_SERVER_URL;
  const viteName =
    typeof MAIN_WINDOW_VITE_NAME === 'undefined' ? 'main_window' : MAIN_WINDOW_VITE_NAME;
  if (devServerUrl) void window.loadURL(`${devServerUrl}#recovery`).catch(onLoadError);
  else
    void window
      .loadFile(path.join(__dirname, `../renderer/${viteName}/index.html`), {
        hash: 'recovery',
      })
      .catch(onLoadError);
  return window;
}
