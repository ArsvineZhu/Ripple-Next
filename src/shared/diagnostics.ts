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
export const RENDERER_CONTEXT_PREFIX = 'RIPPLE_NEXT_CONTEXT ';

export interface SerializedDiagnosticError {
  type: string;
  frames: string[];
  code?: string | number;
  errno?: number;
  syscall?: string;
  signal?: string;
  killed?: boolean;
  cause?: SerializedDiagnosticError;
}

export function serializeDiagnosticError(error: unknown, depth = 0): SerializedDiagnosticError {
  const summary: SerializedDiagnosticError = { type: typeof error, frames: [] };
  if (error && typeof error === 'object') {
    // Error objects can have throwing getters. Diagnostics must not throw while handling them.
    try {
      const data = error as Error & {
        code?: unknown;
        errno?: unknown;
        syscall?: unknown;
        signal?: unknown;
        killed?: unknown;
      };
      const name = error instanceof Error ? error.constructor.name : 'object';
      summary.type = /^[A-Za-z_$][\w$]{0,63}$/.test(name) ? name : 'Error';
      if (error instanceof Error && typeof data.stack === 'string') {
        summary.frames = data.stack
          .split(/\r?\n/)
          .slice(1)
          .filter((frame) => /^\s+at .*(?::\d+:\d+\)?|native\)?)$/.test(frame))
          .slice(0, 24)
          .map((frame) => frame.slice(0, 512));
      }
      if (typeof data.code === 'number' && Number.isFinite(data.code)) summary.code = data.code;
      else if (typeof data.code === 'string' && /^[A-Z][A-Z0-9_]{0,63}$/.test(data.code))
        summary.code = data.code;
      if (typeof data.errno === 'number' && Number.isFinite(data.errno)) summary.errno = data.errno;
      if (typeof data.syscall === 'string' && /^[a-zA-Z]{1,32}$/.test(data.syscall))
        summary.syscall = data.syscall;
      if (typeof data.signal === 'string' && /^SIG[A-Z]{1,16}$/.test(data.signal))
        summary.signal = data.signal;
      if (typeof data.killed === 'boolean') summary.killed = data.killed;
      if (data.cause && depth < 3 && data.cause !== error)
        summary.cause = serializeDiagnosticError(data.cause, depth + 1);
    } catch {
      // Keep the fields already obtained.
    }
  }
  return summary;
}

export type RendererDiagnosticContext = {
  tabId: string;
  mode: IslandMode;
  expanded: boolean;
  asked: boolean;
  answerCharacters: number;
  viewport: { width: number; height: number };
  inputRegion: { width: number; height: number };
};

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
      phase: 'completed' | 'failed' | 'recovered';
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
      windowId: number;
      webContentsId: number;
      errorCode?: number;
      isMainFrame?: boolean;
    }
  | {
      kind: 'renderer-exit';
      reason: string;
      exitCode: number;
      windowId: number;
      webContentsId: number;
      context?: RendererDiagnosticContext;
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
      error: { type: string; frames: string[] };
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
