import { app, clipboard, ipcMain, screen, shell } from 'electron';
import type { IpcMainInvokeEvent, WebContents } from 'electron';
import { isLocale } from '../shared/i18n';
import type { AppState, AppStatePatch } from '../shared/appState';
import { noticeAreaForCode, noticeAreaForPatch } from '../shared/contracts';
import type { AppNotice, InputRect, NoticeArea, NoticeCode } from '../shared/contracts';
import { isAppStatePatch } from '../shared/appState';
import type { InvokeMap, QuickAppTarget } from '../shared/contracts';
import { QuickAppTargetSchema } from '../shared/contracts';
import { setTrayLocale } from './tray';
import type { DiagnosticsService } from './services/diagnostics';
import { applyWindowInputRegion, getMainWindow, markRendererReady, showMainWindow } from './window';
import {
  broadcastToRegisteredWindows,
  getWebContentsForRole,
  getWindowRole,
  isAllowedIpcSender,
} from './windowRoles';
import type { WindowRole } from './windowRoles';
import { openSettingsWindow } from './settingsWindow';
import { getWindowBoundsForDisplay } from './windowBounds';
import { discoverApps, buildAppCache, launchApp, launchQuickApp } from './services/apps';
import { setAutoLaunch } from './services/autostart';
import { createMediaService } from './services/media';
import { getBluetoothStatus } from './services/getBluetoothStatus';
import { getCameraStatus } from './services/getCameraStatus';
import { getMicrophoneStatus } from './services/getMicrophoneStatus';
import { serializeDiagnosticError } from '../shared/diagnostics';
import type { AssistantEvent } from '../shared/contracts';

interface StateStore {
  load(): Promise<AppState>;
  update(patch: AppStatePatch): Promise<AppState>;
}

interface SecretStore {
  setApiKey(value: string): Promise<void>;
  hasApiKey(): Promise<boolean>;
}

interface AssistantService {
  start(
    requestId: string,
    prompt: string,
    send: (event: AssistantEvent) => void,
  ): Promise<string | null>;
  cancel(requestId: string): void;
}

interface NoticeService {
  report(
    code: NoticeCode,
    detail?: string,
    severity?: AppNotice['severity'],
    area?: NoticeArea,
  ): void;
  rendererReady(role: WindowRole): void;
}

interface IPCServices {
  stateStore: StateStore;
  secretStore: SecretStore;
  assistant: AssistantService;
  notices: NoticeService;
  diagnostics: Pick<DiagnosticsService, 'openFolder' | 'recordError' | 'record'>;
  applyShowTray(visible: boolean): void;
}

function getText(value: unknown, field: string, maximum = 4096) {
  if (typeof value !== 'string' || value.length > maximum) {
    throw new TypeError(`${field} must be a string of at most ${maximum} characters`);
  }
  return value;
}

function channelErrorCode(channel: keyof InvokeMap): NoticeCode | null {
  switch (channel) {
    case 'get-app-bootstrap':
      return 'stateLoadFailed';
    case 'update-app-state':
      return 'stateSaveFailed';
    case 'save-api-key':
      return 'secretStorageUnavailable';
    case 'set-auto-launch':
      return 'autoLaunchFailed';
    case 'open-diagnostics-folder':
      return 'diagnosticsFolderOpenFailed';
    default:
      return null;
  }
}

function handle<K extends keyof InvokeMap>(
  services: IPCServices,
  channel: K,
  listener: (
    event: IpcMainInvokeEvent,
    ...args: InvokeMap[K]['args']
  ) => InvokeMap[K]['result'] | Promise<InvokeMap[K]['result']>,
) {
  const polled = [
    'get-system-media',
    'get-bluetooth-status',
    'get-camera-status',
    'get-microphone-status',
    'read-clipboard-text',
  ].includes(channel);
  let observed = false;
  let failure: { signature: string; loggedAt: number; suppressed: number } | undefined;
  ipcMain.handle(channel, async (event, ...args: unknown[]) => {
    if (!isAllowedIpcSender(event.sender)) throw new Error('Unknown IPC sender');
    const started = performance.now();
    try {
      const result = await listener(event, ...(args as InvokeMap[K]['args']));
      if (!polled || !observed || failure) {
        services.diagnostics.record({
          kind: 'ipc-operation',
          channel,
          phase: failure ? 'recovered' : 'completed',
          elapsedMs: Math.round(performance.now() - started),
          ...(failure ? { repeated: failure.suppressed } : {}),
        });
      }
      observed = true;
      failure = undefined;
      return result;
    } catch (error) {
      const summary = serializeDiagnosticError(error);
      const signature = JSON.stringify(summary);
      const now = Date.now();
      if (polled && failure?.signature === signature && now - failure.loggedAt < 60_000) {
        failure.suppressed += 1;
      } else {
        services.diagnostics.record({
          kind: 'ipc-operation',
          channel,
          phase: 'failed',
          elapsedMs: Math.round(performance.now() - started),
          error: summary,
          ...(failure ? { repeated: failure.suppressed } : {}),
        });
        failure = { signature, loggedAt: now, suppressed: 0 };
      }
      const code = channelErrorCode(channel);
      if (code) {
        const detail = error instanceof Error ? error.message : String(error);
        const area =
          channel === 'update-app-state' && isAppStatePatch(args[0])
            ? noticeAreaForPatch(args[0])
            : noticeAreaForCode(code);
        services.notices.report(code, detail, 'error', area);
      }
      throw error;
    }
  });
}

function isInputRect(value: unknown): value is InputRect {
  if (!value || typeof value !== 'object') return false;
  const rect = value as Partial<InputRect>;
  return (
    [rect.x, rect.y, rect.width, rect.height, rect.scaleFactor].every(
      (field) => typeof field === 'number' && Number.isFinite(field),
    ) &&
    rect.width! > 0 &&
    rect.height! > 0 &&
    rect.scaleFactor! > 0
  );
}

export function registerIPC(services: IPCServices) {
  let previewActive = false;
  let previewOwner: WebContents | null = null;
  const publishPreview = (active: boolean) => {
    previewActive = active;
    getWebContentsForRole('island')?.send('island-preview-changed', active);
    const window = getMainWindow();
    if (window && !window.webContents.isDestroyed()) {
      window.webContents.setBackgroundThrottling(!active && process.platform !== 'win32');
    }
    getWebContentsForRole('settings')?.setBackgroundThrottling(!active);
    if (active) showMainWindow();
  };
  const media = createMediaService(undefined, (error) =>
    services.diagnostics.recordError('media', error),
  );
  handle(services, 'get-app-bootstrap', async (_event) => ({
    state: await services.stateStore.load(),
    hasApiKey: await services.secretStore.hasApiKey(),
  }));
  handle(services, 'open-diagnostics-folder', (_event) => services.diagnostics.openFolder());
  handle(services, 'get-island-preview', () => previewActive);
  handle(services, 'set-island-preview', (event, active) => {
    if (getWindowRole(event.sender) !== 'settings' || typeof active !== 'boolean')
      throw new TypeError('Invalid settings preview request');
    if (previewOwner !== event.sender) {
      previewOwner = event.sender;
      event.sender.once('destroyed', () => {
        if (previewOwner === event.sender) {
          previewOwner = null;
          publishPreview(false);
        }
      });
    }
    publishPreview(active);
  });
  handle(services, 'read-clipboard-text', (_event) => clipboard.readText());
  handle(services, 'write-clipboard-text', (_event, text) =>
    clipboard.writeText(getText(text, 'Clipboard text', 1_000_000)),
  );
  handle(services, 'update-app-state', async (_event, patch) => {
    if (!isAppStatePatch(patch)) throw new TypeError('Invalid app state update');
    const state = await services.stateStore.update(patch);
    if (typeof patch.settings?.showTray === 'boolean') {
      services.applyShowTray(patch.settings.showTray);
    }
    broadcastToRegisteredWindows('app-state-changed', state);
    return state;
  });
  handle(services, 'save-api-key', (_event, key) => {
    return services.secretStore.setApiKey(getText(key, 'API key', 8192));
  });
  handle(services, 'launch-quick-app', async (_event, id) => {
    const quickAppId = getText(id, 'Quick app ID', 128);
    const state = await services.stateStore.load();
    const appTarget = state.quickApps.find((quickApp) => quickApp.id === quickAppId)?.target;
    if (!appTarget) throw new TypeError('Quick app is not configured');
    const target: QuickAppTarget = QuickAppTargetSchema.parse(appTarget);
    await launchQuickApp(target);
  });
  handle(services, 'discover-apps', (_event, query) =>
    discoverApps(getText(query, 'Application query', 256)),
  );
  handle(services, 'renderer-ready', (event) => {
    const role = getWindowRole(event.sender);
    if (role === 'island') {
      markRendererReady();
      publishPreview(previewActive);
      services.notices.rendererReady('island');
    } else if (role === 'settings') {
      services.notices.rendererReady('settings');
    }
  });
  handle(services, 'start-assistant', (_event, requestId, prompt) => {
    const id = getText(requestId, 'Request ID', 128);
    const userPrompt = getText(prompt, 'Prompt', 30000);
    return services.assistant.start(id, userPrompt, (payload) => {
      getMainWindow()?.webContents.send('assistant-event', payload);
    });
  });
  handle(services, 'cancel-assistant', (_event, requestId) => {
    services.assistant.cancel(getText(requestId, 'Request ID', 128));
  });
  handle(services, 'get-system-locale', (_event) => app.getLocale());
  handle(services, 'set-ui-locale', (_event, locale) => {
    if (!isLocale(locale)) throw new TypeError('Invalid locale');
    setTrayLocale(locale);
  });
  handle(services, 'set-ignore-mouse-events', (_event, ignore, forward) => {
    if (typeof ignore !== 'boolean' || typeof forward !== 'boolean') {
      throw new TypeError('Invalid mouse passthrough options');
    }
    const window = getMainWindow();
    if (process.platform === 'darwin' && window) window.setIgnoreMouseEvents(ignore, { forward });
  });
  ipcMain.on('set-window-input-shape', (event, rect: unknown) => {
    if (!isAllowedIpcSender(event.sender) || !isInputRect(rect)) return;
    try {
      applyWindowInputRegion(rect);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      services.notices.report('inputShapeFailed', detail);
    }
  });
  handle(services, 'focus-window', (_event) => {
    showMainWindow(true);
  });
  handle(services, 'open-external', async (_event, url) => {
    const value = getText(url, 'URL', 8192);
    await shell.openExternal(value);
  });
  handle(services, 'launch-app', (_event, name) => launchApp(getText(name, 'Application name')));
  handle(services, 'build-app-cache', (_event) => buildAppCache());
  handle(services, 'get-system-media', (_event) => media.getSnapshot());
  handle(services, 'open-media-session', (_event, id) =>
    media.openSession(getText(id, 'Media session', 512)),
  );
  handle(services, 'select-media-session', (_event, id) => {
    if (id !== null) getText(id, 'Media session', 512);
    return media.selectSession(id);
  });
  handle(services, 'get-bluetooth-status', (_event) => getBluetoothStatus());
  handle(services, 'get-camera-status', (_event) => getCameraStatus());
  handle(services, 'get-microphone-status', (_event) => getMicrophoneStatus());
  handle(services, 'control-system-media', (_event, command, sessionId) => {
    if (!['previous', 'playpause', 'next'].includes(command)) {
      throw new TypeError('Invalid media command');
    }
    return media.control(command, getText(sessionId, 'Media session', 512));
  });
  handle(services, 'get-displays', (_event) =>
    screen.getAllDisplays().map((display) => ({
      id: display.id,
      label: display.label || `Display ${display.id}`,
      bounds: display.bounds,
    })),
  );
  handle(services, 'set-display', (_event, id) => {
    if (typeof id !== 'string' && typeof id !== 'number') throw new TypeError('Invalid display');
    const target =
      screen.getAllDisplays().find((display) => String(display.id) === String(id)) ||
      screen.getPrimaryDisplay();
    getMainWindow()?.setBounds(getWindowBoundsForDisplay(target));
    showMainWindow();
  });
  handle(services, 'set-auto-launch', async (_event, enable) => {
    if (typeof enable !== 'boolean') throw new TypeError('Expected boolean');
    await setAutoLaunch(enable);
  });
  handle(services, 'open-settings', (_event) => {
    openSettingsWindow();
  });
  handle(services, 'quit-app', (_event) => {
    app.quit();
  });
  return () => {
    previewOwner = null;
    publishPreview(false);
    media.close();
  };
}
