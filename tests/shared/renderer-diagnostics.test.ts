/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const report = vi.fn();

import {
  installRendererErrorHandlers,
  recordRendererError,
  rendererRootErrorHandlers,
} from '../../src/renderer/lib/diagnostics';

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: { reportDiagnostic: report },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(window, 'electronAPI');
});

describe('renderer diagnostics', () => {
  it('records window errors and rejected promises without their messages', () => {
    const dispose = installRendererErrorHandlers(window);
    window.dispatchEvent(
      new ErrorEvent('error', {
        message: 'PRIVATE_ERROR_MESSAGE',
        error: new Error('PRIVATE_ERROR_MESSAGE'),
      }),
    );
    const rejection = new Event('unhandledrejection');
    Object.defineProperty(rejection, 'reason', {
      value: 'PRIVATE_REJECTION_VALUE',
    });
    window.dispatchEvent(rejection);

    expect(report).toHaveBeenCalledTimes(2);
    const lines = report.mock.calls.map(([event]) => JSON.stringify(event));
    expect(lines.some((line) => line.includes('PRIVATE_ERROR_MESSAGE'))).toBe(false);
    expect(lines.some((line) => line.includes('PRIVATE_REJECTION_VALUE'))).toBe(false);
    expect(lines.map((line) => JSON.parse(line).kind)).toEqual([
      'renderer-error',
      'renderer-error',
    ]);

    dispose();
    window.dispatchEvent(new ErrorEvent('error', { message: 'AFTER_DISPOSE' }));
    expect(report).toHaveBeenCalledTimes(2);
  });

  it('records React root failures without free-form error messages', () => {
    const privateError = new Error('PRIVATE_COMPONENT_TEXT');
    rendererRootErrorHandlers.onCaughtError(privateError);
    rendererRootErrorHandlers.onUncaughtError(privateError);
    rendererRootErrorHandlers.onRecoverableError(privateError);

    expect(report).toHaveBeenCalledTimes(3);
    const lines = report.mock.calls.map(([event]) => JSON.stringify(event));
    expect(lines.every((line) => line.includes('PRIVATE_COMPONENT_TEXT') === false)).toBe(true);
    expect(lines.map((line) => JSON.parse(line).kind)).toEqual([
      'renderer-error',
      'renderer-error',
      'renderer-error',
    ]);
  });

  it('coalesces repeated polling failures and reports how many were suppressed', () => {
    let now = 1_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const error = new Error('PRIVATE_POLLING_ERROR');

    recordRendererError('clipboard', error);
    recordRendererError('clipboard', error);
    now += 60_000;
    recordRendererError('clipboard', error);

    expect(report).toHaveBeenCalledTimes(2);
    const secondRecord = report.mock.calls[1]?.[0];
    expect(secondRecord.repeated).toBe(1);
    expect(JSON.stringify(report.mock.calls)).not.toContain('PRIVATE_POLLING_ERROR');
  });
});
