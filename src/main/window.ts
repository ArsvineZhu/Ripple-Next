import { createLinuxInputShape } from './platform/linux/inputShape';
import { app, BrowserWindow, screen } from 'electron';
import path from 'node:path';

import { getIconPath } from './assets';
import type { DiagnosticsService } from './services/diagnostics';
import { attachWindowDiagnostics, recordRendererReady } from './services/windowDiagnostics';
import { createWindowsInputRegion } from './platform/windows/inputRegion';
import type { InputRect } from '../shared/contracts';
import { getWindowBoundsForDisplay } from './windowBounds';
import { registerWindowRole } from './windowRoles';
import {
  applyIslandCollectionBehavior,
  ISLAND_WINDOW_TITLE,
} from './platform/macos/islandWindowBehavior';
import { installScrollGestureBridge } from './services/scrollGestures';
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('enable-transparent-visuals');
}
if (process.platform === 'darwin') {
  app.commandLine.appendSwitch('disable-features', 'OverscrollHistoryNavigation');
}
let mainWindow: BrowserWindow | null = null;
let activeDiagnostics: DiagnosticsService | null = null;
let mainWindowReady = false;
let rendererIsReady = false;
let displaySyncInstalled = false;
let windowsInputRegion: ReturnType<typeof createWindowsInputRegion> | undefined;
const syncWindowToDisplay = () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const currentBounds = mainWindow.getBounds();
  const displayBounds = getWindowBoundsForDisplay(screen.getDisplayMatching(currentBounds));
  if (
    currentBounds.x !== displayBounds.x ||
    currentBounds.y !== displayBounds.y ||
    currentBounds.width !== displayBounds.width ||
    currentBounds.height !== displayBounds.height
  ) {
    mainWindow.setBounds(displayBounds);
  }
};
const installDisplaySync = () => {
  if (displaySyncInstalled) return;
  displaySyncInstalled = true;
  screen.on('display-metrics-changed', (_event, display, changedMetrics) => {
    if (
      !changedMetrics.includes('bounds') &&
      !changedMetrics.includes('workArea') &&
      !changedMetrics.includes('scaleFactor')
    ) {
      return;
    }
    if (mainWindow && screen.getDisplayMatching(mainWindow.getBounds()).id === display.id) {
      syncWindowToDisplay();
    }
  });
  screen.on('display-removed', () => syncWindowToDisplay());
};
const applySkipTaskbar = () => {
  if (!mainWindow) return;
  // Island stays off the taskbar on every platform; settings uses its own window.
  if (process.platform === 'linux') inputShape.setSkipTaskbar(true);
  else mainWindow.setSkipTaskbar(true);
};
export const showMainWindow = (focus = false) => {
  if (!mainWindow || !mainWindowReady || !rendererIsReady) return;
  if (process.platform === 'linux' && !inputShape.isReady()) return;

  syncWindowToDisplay();
  if (focus) mainWindow.show();
  else if (!mainWindow.isVisible()) mainWindow.showInactive();
  applySkipTaskbar();
  mainWindow.setAlwaysOnTop(true, process.platform === 'linux' ? 'screen-saver' : 'floating');
  if (focus) mainWindow.focus();
};

export const markRendererReady = () => {
  rendererIsReady = true;
  if (mainWindow && activeDiagnostics) recordRendererReady(mainWindow, activeDiagnostics);
  showMainWindow();
};

export const createWindow = (
  diagnostics: DiagnosticsService,
  onLoadError: (error: unknown) => void = () => {},
  displayId: string | null = null,
) => {
  activeDiagnostics = diagnostics;
  installDisplaySync();
  mainWindowReady = false;
  rendererIsReady = false;
  inputShape.reset();
  const isLinux = process.platform === 'linux';
  const isWindows = process.platform === 'win32';
  const isMac = process.platform === 'darwin';
  const display =
    screen.getAllDisplays().find((item) => String(item.id) === displayId) ??
    screen.getPrimaryDisplay();
  const { x, y, width, height } = getWindowBoundsForDisplay(display);

  const winWidth = width;
  const winHeight = height;
  const winX = x;
  const winY = y;

  // Electron's panel window type is macOS-only; Linux uses a normal X11 window.
  const windowType = isWindows ? 'toolbar' : isMac ? 'panel' : undefined;

  mainWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: winX,
    y: winY,
    backgroundColor: '#00000000',
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    frame: false,
    ...(isWindows ? {} : { thickFrame: false }),
    hasShadow: false,
    skipTaskbar: true,
    icon: getIconPath(),
    ...(isMac ? { hiddenInMissionControl: true } : {}),
    ...(windowType ? { type: windowType } : {}),
    fullscreen: false,
    acceptFirstMouse: true,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
      devTools: false,
      // Windows passthrough needs an active renderer to track input geometry.
      // Other platforms can retain Electron's throttling when the window hides.
      backgroundThrottling: !isWindows,
    },
    show: false,
  });
  attachWindowDiagnostics(mainWindow, diagnostics);
  registerWindowRole(mainWindow.webContents, 'island');
  if (isMac) mainWindow.setTitle(ISLAND_WINDOW_TITLE);
  const closeScrollGestureBridge = installScrollGestureBridge(mainWindow.webContents);
  diagnostics.record({
    kind: 'window-lifecycle',
    event: 'created',
    windowId: mainWindow.id,
    webContentsId: mainWindow.webContents.id,
  });

  if (!isLinux) {
    mainWindow.setIgnoreMouseEvents(true, { forward: true });
    if (isWindows) windowsInputRegion = createWindowsInputRegion(mainWindow, diagnostics);
  } else {
    mainWindow.setIgnoreMouseEvents(false);
    mainWindow.on('move', syncWindowToDisplay);
    mainWindow.on('resize', syncWindowToDisplay);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindowReady = true;
    syncWindowToDisplay();
    showMainWindow();
    // macOS: replace Electron's Transient-only Mission Control bit with the intentional whole mask.
    if (isMac && mainWindow && !mainWindow.isDestroyed()) {
      const result = applyIslandCollectionBehavior(mainWindow);
      if (!result.ok) {
        diagnostics.recordError(
          'window',
          new Error(`island collectionBehavior apply failed: ${result.reason}`),
        );
      }
    }
  });

  mainWindow.on('closed', () => {
    closeScrollGestureBridge();
    windowsInputRegion = undefined;
    mainWindow = null;
  });

  if (!isWindows) mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL).catch(onLoadError);
  } else {
    const rendererPath = path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`);
    void mainWindow.loadFile(rendererPath).catch(onLoadError);
  }
};

export const getMainWindow = () => mainWindow;
export function moveMainWindowToDisplay(displayId: string | null) {
  const target =
    displayId === null
      ? screen.getPrimaryDisplay()
      : screen.getAllDisplays().find((display) => String(display.id) === displayId);
  if (!target) throw new TypeError('The selected display is no longer available');
  if (!mainWindow) throw new Error('The Island window is not available');
  mainWindow.setBounds(getWindowBoundsForDisplay(target));
  showMainWindow();
}
const inputShape = createLinuxInputShape(() => mainWindow, showMainWindow);
export const initializeLinuxInputShape = (
  diagnostics: DiagnosticsService,
  onError?: (error: unknown) => void,
) => {
  inputShape.setDiagnostics(diagnostics);
  if (onError) inputShape.setErrorHandler(onError);
  inputShape.initialize();
};
export const applyWindowInputRegion = (rect: InputRect) => {
  if (process.platform === 'win32') windowsInputRegion?.apply(rect);
  else if (process.platform === 'linux') inputShape.apply(rect);
};
export const closeInputConnection = () => {
  windowsInputRegion?.close();
  inputShape.close();
};
