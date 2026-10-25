import { DiagnosticError } from '../../shared/diagnosticError';
import { chmod, mkdir, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

import { app, crashReporter, shell } from 'electron';
import log from 'electron-log/main';

import {
  RendererDiagnosticContextSchema,
  serializeDiagnosticError,
  type DiagnosticErrorSource,
  type DiagnosticEvent,
  type RendererDiagnosticContext,
  type RendererDiagnostic,
  type SettingsDiagnosticContext,
  type RendererViewContext,
} from '../../shared/diagnostics';
export { serializeDiagnosticError } from '../../shared/diagnostics';
import {
  formatDiagnosticEvent,
  formatDiagnosticRecord,
  formatError,
  formatContext,
  type DiagnosticRecord,
  type DiagnosticLevel,
} from '../../shared/diagnosticFormat';
import { createDiagnosticSourceMapper } from './diagnosticSourceMaps';
import { currentDiagnosticOperation } from './diagnosticScope';

const DIAGNOSTICS_DIRECTORY = 'diagnostics';
const CRASH_DIRECTORY = 'crashes';
const LOG_FILE = 'ripple-next.log';
const LOG_LIMIT_BYTES = 5 * 1024 * 1024;
const CRASH_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const CRASH_MAX_FILES = 10;
export interface DiagnosticsService {
  record(event: DiagnosticEvent): void;
  recordError(source: DiagnosticErrorSource, error: unknown): void;
  receiveRenderer(event: RendererDiagnostic, role: 'island' | 'settings'): void;
  setRendererContext(context: RendererDiagnosticContext): void;
  getRendererContext(role: 'island' | 'settings'): RendererViewContext | undefined;
  /** Compact runtime snapshot for AI prompt injection (`{{diagnose}}`). */
  promptSnapshot(): string;
  openFolder(): Promise<void>;
}

export async function pruneCrashReports(directory: string, now: number): Promise<void> {
  const files: Array<{ path: string; modifiedAt: number }> = [];
  async function collect(folder: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(folder, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const filePath = path.join(folder, entry.name);
      if (entry.isDirectory()) await collect(filePath);
      else if (entry.isFile() && entry.name.endsWith('.dmp')) {
        try {
          const file = await stat(filePath);
          files.push({ path: filePath, modifiedAt: file.mtimeMs });
        } catch {
          // Crashpad can move a report during retention.
        }
      }
    }
  }
  await collect(directory);

  const expiration = now - CRASH_MAX_AGE_MS;
  const recent: typeof files = [];
  for (const file of files) {
    if (file.modifiedAt < expiration) {
      await rm(file.path, { force: true }).catch(() => {});
    } else {
      recent.push(file);
    }
  }

  recent.sort((left, right) => right.modifiedAt - left.modifiedAt);
  for (const file of recent.slice(CRASH_MAX_FILES)) {
    await rm(file.path, { force: true }).catch(() => {});
  }
}

export async function initializeDiagnostics(userDataPath: string): Promise<DiagnosticsService> {
  const directory = path.join(userDataPath, DIAGNOSTICS_DIRECTORY);
  const crashDirectory = path.join(directory, CRASH_DIRECTORY);
  const logPath = path.join(directory, LOG_FILE);
  const mapFrame = createDiagnosticSourceMapper(path.resolve(__dirname, '..'));
  let loggerReady = false;
  const sessionId = randomUUID().slice(0, 8);
  const requestedLevel =
    process.argv.find((value) => value.startsWith('--ripple-log-level='))?.split('=')[1] ??
    process.env.RIPPLE_LOG_LEVEL ??
    'info';
  const levels: DiagnosticLevel[] = ['error', 'warn', 'info', 'debug', 'trace'];
  const threshold = levels.includes(requestedLevel as DiagnosticLevel)
    ? levels.indexOf(requestedLevel as DiagnosticLevel)
    : 2;
  let rendererContext: RendererDiagnosticContext | undefined;
  let settingsContext: SettingsDiagnosticContext | undefined;
  let appStart: Extract<DiagnosticEvent, { kind: 'app-start' }> | undefined;
  let platformCapabilities: Extract<DiagnosticEvent, { kind: 'platform-capabilities' }> | undefined;
  let graphicsStatus: Extract<DiagnosticEvent, { kind: 'graphics-status' }> | undefined;

  const write = (record: DiagnosticRecord, forceStderr = false) => {
    if (levels.indexOf(record.level) > threshold) return;
    const operation = currentDiagnosticOperation();
    const details = [
      ...(operation
        ? [
            `Operation #${operation.id}: ${operation.channel}; source=${operation.sender ?? 'main'}${operation.fields.length ? '; fields=' + operation.fields.join(', ') : ''}`,
          ]
        : []),
      ...(record.details ?? []),
    ];
    const line = formatDiagnosticRecord({ ...record, details: details.map(mapFrame) }, sessionId);
    if (!forceStderr && loggerReady) {
      try {
        log[record.level === 'trace' ? 'silly' : record.level](line);
        return;
      } catch {
        /* stderr remains available after logger failure. */
      }
    }
    process.stderr.write(line + '\n');
  };
  const recordError = (source: DiagnosticErrorSource, error: unknown) =>
    write({
      level: 'error',
      scope: 'main/' + source,
      message: 'Operation failed',
      details: formatError(serializeDiagnosticError(error)),
    });
  try {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await mkdir(crashDirectory, { recursive: true, mode: 0o700 });
    if (process.platform === 'linux') {
      await chmod(directory, 0o700);
      await chmod(crashDirectory, 0o700);
    }
  } catch (error) {
    write(
      {
        level: 'error',
        scope: 'diagnostics',
        message: 'Cannot create diagnostics directory',
        details: formatError(serializeDiagnosticError(error)),
      },
      true,
    );
  }

  try {
    log.transports.file.fileName = LOG_FILE;
    log.transports.file.maxSize = LOG_LIMIT_BYTES;
    log.transports.file.resolvePathFn = () => logPath;
    log.transports.file.level = 'silly';
    log.transports.file.format = '{text}';
    log.transports.console.level = 'silly';
    log.transports.console.format = '{text}';
    log.initialize({ preload: false });
    loggerReady = true;
  } catch (error) {
    write(
      {
        level: 'error',
        scope: 'diagnostics',
        message: 'File logger initialization failed',
        details: formatError(serializeDiagnosticError(error)),
      },
      true,
    );
  }

  try {
    app.setPath('crashDumps', crashDirectory);
    crashReporter.start({ productName: 'Ripple Next', uploadToServer: false });
  } catch (error) {
    write({
      level: 'error',
      scope: 'diagnostics',
      message: 'Crash reporter initialization failed',
      details: formatError(serializeDiagnosticError(error)),
    });
  }

  try {
    await pruneCrashReports(crashDirectory, Date.now());
  } catch (error) {
    recordError('diagnostics', error);
  }

  const REPEAT_WINDOW_MS = 60_000;
  let burst:
    | {
        channel: string;
        signature: string;
        sender?: 'island' | 'settings';
        count: number;
        loggedAt: number;
      }
    | undefined;
  const flushBurst = () => {
    if (!burst || burst.count === 0) {
      burst = undefined;
      return;
    }
    const pending = burst;
    burst = undefined;
    write({
      level: 'debug',
      scope: `main/${pending.sender ?? 'ipc'}`,
      message: `updates suppressed: ${pending.count} (${pending.signature})`,
    });
  };
  const diagnostics: DiagnosticsService = {
    record(event) {
      if (event.kind === 'app-start') appStart = event;
      if (event.kind === 'platform-capabilities') platformCapabilities = event;
      if (event.kind === 'graphics-status') graphicsStatus = event;
      if (
        event.kind === 'ipc-operation' &&
        event.phase === 'completed' &&
        event.significance === 'continuous'
      ) {
        const signature = event.facts?.join(' ') || event.outcome || event.channel;
        const now = Date.now();
        if (
          burst &&
          burst.channel === event.channel &&
          burst.signature === signature &&
          now - burst.loggedAt < REPEAT_WINDOW_MS
        ) {
          burst.count += 1;
          return;
        }
        flushBurst();
        burst = {
          channel: event.channel,
          signature,
          sender: event.sender,
          count: 0,
          loggedAt: now,
        };
      } else flushBurst();
      const record = formatDiagnosticEvent(event);
      const role =
        event.kind === 'ipc-operation' && event.phase === 'failed'
          ? event.sender
          : event.kind === 'window-lifecycle' &&
              ['unresponsive', 'did-fail-load'].includes(event.event)
            ? event.role
            : undefined;
      if (role) {
        const context = diagnostics.getRendererContext(role);
        if (context) record.details = [...(record.details ?? []), formatContext(context)];
      }
      write(record);
    },
    recordError,
    receiveRenderer(event, role) {
      if (event.kind === 'renderer-context') diagnostics.setRendererContext(event.context);
      if (event.kind === 'settings-context') settingsContext = event.context;
      const record = formatDiagnosticEvent(event);
      const context = diagnostics.getRendererContext(role);
      if (event.kind === 'renderer-error' && context)
        record.details = [...(record.details ?? []), formatContext(context)];
      write({
        ...record,
        scope: 'renderer/' + role + '/' + (event.kind === 'renderer-error' ? event.source : 'view'),
      });
    },
    setRendererContext(context) {
      const parsed = RendererDiagnosticContextSchema.safeParse(context);
      if (!parsed.success) return;
      rendererContext = parsed.data;
    },
    getRendererContext(role) {
      const context = role === 'island' ? rendererContext : settingsContext;
      return context ? structuredClone(context) : undefined;
    },
    promptSnapshot() {
      const lines: string[] = [`session ${sessionId}`];
      for (const event of [appStart, platformCapabilities, graphicsStatus]) {
        if (!event) continue;
        const record = formatDiagnosticEvent(event);
        lines.push(record.message);
        if (record.details?.length) lines.push(...record.details);
      }
      if (rendererContext) lines.push(formatContext(rendererContext));
      if (settingsContext) lines.push(formatContext(settingsContext));
      return lines.join('\n');
    },
    async openFolder() {
      const error = await shell.openPath(directory);
      if (error) throw new DiagnosticError('Could not open the diagnostics directory');
    },
  };

  return diagnostics;
}
