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
      debug: vi.fn(),
      silly: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      transports: { file: fileTransport, console: { level: 'info', format: '{text}' } },
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
} from '../../src/main/services/diagnostics';
import { DiagnosticError, validationProblems } from '../../src/shared/diagnosticError';
import { AppStatePatchSchema } from '../../src/shared/appState';
import { createDiagnosticSourceMapper } from '../../src/main/services/diagnosticSourceMaps';
import { withDiagnosticOperation } from '../../src/main/services/diagnosticScope';
import { formatDiagnosticEvent } from '../../src/shared/diagnosticFormat';
import { describeAIMutation, describeAssistantRun } from '../../src/shared/diagnosticFacts';
import type { RendererDiagnosticContext } from '../../src/shared/diagnostics';

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
  vi.unstubAllEnvs();
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

  it('keeps only valid renderer context through the explicit typed receiver', async () => {
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
    diagnostics.receiveRenderer({ kind: 'renderer-context', context }, 'island');
    expect(diagnostics.getRendererContext('island')).toEqual(context);

    diagnostics.setRendererContext({
      ...context,
      tabId: 99,
    } as unknown as RendererDiagnosticContext);
    diagnostics.setRendererContext({ ...context, viewport: { width: Number.NaN, height: 1080 } });
    diagnostics.setRendererContext({ ...context, extra: 'private' } as RendererDiagnosticContext);

    expect(diagnostics.getRendererContext('island')).toEqual(context);
  });

  it('promptSnapshot includes startup, platform, graphics and live view context', async () => {
    const diagnostics = await initializeDiagnostics(await makeTemporaryDirectory());
    diagnostics.record({
      kind: 'app-start',
      appVersion: '4.1.0-beta.2',
      electronVersion: '44.0.0',
      chromiumVersion: '130.0.0',
      nodeVersion: '22.0.0',
      platform: 'win32',
      architecture: 'x64',
      osRelease: '10.0.26300',
    });
    diagnostics.record({
      kind: 'platform-capabilities',
      packaged: false,
      displayCount: 1,
      scaleFactors: [1],
      mediaBackend: 'winrt',
      inputBackend: 'windows-cursor-region',
      sessionType: 'windows',
      secureStorage: true,
    });
    diagnostics.record({
      kind: 'graphics-status',
      hardwareAcceleration: true,
      compositing: 'enabled',
      rasterization: 'enabled',
      webgl: 'enabled',
    });
    diagnostics.receiveRenderer(
      {
        kind: 'renderer-context',
        context: {
          tabId: 'assistant',
          mode: 'large',
          expanded: true,
          asked: true,
          answerCharacters: 8,
          viewport: { width: 1920, height: 1080 },
          inputRegion: { width: 400, height: 120 },
        },
      },
      'island',
    );
    diagnostics.receiveRenderer(
      { kind: 'settings-context', context: { category: 'integrations', page: 'ai' } },
      'settings',
    );
    const snapshot = diagnostics.promptSnapshot();
    expect(snapshot).toContain('session ');
    expect(snapshot).toContain('Ripple Next 4.1.0-beta.2 starting on win32/x64');
    expect(snapshot).toContain('development');
    expect(snapshot).toContain('media=winrt');
    expect(snapshot).toContain('hardware acceleration=true');
    expect(snapshot).toContain('Island page=assistant');
    expect(snapshot).toContain('Settings category=integrations');
  });
});

it('renders invalid preferences as a readable field diagnosis with the correct Settings context and no payload', async () => {
  const diagnostics = await initializeDiagnostics(await makeTemporaryDirectory());
  diagnostics.receiveRenderer(
    { kind: 'settings-context', context: { category: 'appearance', page: null } },
    'settings',
  );
  const result = AppStatePatchSchema.safeParse({
    settings: { theme: 'none', textColor: 'PRIVATE_INPUT' },
  });
  if (result.success) throw Error('Fixture must be rejected');
  diagnostics.record({
    kind: 'ipc-operation',
    operationId: 41,
    sender: 'settings',
    channel: 'update-app-state',
    phase: 'failed',
    elapsedMs: 0,
    error: serializeDiagnosticError(
      new DiagnosticError('Invalid app state update', validationProblems(result.error.issues)),
    ),
  });
  const line = String(mock.logger.error.mock.calls.at(-1)![0]);
  expect(line).toContain('[main/settings]');
  expect(line).toContain('#41 update-app-state failed (0 ms)');
  expect(line).toContain('settings.theme: expected default | sleek-black | win95');
  expect(line).toContain('Settings category=appearance');
  expect(line).not.toContain('PRIVATE_INPUT');
  expect(line).not.toContain('"kind"');
});
it('keeps default logs quiet, enables complete traces explicitly, and carries asynchronous operation correlation into HTTP errors', async () => {
  vi.stubEnv('RIPPLE_LOG_LEVEL', 'info');
  const normal = await initializeDiagnostics(await makeTemporaryDirectory());
  normal.record({
    kind: 'window-lifecycle',
    event: 'focus',
    role: 'settings',
    windowId: 2,
    webContentsId: 2,
  });
  normal.record({
    kind: 'ipc-operation',
    channel: 'get-system-media',
    phase: 'completed',
    elapsedMs: 20,
  });
  normal.record({ kind: 'windows-input-region', state: 'capturing', width: 170, height: 40 });
  expect(mock.logger.info).not.toHaveBeenCalled();
  expect(mock.logger.debug).not.toHaveBeenCalled();
  expect(mock.logger.silly).not.toHaveBeenCalled();
  vi.stubEnv('RIPPLE_LOG_LEVEL', 'trace');
  const trace = await initializeDiagnostics(await makeTemporaryDirectory());
  trace.record({
    kind: 'ipc-operation',
    operationId: 71,
    sender: 'island',
    channel: 'start-assistant',
    phase: 'started',
    elapsedMs: 0,
  });
  await withDiagnosticOperation(
    { id: 71, channel: 'start-assistant', sender: 'island', fields: [] },
    async () => {
      await Promise.resolve();
      trace.recordError(
        'assistant',
        Object.assign(new Error('Authorization: PRIVATE_TOKEN; PRIVATE_PROMPT'), {
          statusCode: 401,
          responseBody: 'PRIVATE_RESPONSE',
        }),
      );
    },
  );
  expect(String(mock.logger.silly.mock.calls.at(-1)![0])).toContain('#71 start-assistant started');
  const error = String(mock.logger.error.mock.calls.at(-1)![0]);
  expect(error).toContain('Operation #71: start-assistant');
  expect(error).toContain('HTTP 401');
  expect(error).not.toMatch(/PRIVATE_TOKEN|PRIVATE_PROMPT|PRIVATE_RESPONSE/);
});

it('maps bundled main and renderer frames to original sources and keeps map reads inside the build root', async () => {
  const directory = await makeTemporaryDirectory();
  const build = path.join(directory, 'build');
  await mkdir(build);
  const file = path.join(build, 'main.cjs');
  await writeFile(
    file + '.map',
    JSON.stringify({
      version: 3,
      file: 'main.cjs',
      sources: ['../../../src/main/ipc.ts'],
      sourcesContent: ['PRIVATE_SOURCE_CONTENT'],
      names: [],
      mappings: 'AAAA',
    }),
  );
  const map = createDiagnosticSourceMapper(build);
  expect(map(`    at commit (${file}:1:1)`)).toBe('    at commit (src/main/ipc.ts:1:1)');
  const outside = path.join(directory, 'outside.cjs');
  await writeFile(
    outside + '.map',
    JSON.stringify({ version: 3, sources: ['private.ts'], names: [], mappings: 'AAAA' }),
  );
  expect(map(`    at run (${outside}:1:1)`)).toBe(`    at run (${outside}:1:1)`);
  expect(map(`    at missing (${path.join(build, 'missing.cjs')}:1:1)`)).toContain(
    'missing.cjs:1:1',
  );
});

it('names discrete AI changes, hides continuous text, and keeps assistant facts on one line', async () => {
  const instruction = describeAIMutation({
    kind: 'edit-shared',
    instruction: 'PRIVATE_INSTRUCTION',
  });
  const endpoint = describeAIMutation({
    kind: 'edit-endpoint',
    id: 1,
    baseUrl: 'https://secret.example/v1',
  });
  const perception = describeAIMutation({
    kind: 'edit-shared',
    perception: { desktop: true },
  });
  const temperature = describeAIMutation({
    kind: 'customize-model',
    id: 4,
    customization: { temperature: 0.25 },
  });
  const vision = describeAIMutation({
    kind: 'customize-model',
    id: 4,
    customization: { vision: 'supported', thinkingBudget: 4096 },
  });
  expect(instruction).toEqual({ significance: 'continuous', facts: ['edit-shared instruction'] });
  expect(endpoint.facts).toEqual(['edit-endpoint id=1 baseUrl']);
  expect(perception).toEqual({ significance: 'discrete', facts: ['perception.desktop=on'] });
  expect(temperature).toEqual({
    significance: 'continuous',
    facts: ['customize-model id=4 temperature'],
  });
  expect(vision.facts).toEqual(['vision=supported']);
  expect(JSON.stringify({ instruction, endpoint, temperature, vision })).not.toMatch(
    /PRIVATE_INSTRUCTION|secret\.example|0\.25|4096/,
  );
  expect(
    formatDiagnosticEvent({
      kind: 'ipc-operation',
      channel: 'mutate-ai-configuration',
      phase: 'completed',
      elapsedMs: 1,
      significance: 'continuous',
      outcome: 'edit-shared instruction',
    }).level,
  ).toBe('debug');
  const probe = formatDiagnosticEvent({
    kind: 'ipc-operation',
    channel: 'probe-model-vision',
    phase: 'completed',
    elapsedMs: 4,
    significance: 'discrete',
    outcome: 'inconclusive',
  });
  expect(probe.level).toBe('info');
  expect(probe.message).toContain('inconclusive');
  expect(probe.message).not.toContain('provider');

  vi.stubEnv('RIPPLE_LOG_LEVEL', 'info');
  const quiet = await initializeDiagnostics(await makeTemporaryDirectory());
  mock.logger.info.mockClear();
  mock.logger.debug.mockClear();
  mock.logger.error.mockClear();
  const continuous = {
    kind: 'ipc-operation' as const,
    channel: 'mutate-ai-configuration' as const,
    phase: 'completed' as const,
    elapsedMs: 1,
    sender: 'settings' as const,
    significance: instruction.significance,
    facts: instruction.facts,
    outcome: instruction.facts.join(' '),
  };
  quiet.record(continuous);
  quiet.record(continuous);
  quiet.record({
    kind: 'ipc-operation',
    channel: 'mutate-ai-configuration',
    phase: 'completed',
    elapsedMs: 2,
    sender: 'settings',
    significance: perception.significance,
    facts: perception.facts,
    outcome: perception.facts.join(' '),
  });
  const assistant = describeAssistantRun({
    status: 'complete',
    modelId: 3,
    protocol: 'completion',
    promptCharacters: 12,
    outputCharacters: 842,
    desktop: 'attached',
    vision: 'supported',
    inputTokens: 20,
    outputTokens: 8,
  });
  expect(assistant).toBe(
    'complete model=3 protocol=completion prompt=12 chars=842 desktop=attached vision=supported in=20 out=8',
  );
  quiet.record({
    kind: 'ipc-operation',
    channel: 'start-assistant',
    phase: 'completed',
    elapsedMs: 19077,
    sender: 'island',
    outcome: assistant,
  });
  const infoLines = mock.logger.info.mock.calls.map(([line]) => String(line));
  expect(infoLines.some((line) => line.includes('edit-shared'))).toBe(false);
  expect(infoLines.some((line) => line.includes('perception.desktop=on'))).toBe(true);
  expect(
    infoLines.some((line) => line.includes('model=3') && line.includes('desktop=attached')),
  ).toBe(true);
  expect(infoLines.some((line) => line.includes('updates suppressed'))).toBe(false);
  expect(mock.logger.debug).not.toHaveBeenCalled();

  const failure = serializeDiagnosticError(
    Object.assign(new Error('PRIVATE_PROVIDER'), { statusCode: 401 }),
  );
  failure.message = `aiRequestFailed; ${failure.message}`;
  quiet.record({
    kind: 'ipc-operation',
    channel: 'start-assistant',
    phase: 'failed',
    elapsedMs: 20,
    sender: 'island',
    outcome: 'error model=3 protocol=completion prompt=12 desktop=unavailable vision=supported',
    error: failure,
  });
  expect(mock.logger.error).toHaveBeenCalledTimes(1);
  const errorLine = String(mock.logger.error.mock.calls[0]![0]);
  expect(errorLine).toContain('HTTP 401');
  expect(errorLine).toContain('model=3');
  expect(errorLine).toContain('desktop=unavailable');
  expect(errorLine).not.toContain('PRIVATE_PROVIDER');

  vi.stubEnv('RIPPLE_LOG_LEVEL', 'debug');
  const verbose = await initializeDiagnostics(await makeTemporaryDirectory());
  mock.logger.debug.mockClear();
  mock.logger.info.mockClear();
  verbose.record(continuous);
  verbose.record(continuous);
  verbose.record(continuous);
  verbose.record({
    kind: 'ipc-operation',
    channel: 'start-assistant',
    phase: 'completed',
    elapsedMs: 5,
    sender: 'island',
    outcome: 'complete model=3 desktop=off',
  });
  const debugLines = mock.logger.debug.mock.calls.map(([line]) => String(line));
  expect(
    debugLines.filter(
      (line) => line.includes('completed') && line.includes('edit-shared instruction'),
    ),
  ).toHaveLength(1);
  expect(
    debugLines.some((line) => line.includes('updates suppressed: 2 (edit-shared instruction)')),
  ).toBe(true);
  const next = String(mock.logger.info.mock.calls.at(-1)![0]);
  expect(next).toContain('complete model=3 desktop=off');
  expect(next).not.toContain('updates suppressed');
});
