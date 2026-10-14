import { app, dialog, powerMonitor, safeStorage, screen } from 'electron';
import os from 'node:os';
import { configureApplicationProfile, requestApplicationInstanceLock } from './appProfile';
import { defaultAppState } from '../shared/appState';
import { messages, resolveLocale } from '../shared/i18n';
import { registerIPC } from './ipc';
import {
  closeInputConnection,
  createWindow,
  getMainWindow,
  initializeLinuxInputShape,
} from './window';
import { hasTray, setTrayVisible } from './tray';
import { installAppMenu } from './appMenu';
import { shouldQuitAfterLastWindow } from './appLifecycle';
import { configureSettingsWindow, openSettingsWindow } from './settingsWindow';
import { createAppStateStore } from './services/appStateStore';
import { createSecretStore } from './services/secretStore';
import { createAssistantService } from './ai/assistant';
import { createWeatherService } from './services/weather';
import { createAIConfigurationService } from './ai/configuration';
import { createNoticeBus } from './services/noticeBus';
import { initializeDiagnostics, type DiagnosticsService } from './services/diagnostics';
import {
  installChildProcessDiagnostics,
  installFatalErrorMonitor,
} from './services/processDiagnostics';
import {
  installBackgroundImageProtocol,
  registerBackgroundImageScheme,
} from './services/backgroundImage';

registerBackgroundImageScheme();
app.setName('Ripple Next');

const userDataPath = configureApplicationProfile(app);
if (process.platform === 'win32') app.setAppUserModelId('com.arsvinezhu.ripple-next');
// LSUIElement agent: start accessory; Settings open switches to regular (LuLu-style).
if (process.platform === 'darwin') app.setActivationPolicy('accessory');

if (!requestApplicationInstanceLock(app, userDataPath)) {
  app.quit();
} else {
  void startApplication();
}

async function startApplication() {
  const notices = createNoticeBus();
  let diagnostics: DiagnosticsService | null = null;
  let startupComplete = false;
  let closeMedia = () => {};
  function reportWindowLoadError(error: unknown) {
    diagnostics?.recordError('window', error);
    const detail = error instanceof Error ? error.message : String(error);
    notices.report('windowLoadFailed', detail);
  }
  function reportInputShapeError(error: unknown) {
    const detail = error instanceof Error ? error.message : String(error);
    notices.report('inputShapeFailed', detail);
  }
  function reportShowTrayError(error: unknown) {
    diagnostics?.recordError('application', error);
    const detail = error instanceof Error ? error.message : String(error);
    notices.report('showTrayFailed', detail, 'warning', 'settings');
  }

  const presentApplication = async () => {
    if (!startupComplete || !diagnostics) return;
    if (!getMainWindow())
      createWindow(
        diagnostics,
        reportWindowLoadError,
        (await stateStore.load()).settings.displayId,
      );
    openSettingsWindow();
  };
  app.on('second-instance', presentApplication);
  app.on('activate', presentApplication);

  const diagnosticsService = await initializeDiagnostics(userDataPath);
  diagnostics = diagnosticsService;
  diagnosticsService.record({
    kind: 'app-start',
    appVersion: app.getVersion(),
    electronVersion: process.versions.electron ?? '',
    chromiumVersion: process.versions.chrome ?? '',
    nodeVersion: process.versions.node ?? process.version,
    platform: process.platform,
    architecture: process.arch,
    osRelease: os.release(),
  });
  installFatalErrorMonitor(diagnosticsService);
  installChildProcessDiagnostics(app, diagnosticsService);
  let graphicsSignature = '';
  app.on('gpu-info-update', () => {
    const gpu = app.getGPUFeatureStatus();
    const event = {
      kind: 'graphics-status' as const,
      hardwareAcceleration: app.isHardwareAccelerationEnabled(),
      compositing: gpu.gpu_compositing,
      rasterization: gpu.rasterization,
      webgl: gpu.webgl,
    };
    const signature = JSON.stringify(event);
    if (signature === graphicsSignature) return;
    graphicsSignature = signature;
    diagnosticsService.record(event);
  });

  let stateStore: ReturnType<typeof createAppStateStore>;
  try {
    stateStore = createAppStateStore(userDataPath);
  } catch (error) {
    diagnosticsService.recordError('application', error);
    await app.whenReady();
    const text = messages[resolveLocale('system', app.getLocale())];
    await dialog.showMessageBox({
      type: 'error',
      title: app.getName(),
      message: text.stateLoadFailed,
      detail: `${error instanceof Error ? error.message : String(error)}\n${userDataPath}`,
      buttons: [text.quit],
    });
    app.quit();
    return;
  }
  const secretStore = createSecretStore(stateStore, {
    isAsyncEncryptionAvailable: () => safeStorage.isAsyncEncryptionAvailable(),
    encryptStringAsync: (value) => safeStorage.encryptStringAsync(value),
    decryptStringAsync: (value) => safeStorage.decryptStringAsync(value),
    ...(process.platform === 'linux'
      ? {
          getSelectedStorageBackend: () => safeStorage.getSelectedStorageBackend(),
        }
      : {}),
  });
  const aiConfiguration = createAIConfigurationService(stateStore, secretStore);
  const assistant = createAssistantService(
    aiConfiguration,
    () => app.getVersion(),
    (error) => diagnosticsService.recordError('assistant', error),
  );
  // macOS honors showTray; Windows/Linux always keep the tray.
  const applyShowTray = (visible: boolean) => {
    try {
      setTrayVisible(process.platform === 'darwin' ? visible : true);
    } catch (error) {
      reportShowTrayError(error);
    }
  };

  void app.whenReady().then(async () => {
    installAppMenu(openSettingsWindow);
    installBackgroundImageProtocol(
      async () => (await stateStore.load()).settings.backgroundImage,
      (error) => diagnosticsService.recordError('application', error),
    );
    diagnosticsService.record({ kind: 'app-lifecycle', phase: 'ready' });
    diagnosticsService.record({
      kind: 'platform-capabilities',
      packaged: app.isPackaged,
      displayCount: screen.getAllDisplays().length,
      scaleFactors: screen.getAllDisplays().map((display) => display.scaleFactor),
      mediaBackend:
        process.platform === 'win32'
          ? 'winrt'
          : process.platform === 'darwin'
            ? 'applescript'
            : 'mpris',
      inputBackend:
        process.platform === 'linux'
          ? 'x11-shape'
          : process.platform === 'win32'
            ? 'windows-cursor-region'
            : 'mouse-passthrough',
      sessionType:
        process.platform === 'win32'
          ? 'windows'
          : process.platform === 'darwin'
            ? 'macos'
            : process.env.XDG_SESSION_TYPE === 'wayland'
              ? 'wayland'
              : process.env.DISPLAY
                ? 'x11'
                : 'unknown',
      // Never probe the OS keychain while starting. On macOS isAsyncEncryptionAvailable() reads (and
      // creates) the "Safe Storage" keychain item, so macOS asks for the login password on every
      // launch. Availability is checked when a key is actually saved or read
      // (secretStore.ensureSecureStorage) and a failure is reported to Settings from there.
      secureStorage:
        process.platform === 'linux'
          ? safeStorage.getSelectedStorageBackend() !== 'basic_text'
          : true,
    });
    powerMonitor.on('suspend', () =>
      diagnosticsService.record({ kind: 'app-lifecycle', phase: 'suspend' }),
    );
    powerMonitor.on('resume', () =>
      diagnosticsService.record({ kind: 'app-lifecycle', phase: 'resume' }),
    );
    screen.on('display-added', () =>
      diagnosticsService.record({
        kind: 'app-lifecycle',
        phase: 'display-added',
      }),
    );
    screen.on('display-removed', () =>
      diagnosticsService.record({
        kind: 'app-lifecycle',
        phase: 'display-removed',
      }),
    );
    screen.on('display-metrics-changed', () =>
      diagnosticsService.record({
        kind: 'app-lifecycle',
        phase: 'display-metrics-changed',
      }),
    );
    let initialState = defaultAppState;
    try {
      initialState = await stateStore.load();
    } catch (error) {
      diagnosticsService.recordError('application', error);
      notices.report(
        'stateLoadFailed',
        error instanceof Error ? error.message : String(error),
        'error',
        'system',
      );
    }

    applyShowTray(initialState.settings.showTray);
    configureSettingsWindow({
      diagnostics: diagnosticsService,
      onLoadError: reportWindowLoadError,
    });
    closeMedia = registerIPC({
      stateStore,
      secretStore,
      assistant,
      weather: createWeatherService(secretStore),
      aiConfiguration,
      notices,
      diagnostics: diagnosticsService,
      applyShowTray,
    });
    initializeLinuxInputShape(diagnosticsService, reportInputShapeError);
    createWindow(diagnosticsService, reportWindowLoadError, initialState.settings.displayId);
    startupComplete = true;
    presentApplication();
  });

  app.on('before-quit', () => {
    diagnosticsService.record({ kind: 'app-lifecycle', phase: 'before-quit' });
    closeInputConnection();
    closeMedia();
    stateStore.close();
  });
  app.on('window-all-closed', () => {
    diagnosticsService.record({
      kind: 'app-lifecycle',
      phase: 'window-all-closed',
    });
    // Island stays alive in the background; quit only when nothing is left to interact with.
    if (
      shouldQuitAfterLastWindow({
        platform: process.platform,
        hasTray: hasTray(),
      })
    )
      app.quit();
  });
}
