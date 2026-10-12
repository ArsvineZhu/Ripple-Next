import { mkdir, mkdtemp, readdir, rm, stat, utimes, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => {
  const fileTransport = {
    fileName: 'main.log',
    maxSize: 1024 * 1024,
    resolvePathFn: vi.fn(),
  };
  return {
    app: {
      setPath: vi.fn(),
    },
    crashReporter: {
      start: vi.fn(),
    },
    shell: {
      openPath: vi.fn(),
    },
    logger: {
      initialize: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      transports: { file: fileTransport },
      hooks: [] as Array<(message: unknown) => unknown>,
    },
  };
});

vi.mock('electron', () => ({
  app: mock.app,
  crashReporter: mock.crashReporter,
  shell: mock.shell,
}));

vi.mock('electron-log/main', () => ({ default: mock.logger }));

import {
  initializeDiagnostics,
  pruneCrashReports,
  serializeDiagnosticError,
} from '../src/main/services/diagnostics';
import type { RendererDiagnosticContext } from '../src/shared/diagnostics';

const temporaryDirectories: string[] = [];

async function makeTemporaryDirectory() {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'ripple-next-diagnostics-'));
  temporaryDirectories.push(directory);
  return directory;
}

beforeEach(() => {
  vi.clearAllMocks();
  mock.logger.transports.file.fileName = 'main.log';
  mock.logger.transports.file.maxSize = 1024 * 1024;
  mock.logger.hooks.length = 0;
});

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })),
  );
  vi.restoreAllMocks();
});

describe('local diagnostics', () => {
  it('keeps system error codes and causes without leaking multiline command output', () => {
    const cause = Object.assign(new Error('private command arguments'), {
      code: 'ENOENT',
      syscall: 'spawn',
    });
    const error = Object.assign(new Error('operation failed', { cause }), {
      code: 1,
      killed: true,
    });
    error.stack =
      'Error: failed\nAuthorization: private-token\n#< CLIXML\n    at run (/app/main.js:2:1)';
    const result = serializeDiagnosticError(error);
    expect(result).toMatchObject({
      code: 1,
      killed: true,
      cause: { code: 'ENOENT', syscall: 'spawn' },
    });
    expect(result.frames).toEqual(['    at run (/app/main.js:2:1)']);
    expect(JSON.stringify(result)).not.toMatch(/private|CLIXML|Authorization/);
  });

  it('retains nested Crashpad dumps without removing its metadata', async () => {
    const directory = await makeTemporaryDirectory();
    await mkdir(path.join(directory, 'reports'));
    await writeFile(path.join(directory, 'settings.dat'), 'metadata');
    const expired = path.join(directory, 'reports', 'expired.dmp');
    await writeFile(expired, 'dump');
    await utimes(expired, 0, 0);
    await pruneCrashReports(directory, Date.now());
    expect(await readdir(path.join(directory, 'reports'))).toEqual([]);
    expect(await readdir(directory)).toContain('settings.dat');
  });
  it('serializeDiagnosticError omits the message and keeps stack frames', () => {
    const error = new TypeError('Authorization: secret-token');
    error.stack =
      'TypeError: Authorization: secret-token\n    at request (/app/assistant.js:4:2)\n    at tick (/app/main.js:8:1)';

    const summary = serializeDiagnosticError(error);

    expect(summary).toEqual({
      type: 'TypeError',
      frames: ['    at request (/app/assistant.js:4:2)', '    at tick (/app/main.js:8:1)'],
    });
    expect(JSON.stringify(summary)).not.toContain('secret-token');
    expect(serializeDiagnosticError('private rejected value')).toEqual({
      type: 'string',
      frames: [],
    });
  });

  it('pruneCrashReports removes entries older than 30 days and keeps the 10 newest', async () => {
    const directory = await makeTemporaryDirectory();
    const now = Date.parse('2026-10-06T00:00:00Z');
    const oldFile = path.join(directory, 'expired.dmp');
    await writeFile(oldFile, 'dump');
    await utimes(
      oldFile,
      (now - 31 * 24 * 60 * 60 * 1000) / 1000,
      (now - 31 * 24 * 60 * 60 * 1000) / 1000,
    );

    for (let age = 1; age <= 12; age += 1) {
      const file = path.join(directory, `recent-${age}.dmp`);
      await writeFile(file, 'dump');
      const modified = (now - age * 60 * 1000) / 1000;
      await utimes(file, modified, modified);
    }

    await pruneCrashReports(directory, now);

    const remaining = (await readdir(directory)).sort();
    expect(remaining).toHaveLength(10);
    expect(remaining).toEqual(
      Array.from({ length: 10 }, (_, index) => `recent-${index + 1}.dmp`).sort(),
    );
  });

  it('pruneCrashReports treats an unavailable directory as non-fatal', async () => {
    const parent = await makeTemporaryDirectory();
    const notADirectory = path.join(parent, 'file');
    await writeFile(notADirectory, 'not a crash directory');

    await expect(pruneCrashReports(notADirectory, Date.now())).resolves.toBeUndefined();
  });

  it('initializeDiagnostics keeps upload disabled and tolerates logger or crash-reporter setup errors', async () => {
    const userDataPath = await makeTemporaryDirectory();
    const diagnostics = await initializeDiagnostics(userDataPath);

    expect(mock.app.setPath).toHaveBeenCalledWith(
      'crashDumps',
      path.join(userDataPath, 'diagnostics', 'crashes'),
    );
    expect(mock.crashReporter.start).toHaveBeenCalledWith(
      expect.objectContaining({ uploadToServer: false }),
    );
    expect(mock.app.setPath.mock.invocationCallOrder[0]).toBeLessThan(
      mock.crashReporter.start.mock.invocationCallOrder[0],
    );
    expect(mock.logger.initialize).toHaveBeenCalledOnce();
    expect(mock.logger.transports.file.fileName).toBe('ripple-next.log');
    expect(mock.logger.transports.file.maxSize).toBe(5 * 1024 * 1024);
    expect(mock.logger.transports.file.resolvePathFn({}, {})).toBe(
      path.join(userDataPath, 'diagnostics', 'ripple-next.log'),
    );
    if (process.platform === 'linux') {
      expect((await stat(path.join(userDataPath, 'diagnostics'))).mode & 0o777).toBe(0o700);
      expect((await stat(path.join(userDataPath, 'diagnostics', 'crashes'))).mode & 0o777).toBe(
        0o700,
      );
    }
    mock.shell.openPath.mockResolvedValueOnce('');
    await diagnostics.openFolder();
    expect(mock.shell.openPath).toHaveBeenCalledWith(path.join(userDataPath, 'diagnostics'));

    mock.logger.initialize.mockImplementationOnce(() => {
      throw new Error('logger startup failure');
    });
    mock.crashReporter.start.mockImplementationOnce(() => {
      throw new Error('crash reporter startup failure');
    });
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    await expect(initializeDiagnostics(userDataPath)).resolves.toBeDefined();
    expect(stderr).toHaveBeenCalled();
  });

  it('caches only valid context events from the renderer logger', async () => {
    const diagnostics = await initializeDiagnostics(await makeTemporaryDirectory());
    const context: RendererDiagnosticContext = {
      tabId: 'assistant',
      mode: 'large',
      expanded: true,
      asked: true,
      answerCharacters: 22,
      viewport: { width: 1920, height: 1080 },
      inputRegion: { width: 500, height: 160 },
    };
    const contextHook = mock.logger.hooks[0] as (message: unknown) => unknown;
    const sendContext = (value: unknown, processType = 'renderer') =>
      contextHook({
        data: [`RIPPLE_NEXT_CONTEXT ${JSON.stringify({ context: value })}`],
        variables: { processType },
      });

    sendContext(context);
    expect(diagnostics.getRendererContext()).toEqual(context);

    sendContext({ ...context, tabId: 99 });
    sendContext({ ...context, viewport: { width: Number.NaN, height: 1080 } });
    sendContext({ ...context, extra: 'private' });
    sendContext({ ...context, tabId: 'tasks' }, 'main');

    expect(diagnostics.getRendererContext()).toEqual(context);
  });
});
