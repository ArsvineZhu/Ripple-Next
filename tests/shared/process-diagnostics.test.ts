import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { DiagnosticsService } from '../../src/main/services/diagnostics';
import {
  installChildProcessDiagnostics,
  installFatalErrorMonitor,
} from '../../src/main/services/processDiagnostics';

describe('process diagnostics', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('records uncaught exceptions without installing a fatal-error handler', () => {
    const record = vi.fn();
    const diagnostics = { record } as unknown as DiagnosticsService;
    const uncaughtCount = process.listenerCount('uncaughtException');
    const rejectionCount = process.listenerCount('unhandledRejection');
    const stop = installFatalErrorMonitor(diagnostics);

    try {
      const emitter = process as unknown as {
        emit(event: string, ...args: unknown[]): boolean;
      };
      emitter.emit(
        'uncaughtExceptionMonitor',
        new Error('prompt must not be logged'),
        'unhandledRejection',
      );

      expect(record).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'main-exception',
          origin: 'unhandledRejection',
          error: expect.objectContaining({ type: 'Error' }),
        }),
      );
      expect(JSON.stringify(record.mock.calls)).not.toContain('prompt must not be logged');
      expect(process.listenerCount('uncaughtException')).toBe(uncaughtCount);
      expect(process.listenerCount('unhandledRejection')).toBe(rejectionCount);
    } finally {
      stop();
    }
  });

  it('records Electron child process type, reason, and exit code', () => {
    const app = new EventEmitter();
    const record = vi.fn();
    const diagnostics = { record } as unknown as DiagnosticsService;
    const stop = installChildProcessDiagnostics(app, diagnostics);

    app.emit('child-process-gone', {}, { type: 'GPU', reason: 'crashed', exitCode: 7 });

    expect(record).toHaveBeenCalledWith({
      kind: 'child-process-exit',
      processType: 'GPU',
      reason: 'crashed',
      exitCode: 7,
    });
    stop();
    app.emit('child-process-gone', {}, { type: 'Utility', reason: 'crashed', exitCode: 8 });
    expect(record).toHaveBeenCalledOnce();
  });

  it('does not record arbitrary child-process fields', () => {
    const app = new EventEmitter();
    const record = vi.fn();
    const stop = installChildProcessDiagnostics(app, { record } as unknown as DiagnosticsService);

    app.emit(
      'child-process-gone',
      {},
      {
        type: 'Renderer',
        reason: 'sensitive-value',
        exitCode: 3,
        commandLine: ['--secret=token'],
      },
    );

    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'child-process-exit', reason: 'unknown' }),
    );
    expect(JSON.stringify(record.mock.calls)).not.toContain('sensitive-value');
    expect(JSON.stringify(record.mock.calls)).not.toContain('token');
    stop();
  });
});
