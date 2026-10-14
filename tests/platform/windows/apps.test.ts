import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({ execFile: vi.fn(), spawn: vi.fn(), openPath: vi.fn() }));
vi.mock('node:child_process', () => ({
  execFile: mock.execFile,
  exec: vi.fn(),
  spawn: mock.spawn,
}));
vi.mock('electron', () => ({ shell: { openPath: mock.openPath, openExternal: vi.fn() } }));
import { launchWindows, launchWindowsEntry } from '../../../src/main/platform/windows/apps';
import { runPowerShell } from '../../../src/main/platform/windows/powershell';
import { serializeDiagnosticError } from '../../../src/shared/diagnostics';

beforeEach(() => vi.resetAllMocks());

describe('Windows app launch', () => {
  it('keeps encoded scripts and native stderr out of visible command errors', async () => {
    mock.execFile.mockImplementation((_exe, _args, _options, callback) => {
      callback(
        Object.assign(new Error('Command failed: private-encoded-script'), {
          code: 'ETIMEDOUT',
          killed: true,
          signal: 'SIGTERM',
        }),
        '',
        'private-native-output',
      );
    });
    const error = await runPowerShell('private-script').catch((value) => value);
    expect(error.message).toBe('System command failed: powershell.exe (ETIMEDOUT)');
    expect(serializeDiagnosticError(error)).toMatchObject({ code: 'ETIMEDOUT', killed: true });
    expect(JSON.stringify(serializeDiagnosticError(error))).not.toContain('private');
  });
  it('preserves a Windows native error code while excluding command output from diagnostics', async () => {
    mock.execFile.mockImplementation((_exe, _args, _options, callback) => {
      callback(
        Object.assign(new Error('private command output'), { code: 1 }),
        '',
        'RIPPLE_WINDOWS_ERROR -2147024894\r\n',
      );
    });
    const error = await runPowerShell('missing-operation').catch((value) => value);
    expect(serializeDiagnosticError(error)).toMatchObject({
      code: -2147024894,
      cause: { code: 1 },
    });
    expect(JSON.stringify(serializeDiagnosticError(error))).not.toContain('private');
  });
  it('accepts successful shell activation without judging Explorer exit status', async () => {
    mock.execFile.mockImplementation((exe, _args, options, callback) => {
      const complete = callback ?? options;
      complete(
        exe.toLowerCase().endsWith('explorer.exe') ? new Error('Command failed') : null,
        '',
        '',
      );
    });
    await expect(
      launchWindowsEntry('shell:AppsFolder\\OpenAI.Codex_2p2nqsd0c76g0!App'),
    ).resolves.toBeUndefined();
    expect(mock.execFile.mock.calls[0][1]).toEqual(
      expect.arrayContaining(['-NoProfile', '-NonInteractive', '-EncodedCommand']),
    );
    expect(mock.execFile.mock.calls[0][2]).toMatchObject({ windowsHide: true });
  });

  it('propagates actual shell activation failures', async () => {
    mock.execFile.mockImplementation((_exe, _args, options, callback) => {
      (callback ?? options)(Object.assign(new Error('Missing target'), { code: 1 }), '', '');
    });
    await expect(launchWindowsEntry('shell:AppsFolder\\Missing.Package!App')).rejects.toThrow();
  });

  it('does not report an executable as launched before spawn confirmation', async () => {
    const child = Object.assign(new EventEmitter(), { unref: vi.fn() });
    mock.spawn.mockReturnValue(child);
    const result = launchWindowsEntry('C:\\Program Files\\App\\app.exe');
    child.emit('error', Object.assign(new Error('not found'), { code: 'ENOENT' }));
    await expect(result).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('makes the legacy workflow launch await native failures', async () => {
    mock.spawn.mockImplementation(() => {
      const child = Object.assign(new EventEmitter(), { unref: vi.fn() });
      queueMicrotask(() =>
        child.emit('error', Object.assign(new Error('File not found'), { code: 'ENOENT' })),
      );
      return child;
    });
    await expect(launchWindows('C:\\Missing\\app.exe')).rejects.toThrow();
  });
});
