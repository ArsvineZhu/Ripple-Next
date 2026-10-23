import { RendererDiagnosticSchema } from '../shared/diagnostics';
import type { AppNotice, AssistantEvent, ElectronAPI, InvokeMap } from '../shared/contracts';
import type { AppState } from '../shared/appState';
import { NativeScrollSchema, ScrollGestureStartSchema } from '../shared/contracts';
import { contextBridge, ipcRenderer } from 'electron';

function invoke<K extends keyof InvokeMap>(
  channel: K,
  ...args: InvokeMap[K]['args']
): Promise<InvokeMap[K]['result']> {
  return ipcRenderer.invoke(channel, ...args);
}
const api: ElectronAPI = {
  systemEventCapabilities: {
    media: process.platform === 'win32' || process.platform === 'linux',
    devices: process.platform === 'win32' || process.platform === 'linux',
  },
  onMediaSnapshotChanged: (callback) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      snapshot: import('../shared/media').MediaSnapshot,
    ) => callback(snapshot);
    ipcRenderer.on('media-snapshot-changed', listener);
    return () => ipcRenderer.removeListener('media-snapshot-changed', listener);
  },
  onDevicesChanged: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('devices-changed', listener);
    return () => ipcRenderer.removeListener('devices-changed', listener);
  },
  reportDiagnostic: (event) => {
    const parsed = RendererDiagnosticSchema.safeParse(event);
    if (parsed.success) ipcRenderer.send('renderer-diagnostic', parsed.data);
  },
  listThirdPartyLicenses: () => invoke('list-third-party-licenses'),
  readThirdPartyLicense: (id) => invoke('read-third-party-license', id),
  aiConfigurationStatus: () => invoke('ai-configuration-status'),
  mutateAIConfiguration: (mutation) => invoke('mutate-ai-configuration', mutation),
  saveAICredential: (id, key) => invoke('save-ai-credential', id, key),
  getWeather: (preferences) => invoke('get-weather', preferences),
  saveWeatherApiKey: (key) => invoke('save-weather-api-key', key),
  showColorPicker: (initialColor) => invoke('show-color-picker', initialColor),
  openDiagnosticsFolder: () => invoke('open-diagnostics-folder'),
  readClipboardText: () => invoke('read-clipboard-text'),
  writeClipboardText: (text) => invoke('write-clipboard-text', text),
  getSystemLocale: () => invoke('get-system-locale'),
  setUILocale: (locale) => invoke('set-ui-locale', locale),
  getAppBootstrap: () => invoke('get-app-bootstrap'),
  updateAppState: (patch) => invoke('update-app-state', patch),
  setIslandPreview: (active) => invoke('set-island-preview', active),
  getIslandPreview: () => invoke('get-island-preview'),
  onIslandPreviewChanged: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, active: unknown) => {
      if (typeof active === 'boolean') callback(active);
    };
    ipcRenderer.on('island-preview-changed', listener);
    return () => ipcRenderer.removeListener('island-preview-changed', listener);
  },
  launchTargets: (targets) => invoke('launch-targets', targets),
  discoverApps: (query) => invoke('discover-apps', query),
  rendererReady: () => invoke('renderer-ready'),
  startAssistant: (requestId, prompt) => invoke('start-assistant', requestId, prompt),
  cancelAssistant: (requestId) => invoke('cancel-assistant', requestId),
  onAppNotice: (callback: (notice: AppNotice) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, notice: AppNotice) => callback(notice);
    ipcRenderer.on('app-notice', listener);
    return () => ipcRenderer.removeListener('app-notice', listener);
  },
  onAppStateChanged: (callback: (state: AppState) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: AppState) => callback(state);
    ipcRenderer.on('app-state-changed', listener);
    return () => ipcRenderer.removeListener('app-state-changed', listener);
  },
  onAssistantEvent: (callback: (event: AssistantEvent) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: AssistantEvent) =>
      callback(payload);
    ipcRenderer.on('assistant-event', listener);
    return () => ipcRenderer.removeListener('assistant-event', listener);
  },
  getNativeScrollAvailable: () => invoke('get-native-scroll-available'),
  onNativeScroll: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: unknown) => {
      const result = NativeScrollSchema.safeParse(payload);
      if (result.success) callback(result.data);
    };
    ipcRenderer.on('native-scroll', listener);
    return () => ipcRenderer.removeListener('native-scroll', listener);
  },
  onScrollGestureEnd: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: unknown) => {
      const result = ScrollGestureStartSchema.safeParse(payload);
      if (result.success) callback(result.data);
    };
    ipcRenderer.on('scroll-gesture-end', listener);
    return () => ipcRenderer.removeListener('scroll-gesture-end', listener);
  },
  onScrollGestureStart: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: unknown) => {
      const result = ScrollGestureStartSchema.safeParse(payload);
      if (result.success) callback(result.data);
    };
    ipcRenderer.on('scroll-gesture-start', listener);
    return () => ipcRenderer.removeListener('scroll-gesture-start', listener);
  },
  setIgnoreMouseEvents: (ignore, forward) => {
    return invoke('set-ignore-mouse-events', ignore, forward);
  },
  setWindowInputShape: (rect) => ipcRenderer.send('set-window-input-shape', rect),
  getSystemMedia: () => invoke('get-system-media'),
  selectMediaSession: (id) => invoke('select-media-session', id),
  openMediaSession: (id) => invoke('open-media-session', id),
  getBluetoothStatus: () => invoke('get-bluetooth-status'),
  getCameraStatus: () => invoke('get-camera-status'),
  getMicrophoneStatus: () => invoke('get-microphone-status'),
  controlSystemMedia: (command, sessionId) => invoke('control-system-media', command, sessionId),
  openExternal: (url) => invoke('open-external', url),
  getDisplays: () => invoke('get-displays'),
  focusWindow: () => invoke('focus-window'),
  openSettings: () => invoke('open-settings'),
  quitApp: () => invoke('quit-app'),
  platform: process.platform,
};
contextBridge.exposeInMainWorld('electronAPI', api);
