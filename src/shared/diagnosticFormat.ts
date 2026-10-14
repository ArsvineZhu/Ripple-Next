import type {
  DiagnosticEvent,
  RendererDiagnostic,
  RendererViewContext,
  SerializedDiagnosticError,
} from './diagnostics';
export type DiagnosticLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';
export interface DiagnosticRecord {
  level: DiagnosticLevel;
  scope: string;
  message: string;
  details?: string[];
}
export function formatError(error: SerializedDiagnosticError, depth = 0): string[] {
  const fields = [error.code, error.syscall, error.signal, error.killed ? 'terminated' : undefined]
    .filter((value) => value !== undefined)
    .join(', ');
  const lines = [
    `${depth ? 'Caused by: ' : ''}${error.type}: ${error.message ?? 'Unexpected failure'}${fields ? ` [${fields}]` : ''}`,
  ];
  for (const problem of error.problems ?? []) lines.push(`${problem.path}: ${problem.reason}`);
  lines.push(...error.frames);
  if (error.cause) lines.push(...formatError(error.cause, depth + 1));
  return lines;
}
export function formatContext(context: RendererViewContext) {
  if ('category' in context)
    return `Settings category=${context.category}; page=${context.page ?? 'category root'}`;
  return `Island page=${context.tabId} mode=${context.mode}; viewport=${context.viewport.width}×${context.viewport.height}; region=${Math.round(context.inputRegion.width)}×${Math.round(context.inputRegion.height)}; assistant=${context.asked ? 'active' : 'idle'} answer=${context.answerCharacters} chars`;
}
export function formatDiagnosticEvent(
  event: DiagnosticEvent | RendererDiagnostic,
): DiagnosticRecord {
  switch (event.kind) {
    case 'app-start':
      return {
        level: 'info',
        scope: 'app',
        message: `Ripple Next ${event.appVersion} starting on ${event.platform}/${event.architecture}`,
        details: [
          `OS ${event.osRelease}; Electron ${event.electronVersion}; Chromium ${event.chromiumVersion}; Node ${event.nodeVersion}`,
        ],
      };
    case 'app-lifecycle':
      return {
        level: event.phase === 'display-metrics-changed' ? 'debug' : 'info',
        scope: 'app',
        message: event.phase.replaceAll('-', ' '),
      };
    case 'graphics-status':
      return {
        level: 'debug',
        scope: 'graphics',
        message: `hardware acceleration=${event.hardwareAcceleration}; compositing=${event.compositing}; rasterization=${event.rasterization}; WebGL=${event.webgl}`,
      };
    case 'platform-capabilities':
      return {
        level: 'info',
        scope: 'platform',
        message: `${event.packaged ? 'packaged' : 'development'}; ${event.displayCount} display(s); scale=${event.scaleFactors.join(', ')}; session=${event.sessionType}`,
        details: [
          `media=${event.mediaBackend}; input=${event.inputBackend}; secure storage=${event.secureStorage ? 'available' : 'unavailable'}`,
        ],
      };
    case 'ipc-operation': {
      const quiet = [
        'get-weather',
        'get-system-media',
        'get-bluetooth-status',
        'get-camera-status',
        'get-microphone-status',
        'read-clipboard-text',
        'set-ignore-mouse-events',
        'get-island-preview',
      ];
      const action = [
        'update-app-state',
        'mutate-ai-configuration',
        'save-ai-credential',
        'save-weather-api-key',
        'launch-targets',
        'start-assistant',
        'open-settings',
        'quit-app',
        'control-system-media',
        'select-media-session',
        'open-media-session',
        'open-external',
      ];
      const level =
        event.phase === 'failed'
          ? 'error'
          : event.phase === 'recovered'
            ? 'info'
            : event.phase === 'started' ||
                event.phase === 'failed-repeat' ||
                quiet.includes(event.channel)
              ? 'trace'
              : action.includes(event.channel) &&
                  (event.channel !== 'update-app-state' ||
                    event.fields?.some((field) =>
                      [
                        'theme',
                        'uiFont',
                        'language',
                        'autoLaunch',
                        'displayId',
                        'tasks',
                        'workflows',
                        'quickApps',
                      ].includes(field),
                    ))
                ? 'info'
                : 'debug';
      return {
        level,
        scope: `main/${event.sender ?? 'ipc'}`,
        message: `${event.operationId ? '#' + event.operationId + ' ' : ''}${event.channel} ${event.phase} (${event.elapsedMs} ms)${event.outcome ? ': ' + event.outcome : ''}`,
        details: [
          ...(event.fields?.length ? ['Changed fields: ' + event.fields.join(', ')] : []),
          ...(event.repeated ? ['Repeated failures suppressed: ' + event.repeated] : []),
          ...(event.error ? formatError(event.error) : []),
        ],
      };
    }
    case 'window-lifecycle':
      return {
        level:
          event.event === 'did-fail-load'
            ? 'error'
            : event.event === 'unresponsive'
              ? 'warn'
              : ['created', 'closed', 'renderer-ready'].includes(event.event)
                ? 'info'
                : 'debug',
        scope: `window/${event.role ?? 'unknown'}#${event.windowId}`,
        message: `${event.event.replaceAll('-', ' ')} (webContents ${event.webContentsId})${event.errorCode !== undefined ? '; load error ' + (event.errorName ?? '') + ' ' + event.errorCode : ''}`,
      };
    case 'renderer-exit':
      return {
        level: event.reason === 'clean-exit' ? 'debug' : 'error',
        scope: `window/${event.role ?? 'unknown'}#${event.windowId}`,
        message: `Renderer exited: ${event.reason}; exit code ${event.exitCode}`,
        details: event.context ? [formatContext(event.context)] : [],
      };
    case 'child-process-exit':
      return {
        level: event.reason === 'clean-exit' ? 'debug' : 'error',
        scope: 'process',
        message: `${event.processType} exited: ${event.reason}; exit code ${event.exitCode}`,
      };
    case 'main-exception':
      return {
        level: 'error',
        scope: 'main',
        message: event.origin,
        details: formatError(event.error),
      };
    case 'windows-input-region':
      return {
        level: 'trace',
        scope: 'input/windows',
        message: `${event.state}; region=${event.width}×${event.height}`,
      };
    case 'linux-input-shape':
      return {
        level: event.state === 'failed' ? 'error' : event.state === 'updated' ? 'trace' : 'debug',
        scope: 'input/linux',
        message: `shape ${event.state}${event.width !== undefined ? '; region=' + event.width + '×' + event.height : ''}`,
      };
    case 'settings-context':
      return { level: 'trace', scope: 'renderer/settings', message: formatContext(event.context) };
    case 'renderer-context':
      return { level: 'trace', scope: 'renderer/island', message: formatContext(event.context) };
    case 'renderer-error':
      return {
        level: 'error',
        scope: `renderer/${event.source}`,
        message: 'Operation failed',
        details: [
          ...formatError(event.error),
          ...(event.componentFrames?.length
            ? ['React component tree:', ...event.componentFrames]
            : []),
          ...(event.repeated ? ['Repeated failures suppressed: ' + event.repeated] : []),
        ],
      };
  }
}
export function formatDiagnosticRecord(
  record: DiagnosticRecord,
  session: string,
  now = new Date(),
) {
  const time = now.toISOString().replace('T', ' ').replace('Z', ' UTC');
  return `${time} ${record.level.toUpperCase().padEnd(5)} [${record.scope}] [session ${session}] ${record.message}${record.details?.length ? '\n' + record.details.map((line) => '  ' + line).join('\n') : ''}`;
}
