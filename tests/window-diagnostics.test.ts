import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';

import type { DiagnosticsService } from '../src/main/services/diagnostics';
import {
  attachWindowDiagnostics,
  recordRendererReady,
} from '../src/main/services/windowDiagnostics';
import type { RendererDiagnosticContext } from '../src/shared/diagnostics';

const context: RendererDiagnosticContext = {
  tabId: 'assistant',
  mode: 'large',
  expanded: true,
  asked: true,
  answerCharacters: 418,
  viewport: { width: 1920, height: 1080 },
  inputRegion: { width: 640, height: 180 },
};

function makeWindow() {
  const window = new EventEmitter() as EventEmitter & {
    id: number;
    webContents: EventEmitter & { id: number };
  };
  window.id = 31;
  window.webContents = Object.assign(new EventEmitter(), { id: 47 });
  return window;
}

describe('window diagnostics', () => {
  it('records renderer bootstrap completion with the window identifiers', () => {
    const window = makeWindow();
    const record = vi.fn();

    recordRendererReady(window, { record } as unknown as DiagnosticsService);

    expect(record).toHaveBeenCalledWith({
      kind: 'window-lifecycle',
      event: 'renderer-ready',
      windowId: 31,
      webContentsId: 47,
    });
  });

  it('records window lifecycle and load failures without URL or description', () => {
    const window = makeWindow();
    const record = vi.fn();
    const diagnostics = { record } as unknown as DiagnosticsService;

    attachWindowDiagnostics(window, diagnostics);

    for (const event of ['ready-to-show', 'show', 'hide', 'focus', 'blur', 'closed']) {
      window.emit(event);
    }
    window.webContents.emit('unresponsive');
    window.webContents.emit('responsive');
    window.webContents.emit(
      'did-fail-load',
      {},
      -105,
      'DNS_PROBE_FINISHED_NXDOMAIN with a private URL',
      'https://secret.example/path?key=hidden',
      true,
    );

    expect(record.mock.calls.map(([event]) => (event as { event: string }).event)).toEqual([
      'ready-to-show',
      'show',
      'hide',
      'focus',
      'blur',
      'closed',
      'unresponsive',
      'responsive',
      'did-fail-load',
    ]);
    expect(record).toHaveBeenCalledWith({
      kind: 'window-lifecycle',
      event: 'did-fail-load',
      errorCode: -105,
      isMainFrame: true,
      windowId: 31,
      webContentsId: 47,
    });
    expect(JSON.stringify(record.mock.calls)).not.toContain('secret.example');
    expect(JSON.stringify(record.mock.calls)).not.toContain('private URL');
  });

  it('records renderer exit reason, process identifiers, and latest Island context', () => {
    const window = makeWindow();
    const record = vi.fn();
    const diagnostics = {
      record,
      getRendererContext: vi.fn(() => context),
    } as unknown as DiagnosticsService;

    attachWindowDiagnostics(window, diagnostics);
    window.webContents.emit('render-process-gone', {}, { reason: 'crashed', exitCode: 9 });

    expect(record).toHaveBeenCalledWith({
      kind: 'renderer-exit',
      reason: 'crashed',
      exitCode: 9,
      windowId: 31,
      webContentsId: 47,
      context,
    });
    expect(diagnostics.getRendererContext).toHaveBeenCalledOnce();
  });

  it('normalizes undocumented renderer exit reasons', () => {
    const window = makeWindow();
    const record = vi.fn();
    const diagnostics = {
      record,
      getRendererContext: vi.fn(() => undefined),
    } as unknown as DiagnosticsService;
    attachWindowDiagnostics(window, diagnostics);
    window.webContents.emit('render-process-gone', {}, { reason: 'sensitive-value', exitCode: -1 });

    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'renderer-exit', reason: 'unknown', exitCode: -1 }),
    );
    expect(JSON.stringify(record.mock.calls)).not.toContain('sensitive-value');
  });
});
