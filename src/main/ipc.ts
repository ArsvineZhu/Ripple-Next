import { app, BrowserWindow, clipboard, ipcMain, screen, shell } from 'electron';
import type { IpcMainInvokeEvent, WebContents } from 'electron';
import { isLocale } from '../shared/i18n';
import type { AppState, AppStatePatch } from '../shared/appState';
import { noticeAreaForCode, noticeAreaForPatch } from '../shared/contracts';
import type { AppNotice, InputRect, NoticeArea, NoticeCode } from '../shared/contracts';
import { AppStatePatchSchema, isAppStatePatch } from '../shared/appState';
import type { InvokeMap } from '../shared/contracts';
import { LaunchTargetsSchema } from '../shared/launch';
import { setTrayLocale } from './tray';
import type { DiagnosticsService } from './services/diagnostics';
import {
  applyWindowInputRegion,
  getMainWindow,
  getNativeScrollAvailable,
  markRendererReady,
  showMainWindow,
  moveMainWindowToDisplay,
} from './window';
import {
  broadcastToRegisteredWindows,
  getWebContentsForRole,
  getWindowRole,
  isAllowedIpcSender,
} from './windowRoles';
import type { WindowRole } from './windowRoles';
import type { WeatherSnapshot, WeatherPreferences } from '../shared/weather';
import { WeatherPreferencesSchema } from '../shared/weather';
import type { createAIConfigurationService } from './ai/configuration';
import { AIMutationSchema } from '../shared/aiConfiguration';
import { listLicenses, readLicense } from './services/licenses';
import { openSettingsWindow } from './settingsWindow';
import { createAppService } from './services/apps';
import { setAutoLaunch } from './platform/autostart';
import { createMediaService } from './services/media';
import { devices } from './platform/devices';
import { RendererDiagnosticSchema, serializeDiagnosticError } from '../shared/diagnostics';
import { DiagnosticError, validationProblems } from '../shared/diagnosticError';
import { withDiagnosticOperation } from './services/diagnosticScope';
import type { AssistantEvent, AssistantResult } from '../shared/contracts';
import { RGB_HEX } from '../shared/color';
import { showNativeColorPicker } from './services/colorPicker';

interface StateStore {
  load(): Promise<AppState>;
  update(patch: AppStatePatch): Promise<AppState>;
}

interface SecretStore {
  setSecret(name: string, value: string): Promise<void>;
  hasSecret(name: string): Promise<boolean>;
}

interface AssistantService {
  start(
    requestId: string,
    prompt: string,
    send: (event: AssistantEvent) => void,
  ): Promise<AssistantResult>;
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
  aiConfiguration: ReturnType<typeof createAIConfigurationService>;
  weather: { get(preferences: WeatherPreferences): Promise<WeatherSnapshot> };
  stateStore: StateStore;
  secretStore: SecretStore;
  assistant: AssistantService;
  notices: NoticeService;
  diagnostics: Pick<
    DiagnosticsService,
    'openFolder' | 'recordError' | 'record' | 'receiveRenderer'
  >;
  applyShowTray(visible: boolean): void;
}

function getText(value: unknown, field: string, maximum = 4096) {
  if (typeof value !== 'string' || value.length > maximum) {
    throw new DiagnosticError(`${field} must be a string of at most ${maximum} characters`);
  }
  return value;
}

function channelErrorCode(channel: keyof InvokeMap): NoticeCode | null {
  switch (channel) {
    case 'get-app-bootstrap':
      return 'stateLoadFailed';
    case 'update-app-state':
      return 'stateSaveFailed';
    case 'save-weather-api-key':
    case 'save-ai-credential':
      return 'secretStorageUnavailable';
    case 'open-diagnostics-folder':
      return 'diagnosticsFolderOpenFailed';
    case 'show-color-picker':
      return 'colorPickerFailed';
    default:
      return null;
  }
}

let operationSequence = 0;
function handle<K extends keyof InvokeMap>(
  services: IPCServices,
  channel: K,
  listener: (
    event: IpcMainInvokeEvent,
    ...args: InvokeMap[K]['args']
  ) => InvokeMap[K]['result'] | Promise<InvokeMap[K]['result']>,
) {
  const polled = [
    'get-weather',
    'get-system-media',
    'get-bluetooth-status',
    'get-camera-status',
    'get-microphone-status',
    'read-clipboard-text',
  ].includes(channel);
  let failure: { signature: string; loggedAt: number; suppressed: number } | undefined;
  ipcMain.handle(channel, async (event, ...args: unknown[]) => {
    if (!isAllowedIpcSender(event.sender)) throw new DiagnosticError('Unknown IPC sender');
    const operationId = ++operationSequence;
    const sender = getWindowRole(event.sender)!;
    const patch = channel === 'update-app-state' && isAppStatePatch(args[0]) ? args[0] : null;
    const fields = patch
      ? [
          ...Object.keys(patch.settings ?? {}),
          ...['tasks', 'workflows', 'quickApps'].filter((key) => key in patch),
        ]
      : [];
    const context = { operationId, sender, fields };
    const started = performance.now();
    try {
      services.diagnostics.record({
        kind: 'ipc-operation',
        channel,
        phase: 'started',
        elapsedMs: 0,
        ...context,
      });
      const result = await withDiagnosticOperation(
        { id: operationId, channel, sender, fields },
        () => listener(event, ...(args as InvokeMap[K]['args'])),
      );
      const outcome =
        channel === 'launch-targets'
          ? (result as InvokeMap['launch-targets']['result']).failures.length
            ? 'target-failures'
            : 'launched'
          : channel === 'start-assistant'
            ? (result as AssistantResult).status
            : undefined;
      const domainError =
        channel === 'get-weather'
          ? (result as WeatherSnapshot).error
          : [
                'get-system-media',
                'control-system-media',
                'select-media-session',
                'open-media-session',
              ].includes(channel) &&
              result &&
              typeof result === 'object' &&
              'error' in result
            ? result.error
            : channel === 'start-assistant' && (result as AssistantResult).status === 'error'
              ? (result as Extract<AssistantResult, { status: 'error' }>).code
              : outcome === 'target-failures'
                ? 'One or more launch targets failed'
                : null;
      if (domainError) {
        const summary = serializeDiagnosticError(new DiagnosticError(String(domainError)));
        const signature = JSON.stringify(summary);
        const now = Date.now();
        if (
          !polled ||
          !failure ||
          failure.signature !== signature ||
          now - failure.loggedAt >= 60_000
        ) {
          services.diagnostics.record({
            kind: 'ipc-operation',
            channel,
            phase: 'failed',
            elapsedMs: Math.round(performance.now() - started),
            ...context,
            error: summary,
            ...(failure ? { repeated: failure.suppressed } : {}),
          });
          failure = { signature, loggedAt: now, suppressed: 0 };
        } else {
          failure.suppressed++;
          services.diagnostics.record({
            kind: 'ipc-operation',
            channel,
            phase: 'failed-repeat',
            elapsedMs: Math.round(performance.now() - started),
            ...context,
            repeated: failure.suppressed,
          });
        }
        return result;
      }
      {
        services.diagnostics.record({
          kind: 'ipc-operation',
          channel,
          ...context,
          ...(outcome ? { outcome } : {}),
          phase: failure ? 'recovered' : 'completed',
          elapsedMs: Math.round(performance.now() - started),
          ...(failure ? { repeated: failure.suppressed } : {}),
        });
      }
      failure = undefined;
      return result;
    } catch (error) {
      const summary = serializeDiagnosticError(error);
      const signature = JSON.stringify(summary);
      const now = Date.now();
      if (polled && failure?.signature === signature && now - failure.loggedAt < 60_000) {
        failure.suppressed += 1;
        services.diagnostics.record({
          kind: 'ipc-operation',
          channel,
          phase: 'failed-repeat',
          elapsedMs: Math.round(performance.now() - started),
          ...context,
          repeated: failure.suppressed,
        });
      } else {
        services.diagnostics.record({
          kind: 'ipc-operation',
          channel,
          ...context,
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
      throw new Error(
        summary.message ?? `Operation ${channel} failed (${summary.code ?? summary.type})`,
      );
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
  ipcMain.on('renderer-diagnostic', (event, payload: unknown) => {
    if (!isAllowedIpcSender(event.sender)) return;
    const parsed = RendererDiagnosticSchema.safeParse(payload);
    if (
      !parsed.success ||
      (parsed.data.kind === 'renderer-context' && getWindowRole(event.sender) !== 'island') ||
      (parsed.data.kind === 'settings-context' && getWindowRole(event.sender) !== 'settings')
    )
      return;
    services.diagnostics.receiveRenderer(parsed.data, getWindowRole(event.sender)!);
  });
  const apps = createAppService((error, index, kind) =>
    services.diagnostics.recordError(
      'application',
      new DiagnosticError(`Launch target #${index + 1} (${kind}) failed`, [], { cause: error }),
    ),
  );

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
  const unsubscribeMedia = media.subscribe((snapshot) => {
    for (const role of ['island', 'settings'] as const) {
      const target = getWebContentsForRole(role);
      if (target && !target.isDestroyed()) target.send('media-snapshot-changed', snapshot);
    }
  });
  media.start();
  const unsubscribeDevices =
    'subscribe' in devices
      ? devices.subscribe?.(() => {
          const target = getWebContentsForRole('island');
          if (target && !target.isDestroyed()) target.send('devices-changed');
        })
      : undefined;
  handle(services, 'get-app-bootstrap', async (_event) => ({
    state: await services.stateStore.load(),
    hasWeatherApiKey: await services.secretStore.hasSecret('weather-api-key'),
  }));
  handle(services, 'open-diagnostics-folder', (_event) => services.diagnostics.openFolder());
  handle(services, 'show-color-picker', (event, initialColor) => {
    if (
      getWindowRole(event.sender) !== 'settings' ||
      typeof initialColor !== 'string' ||
      !RGB_HEX.test(initialColor)
    )
      throw new DiagnosticError('Invalid settings color request');
    const owner = BrowserWindow.fromWebContents(event.sender);
    if (!owner || owner.isDestroyed()) return null;
    return showNativeColorPicker(owner, initialColor);
  });
  handle(services, 'get-island-preview', () => previewActive);
  handle(services, 'set-island-preview', (event, active) => {
    if (getWindowRole(event.sender) !== 'settings' || typeof active !== 'boolean')
      throw new DiagnosticError('Invalid settings preview request');
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
    const parsed = AppStatePatchSchema.safeParse(patch);
    if (!parsed.success)
      throw new DiagnosticError(
        'Invalid app state update',
        validationProblems(parsed.error.issues),
      );
    if (patch.settings?.ai)
      throw new DiagnosticError('AI configuration requires its validated editor');
    if (patch.settings?.autoLaunch !== undefined) await setAutoLaunch(patch.settings.autoLaunch);
    if (patch.settings?.displayId !== undefined) moveMainWindowToDisplay(patch.settings.displayId);
    const state = await services.stateStore.update(patch);
    if (typeof patch.settings?.showTray === 'boolean') {
      services.applyShowTray(patch.settings.showTray);
    }
    broadcastToRegisteredWindows('app-state-changed', state);
    return state;
  });
  handle(services, 'get-weather', (_event, preferences) =>
    services.weather.get(WeatherPreferencesSchema.parse(preferences)),
  );
  handle(services, 'save-weather-api-key', async (event, key) => {
    if (getWindowRole(event.sender) !== 'settings')
      throw new DiagnosticError('Credentials require Settings');
    const value = getText(key, 'Weather API key', 8192).trim();
    try {
      await services.secretStore.setSecret('weather-api-key', value);
    } catch {
      throw new DiagnosticError('OS-backed secure storage is unavailable');
    }
    const previous = await services.stateStore.load();
    const state = await services.stateStore.update({
      settings: { secretRevision: previous.settings.secretRevision + 1 },
    });
    broadcastToRegisteredWindows('app-state-changed', state);
  });
  handle(services, 'ai-configuration-status', () => services.aiConfiguration.status());
  handle(services, 'list-third-party-licenses', () => listLicenses());
  handle(services, 'read-third-party-license', (_event, id) =>
    readLicense(getText(id, 'License ID', 256)),
  );
  handle(services, 'mutate-ai-configuration', async (event, mutation) => {
    if (getWindowRole(event.sender) !== 'settings')
      throw new DiagnosticError('AI configuration requires Settings');
    const result = await services.aiConfiguration.mutate(AIMutationSchema.parse(mutation));
    broadcastToRegisteredWindows('app-state-changed', result.state);
    return result.state;
  });
  handle(services, 'save-ai-credential', async (event, id, key) => {
    if (getWindowRole(event.sender) !== 'settings')
      throw new DiagnosticError('Credentials require Settings');
    if (!Number.isInteger(id) || id < 1) throw new DiagnosticError('Invalid credential ID');
    const result = await services.aiConfiguration.saveCredential(id, getText(key, 'API key', 8192));
    broadcastToRegisteredWindows('app-state-changed', result.state);
    return result.credentialStatus;
  });
  handle(services, 'launch-targets', (_event, targets) =>
    apps.launchTargets(LaunchTargetsSchema.parse(targets)),
  );
  handle(services, 'discover-apps', (_event, query) =>
    apps.discoverApps(getText(query, 'Application query', 256)),
  );
  handle(services, 'get-native-scroll-available', () => getNativeScrollAvailable());
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
      _event.sender.send('assistant-event', payload);
    });
  });
  handle(services, 'cancel-assistant', (_event, requestId) => {
    services.assistant.cancel(getText(requestId, 'Request ID', 128));
  });
  handle(services, 'get-system-locale', (_event) => app.getLocale());
  handle(services, 'set-ui-locale', (_event, locale) => {
    if (!isLocale(locale)) throw new DiagnosticError('Invalid locale');
    setTrayLocale(locale);
  });
  handle(services, 'set-ignore-mouse-events', (_event, ignore, forward) => {
    if (typeof ignore !== 'boolean' || typeof forward !== 'boolean') {
      throw new DiagnosticError('Invalid mouse passthrough options');
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
  handle(services, 'get-system-media', (_event) => media.getSnapshot());
  handle(services, 'open-media-session', (_event, id) =>
    media.openSession(getText(id, 'Media session', 512)),
  );
  handle(services, 'select-media-session', (_event, id) => {
    if (id !== null) getText(id, 'Media session', 512);
    return media.selectSession(id);
  });
  handle(services, 'get-bluetooth-status', (_event) => devices.getBluetoothStatus());
  handle(services, 'get-camera-status', (_event) => devices.getCameraStatus());
  handle(services, 'get-microphone-status', (_event) => devices.getMicrophoneStatus());
  handle(services, 'control-system-media', (_event, command, sessionId) => {
    if (!['previous', 'playpause', 'next'].includes(command)) {
      throw new DiagnosticError('Invalid media command');
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
    unsubscribeMedia();
    unsubscribeDevices?.();
  };
}
