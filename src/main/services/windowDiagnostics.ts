import type { WindowRole } from '../windowRoles';
import type { DiagnosticsService } from './diagnostics';

const rendererExitReasons = new Set([
  'clean-exit',
  'abnormal-exit',
  'killed',
  'crashed',
  'oom',
  'launch-failed',
  'integrity-failure',
]);

interface DiagnosticEventEmitter {
  on(event: string, listener: (...args: unknown[]) => void): unknown;
}

export interface WindowDiagnosticSource extends DiagnosticEventEmitter {
  id: number;
  webContents: DiagnosticEventEmitter & { id: number };
}

export function recordRendererReady(
  window: WindowDiagnosticSource,
  diagnostics: DiagnosticsService,
  role: WindowRole,
): void {
  diagnostics.record({
    kind: 'window-lifecycle',
    role,
    event: 'renderer-ready',
    windowId: window.id,
    webContentsId: window.webContents.id,
  });
}

export function attachWindowDiagnostics(
  window: WindowDiagnosticSource,
  diagnostics: DiagnosticsService,
  role: WindowRole,
): void {
  const windowId = window.id;
  const webContentsId = window.webContents.id;
  const recordWindowEvent = (
    event: 'ready-to-show' | 'show' | 'hide' | 'focus' | 'blur' | 'closed',
  ) => {
    diagnostics.record({ kind: 'window-lifecycle', role, event, windowId, webContentsId });
  };

  for (const event of ['ready-to-show', 'show', 'hide', 'focus', 'blur', 'closed'] as const) {
    window.on(event, () => recordWindowEvent(event));
  }
  for (const event of ['did-start-loading', 'dom-ready', 'did-finish-load'] as const) {
    window.webContents.on(event, () =>
      diagnostics.record({ kind: 'window-lifecycle', role, event, windowId, webContentsId }),
    );
  }
  window.webContents.on('unresponsive', () => {
    diagnostics.record({
      kind: 'window-lifecycle',
      role,
      event: 'unresponsive',
      windowId,
      webContentsId,
    });
  });
  window.webContents.on('responsive', () => {
    diagnostics.record({
      kind: 'window-lifecycle',
      role,
      event: 'responsive',
      windowId,
      webContentsId,
    });
  });
  window.webContents.on('did-fail-load', (_event, errorCode, description, _url, isMainFrame) => {
    diagnostics.record({
      kind: 'window-lifecycle',
      role,
      event: 'did-fail-load',
      windowId,
      webContentsId,
      ...(typeof errorCode === 'number' ? { errorCode } : {}),
      ...(typeof description === 'string' && /^ERR_[A-Z0-9_]{1,64}$/.test(description)
        ? { errorName: description }
        : {}),
      ...(typeof isMainFrame === 'boolean' ? { isMainFrame } : {}),
    });
  });
  window.webContents.on('render-process-gone', (_event, details) => {
    const context = diagnostics.getRendererContext(role);
    const reason =
      details &&
      typeof details === 'object' &&
      'reason' in details &&
      typeof details.reason === 'string' &&
      rendererExitReasons.has(details.reason)
        ? details.reason
        : 'unknown';
    const exitCode =
      details &&
      typeof details === 'object' &&
      'exitCode' in details &&
      Number.isInteger(details.exitCode)
        ? (details.exitCode as number)
        : 0;
    diagnostics.record({
      kind: 'renderer-exit',
      role,
      reason,
      exitCode,
      windowId,
      webContentsId,
      ...(context ? { context } : {}),
    });
  });
}
