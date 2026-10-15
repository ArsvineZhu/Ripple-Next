import { z } from 'zod';
import type { InvokeMap, IslandMode } from './contracts';
import { PageIdSchema } from './pages';

const DimensionsSchema = z
  .object({
    width: z.number().finite().nonnegative(),
    height: z.number().finite().nonnegative(),
  })
  .strict();

export const RendererDiagnosticContextSchema = z
  .object({
    tabId: PageIdSchema,
    mode: z.enum(['still', 'quick', 'large']),
    expanded: z.boolean(),
    asked: z.boolean(),
    answerCharacters: z.number().int().nonnegative(),
    viewport: DimensionsSchema,
    inputRegion: DimensionsSchema,
  })
  .strict();
export { serializeDiagnosticError } from './diagnosticError';
import { DiagnosticErrorSchema, type SerializedDiagnosticError } from './diagnosticError';
export type { SerializedDiagnosticError } from './diagnosticError';

export type RendererDiagnosticContext = {
  tabId: string;
  mode: IslandMode;
  expanded: boolean;
  asked: boolean;
  answerCharacters: number;
  viewport: { width: number; height: number };
  inputRegion: { width: number; height: number };
};

const SettingsDiagnosticContextSchema = z
  .object({
    category: z.string().regex(/^[a-zA-Z][\w-]{0,32}$/),
    page: z
      .string()
      .regex(/^[a-zA-Z][\w-]{0,32}$/)
      .nullable(),
  })
  .strict();
export type SettingsDiagnosticContext = z.infer<typeof SettingsDiagnosticContextSchema>;
export type RendererViewContext = RendererDiagnosticContext | SettingsDiagnosticContext;

export type DiagnosticErrorSource =
  | 'application'
  | 'renderer'
  | 'window'
  | 'linux-input'
  | 'assistant'
  | 'media'
  | 'device'
  | 'clipboard'
  | 'overview'
  | 'diagnostics';

export type DiagnosticEvent =
  | {
      kind: 'graphics-status';
      hardwareAcceleration: boolean;
      compositing: string;
      rasterization: string;
      webgl: string;
    }
  | {
      kind: 'windows-input-region';
      state: 'passthrough' | 'capturing';
      width: number;
      height: number;
    }
  | {
      kind: 'ipc-operation';
      channel: keyof InvokeMap;
      phase: 'started' | 'completed' | 'failed' | 'failed-repeat' | 'recovered';
      operationId?: number;
      sender?: 'island' | 'settings';
      fields?: string[];
      outcome?: string;
      elapsedMs: number;
      error?: SerializedDiagnosticError;
      repeated?: number;
    }
  | {
      kind: 'platform-capabilities';
      packaged: boolean;
      displayCount: number;
      scaleFactors: number[];
      mediaBackend: 'winrt' | 'mpris' | 'applescript';
      inputBackend: 'mouse-passthrough' | 'x11-shape' | 'windows-cursor-region';
      sessionType: 'wayland' | 'x11' | 'windows' | 'macos' | 'unknown';
      secureStorage: boolean;
    }
  | {
      kind: 'app-lifecycle';
      phase:
        | 'ready'
        | 'before-quit'
        | 'window-all-closed'
        | 'suspend'
        | 'resume'
        | 'display-added'
        | 'display-removed'
        | 'display-metrics-changed';
    }
  | {
      kind: 'app-start';
      appVersion: string;
      electronVersion: string;
      chromiumVersion: string;
      nodeVersion: string;
      platform: string;
      architecture: string;
      osRelease: string;
    }
  | {
      kind: 'window-lifecycle';
      event:
        | 'created'
        | 'did-start-loading'
        | 'dom-ready'
        | 'did-finish-load'
        | 'ready-to-show'
        | 'show'
        | 'hide'
        | 'focus'
        | 'blur'
        | 'unresponsive'
        | 'responsive'
        | 'closed'
        | 'did-fail-load'
        | 'renderer-ready';
      role?: 'island' | 'settings';
      windowId: number;
      webContentsId: number;
      errorCode?: number;
      errorName?: string;
      isMainFrame?: boolean;
    }
  | {
      kind: 'renderer-exit';
      reason: string;
      exitCode: number;
      role?: 'island' | 'settings';
      windowId: number;
      webContentsId: number;
      context?: RendererViewContext;
    }
  | {
      kind: 'child-process-exit';
      processType: string;
      reason: string;
      exitCode: number;
    }
  | {
      kind: 'main-exception';
      origin: 'uncaughtException' | 'unhandledRejection';
      error: SerializedDiagnosticError;
    }
  | {
      kind: 'linux-input-shape';
      state: 'initialized' | 'ready' | 'failed' | 'updated';
      width?: number;
      height?: number;
    }
  | {
      kind: 'renderer-context';
      context: RendererDiagnosticContext;
    };

export const RendererDiagnosticSchema = z.discriminatedUnion('kind', [
  z
    .object({ kind: z.literal('settings-context'), context: SettingsDiagnosticContextSchema })
    .strict(),
  z
    .object({ kind: z.literal('renderer-context'), context: RendererDiagnosticContextSchema })
    .strict(),
  z
    .object({
      kind: z.literal('renderer-error'),
      source: z.enum(['renderer', 'assistant', 'media', 'device', 'clipboard', 'overview']),
      error: DiagnosticErrorSchema,
      repeated: z.number().int().nonnegative().optional(),
      componentFrames: z.array(z.string().max(512)).max(12).optional(),
    })
    .strict(),
]);
export type RendererDiagnostic = z.infer<typeof RendererDiagnosticSchema>;
