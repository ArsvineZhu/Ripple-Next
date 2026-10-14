import type { Application, LaunchTarget, LaunchResult } from './launch';
import type { Locale } from './i18n';
import type { WeatherSnapshot, WeatherPreferences } from './weather';
import type { AIMutation } from './aiConfiguration';
import type { LicenseMetadata, LicenseRecord } from './licenses';
import type { AppState, AppStatePatch } from './appState';
import { z } from 'zod';
export interface MediaTrack {
  name: string;
  artist: string;
  album?: string;
  artwork_url?: string | null;
  state: string;
  source: string;
}
export interface MediaSession extends MediaTrack {
  id: string;
  playerName: string;
  state: 'playing' | 'paused' | 'stopped' | 'unknown';
  capabilities: {
    previous: boolean | null;
    play: boolean | null;
    pause: boolean | null;
    next: boolean | null;
    toggle: boolean | null;
  };
  isCurrent?: boolean;
  stale?: boolean;
}
export type MediaError =
  | 'mediaReadFailed'
  | 'mediaSessionGone'
  | 'mediaCommandUnsupported'
  | 'mediaCommandFailed'
  | 'mediaOpenFailed';
export interface MediaSnapshot {
  sessions: MediaSession[];
  activeSessionId: string | null;
  manualSessionId: string | null;
  status: 'ready' | 'idle' | 'error';
  lastSuccessfulReadAt: number | null;
  error: MediaError | null;
}
export interface MediaOperationResult {
  snapshot: MediaSnapshot;
  error: MediaError | null;
}
export interface DisplayInfo {
  id: number;
  label: string;
  bounds: { x: number; y: number; width: number; height: number };
}
export interface InputRect {
  x: number;
  y: number;
  width: number;
  height: number;
  scaleFactor: number;
}
export type MediaCommand = 'previous' | 'playpause' | 'next';
export type IslandMode = 'still' | 'quick' | 'large';
export const ScrollGestureStartSchema = z
  .object({ at: z.number().finite().nonnegative() })
  .strict();
export type ScrollGestureStart = z.infer<typeof ScrollGestureStartSchema>;
export type NoticeCode =
  | 'appLaunchFailed'
  | 'autoLaunchFailed'
  | 'showTrayFailed'
  | 'stateSaveFailed'
  | 'stateLoadFailed'
  | 'diagnosticsFolderOpenFailed'
  | 'colorPickerFailed'
  | 'inputShapeFailed'
  | 'windowLoadFailed'
  | 'missingApiKey'
  | 'invalidAISettings'
  | 'aiRequestFailed'
  | 'noAiResponse'
  | 'invalidQuickApp'
  | 'secretStorageUnavailable'
  | 'invalidSearchUrlTemplate'
  | 'invalidSearchTarget'
  | 'searchOpenFailed'
  | 'unknownError';

export type NoticeArea =
  'assistant' | 'browser-search' | 'quick-apps' | 'settings' | 'system' | 'tasks' | 'workflows';

export function noticeAreaForCode(code: NoticeCode): NoticeArea {
  switch (code) {
    case 'appLaunchFailed':
      return 'workflows';
    case 'missingApiKey':
    case 'invalidAISettings':
    case 'aiRequestFailed':
    case 'noAiResponse':
      return 'assistant';
    case 'invalidQuickApp':
      return 'quick-apps';
    case 'invalidSearchUrlTemplate':
    case 'invalidSearchTarget':
    case 'searchOpenFailed':
      return 'browser-search';
    case 'autoLaunchFailed':
    case 'showTrayFailed':
    case 'stateSaveFailed':
    case 'diagnosticsFolderOpenFailed':
    case 'colorPickerFailed':
    case 'secretStorageUnavailable':
      return 'settings';
    case 'stateLoadFailed':
    case 'inputShapeFailed':
    case 'windowLoadFailed':
    case 'unknownError':
      return 'system';
  }
}

export function noticeAreaForPatch(patch: AppStatePatch): NoticeArea {
  if ('tasks' in patch) return 'tasks';
  if ('workflows' in patch) return 'workflows';
  if ('quickApps' in patch) return 'quick-apps';
  return 'settings';
}

export interface AppNotice {
  id: string;
  severity: 'warning' | 'error';
  code: NoticeCode;
  area: NoticeArea;
  detail?: string;
}
export type AssistantEvent =
  | { requestId: string; kind: 'delta'; content: string }
  | { requestId: string; kind: 'done' }
  | { requestId: string; kind: 'error'; code: NoticeCode; detail?: string };
interface AppBootstrap {
  state: AppState;
  hasWeatherApiKey: boolean;
}
export interface InvokeMap {
  'list-third-party-licenses': { args: []; result: LicenseMetadata[] };
  'read-third-party-license': { args: [id: string]; result: LicenseRecord };
  'ai-configuration-status': { args: []; result: Record<number, boolean> };
  'mutate-ai-configuration': { args: [mutation: AIMutation]; result: AppState };
  'save-ai-credential': { args: [id: number, key: string]; result: Record<number, boolean> };
  'get-weather': { args: [preferences: WeatherPreferences]; result: WeatherSnapshot };
  'save-weather-api-key': { args: [key: string]; result: void };
  'get-app-bootstrap': { args: []; result: AppBootstrap };
  'open-diagnostics-folder': { args: []; result: void };
  'show-color-picker': { args: [initialColor: string]; result: string | null };
  'read-clipboard-text': { args: []; result: string };
  'write-clipboard-text': { args: [text: string]; result: void };
  'update-app-state': { args: [patch: AppStatePatch]; result: AppState };
  'set-island-preview': { args: [active: boolean]; result: void };
  'get-island-preview': { args: []; result: boolean };
  'launch-targets': { args: [targets: LaunchTarget[]]; result: LaunchResult };
  'discover-apps': { args: [query: string]; result: Application[] };
  'renderer-ready': { args: []; result: void };
  'start-assistant': {
    args: [requestId: string, prompt: string];
    result: string | null;
  };
  'cancel-assistant': { args: [requestId: string]; result: void };
  'get-system-locale': { args: []; result: string };
  'set-ui-locale': { args: [locale: Locale]; result: void };
  'set-ignore-mouse-events': {
    args: [ignore: boolean, forward: boolean];
    result: void;
  };
  'get-system-media': { args: []; result: MediaSnapshot };
  'select-media-session': {
    args: [id: string | null];
    result: MediaOperationResult;
  };
  'open-media-session': { args: [id: string]; result: MediaOperationResult };
  'get-bluetooth-status': { args: []; result: boolean };
  'get-camera-status': { args: []; result: boolean };
  'get-microphone-status': { args: []; result: boolean };
  'control-system-media': {
    args: [command: MediaCommand, sessionId: string];
    result: MediaOperationResult;
  };
  'open-external': { args: [url: string]; result: void };
  'get-displays': { args: []; result: DisplayInfo[] };
  'focus-window': { args: []; result: void };
  'open-settings': { args: []; result: void };
  'quit-app': { args: []; result: void };
}
export interface ElectronAPI {
  listThirdPartyLicenses(): Promise<LicenseMetadata[]>;
  readThirdPartyLicense(id: string): Promise<LicenseRecord>;
  aiConfigurationStatus(): Promise<Record<number, boolean>>;
  mutateAIConfiguration(mutation: AIMutation): Promise<AppState>;
  saveAICredential(id: number, key: string): Promise<Record<number, boolean>>;
  getWeather(preferences: WeatherPreferences): Promise<WeatherSnapshot>;
  saveWeatherApiKey(key: string): Promise<void>;
  showColorPicker(initialColor: string): Promise<string | null>;
  getAppBootstrap(): Promise<AppBootstrap>;
  openDiagnosticsFolder(): Promise<void>;
  readClipboardText(): Promise<string>;
  writeClipboardText(text: string): Promise<void>;
  updateAppState(patch: AppStatePatch): Promise<AppState>;
  setIslandPreview(active: boolean): Promise<void>;
  getIslandPreview(): Promise<boolean>;
  onIslandPreviewChanged(callback: (active: boolean) => void): () => void;
  launchTargets(targets: LaunchTarget[]): Promise<LaunchResult>;
  discoverApps(query: string): Promise<Application[]>;
  rendererReady(): Promise<void>;
  startAssistant(requestId: string, prompt: string): Promise<string | null>;
  cancelAssistant(requestId: string): Promise<void>;
  onAppNotice(callback: (notice: AppNotice) => void): () => void;
  onAppStateChanged(callback: (state: AppState) => void): () => void;
  onAssistantEvent(callback: (event: AssistantEvent) => void): () => void;
  onScrollGestureStart(callback: (event: ScrollGestureStart) => void): () => void;
  getSystemLocale(): Promise<string>;
  setUILocale(locale: Locale): Promise<void>;
  platform: string;
  setIgnoreMouseEvents(ignore: boolean, forward: boolean): Promise<void>;
  setWindowInputShape(rect: InputRect): void;
  getSystemMedia(): Promise<MediaSnapshot>;
  selectMediaSession(id: string | null): Promise<MediaOperationResult>;
  openMediaSession(id: string): Promise<MediaOperationResult>;
  getBluetoothStatus(): Promise<boolean>;
  getCameraStatus(): Promise<boolean>;
  getMicrophoneStatus(): Promise<boolean>;
  controlSystemMedia(command: MediaCommand, sessionId: string): Promise<MediaOperationResult>;
  openExternal(url: string): Promise<void>;
  getDisplays(): Promise<DisplayInfo[]>;
  focusWindow(): Promise<void>;
  openSettings(): Promise<void>;
  quitApp(): Promise<void>;
}
