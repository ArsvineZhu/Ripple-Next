import type { BrowserWindow } from 'electron';
import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const native = vi.hoisted(() => ({
  startScrollEvents: vi.fn(),
  stopScrollEvents: vi.fn(),
  readIslandBehavior: vi.fn(),
  applyIslandBehavior: vi.fn(),
  expectedIslandMask: vi.fn(),
}));
vi.mock('node:module', async (original) => ({
  ...(await original<typeof import('node:module')>()),
  createRequire: () => () => native,
}));

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  vi.stubGlobal('process', { ...process, platform: 'darwin' });
  native.readIslandBehavior.mockReturnValue(264);
  native.applyIslandBehavior.mockReturnValue(273);
  native.expectedIslandMask.mockReturnValue(273);
});
afterEach(() => vi.unstubAllGlobals());

function makeWindow() {
  return Object.assign(new EventEmitter(), {
    isDestroyed: vi.fn(() => false),
    setTitle: vi.fn(),
  });
}

it('applies the native stationary policy only to the Island', async () => {
  const { applyIslandCollectionBehavior } =
    await import('../../../src/main/platform/macos/islandWindowBehavior');
  const window = makeWindow();
  expect(applyIslandCollectionBehavior(window as unknown as BrowserWindow)).toEqual({
    ok: true,
    before: 264,
    after: 273,
  });
  expect(window.setTitle).toHaveBeenCalledWith('Ripple Island');
  expect(native.applyIslandBehavior).toHaveBeenCalledWith('Ripple Island');
});

it('reports a readback that still contains the conflicting transient flag', async () => {
  const { applyIslandCollectionBehavior } =
    await import('../../../src/main/platform/macos/islandWindowBehavior');
  native.applyIslandBehavior.mockReturnValue(281);
  expect(applyIslandCollectionBehavior(makeWindow() as unknown as BrowserWindow)).toMatchObject({
    ok: false,
    reason: expect.stringContaining('281'),
  });
});

it('reports native lookup failures instead of throwing from the window callback', async () => {
  const { applyIslandCollectionBehavior } =
    await import('../../../src/main/platform/macos/islandWindowBehavior');
  native.readIslandBehavior.mockImplementation(() => {
    throw new Error('window lookup failed');
  });
  expect(applyIslandCollectionBehavior(makeWindow() as unknown as BrowserWindow)).toEqual({
    ok: false,
    reason: 'window lookup failed',
  });
});

it('does not access a destroyed native window', async () => {
  const { applyIslandCollectionBehavior } =
    await import('../../../src/main/platform/macos/islandWindowBehavior');
  const window = makeWindow();
  window.isDestroyed.mockReturnValue(true);
  expect(applyIslandCollectionBehavior(window as unknown as BrowserWindow)).toEqual({
    ok: false,
    reason: 'window destroyed',
  });
  expect(native.readIslandBehavior).not.toHaveBeenCalled();
  expect(native.applyIslandBehavior).not.toHaveBeenCalled();
});

it('restores policy after visibility/focus changes and cleans up on close', async () => {
  const { watchIslandCollectionBehavior } =
    await import('../../../src/main/platform/macos/islandWindowBehavior');
  const window = makeWindow();
  const report = vi.fn();
  const sync = watchIslandCollectionBehavior(window as unknown as BrowserWindow, report);
  window.emit('show');
  window.emit('focus');
  sync();
  expect(native.applyIslandBehavior).toHaveBeenCalledTimes(3);
  expect(report).not.toHaveBeenCalled();
  native.applyIslandBehavior.mockReturnValue(277);
  window.emit('focus');
  expect(report).toHaveBeenCalledWith(expect.stringContaining('277'));
  window.emit('closed');
  window.emit('show');
  window.emit('focus');
  expect(native.applyIslandBehavior).toHaveBeenCalledTimes(4);
});

it('normalizes native scroll coordinates for zoom and stops the observer once', async () => {
  const { watchIslandScroll } =
    await import('../../../src/main/platform/macos/islandWindowBehavior');
  native.startScrollEvents.mockReturnValue(true);
  const window = Object.assign(makeWindow(), {
    webContents: { getZoomFactor: () => 2, send: vi.fn() },
  });
  const close = watchIslandScroll(window as unknown as BrowserWindow);
  const event = { at: 123, x: 100, y: 80, deltaX: 40, deltaY: 2, phase: 'begin', control: false };
  native.startScrollEvents.mock.calls[0][1](event);
  expect(window.webContents.send).toHaveBeenCalledWith('native-scroll', {
    ...event,
    x: 50,
    y: 40,
    deltaX: 20,
    deltaY: 1,
  });
  native.startScrollEvents.mock.calls[0][1]({ ...event, deltaX: Infinity });
  expect(window.webContents.send).toHaveBeenCalledTimes(1);
  close?.();
  close?.();
  expect(native.stopScrollEvents).toHaveBeenCalledTimes(1);
});
it('allows DOM fallback when the native observer is unavailable or throws', async () => {
  const { watchIslandScroll } =
    await import('../../../src/main/platform/macos/islandWindowBehavior');
  native.startScrollEvents.mockReturnValue(false);
  expect(watchIslandScroll(makeWindow() as unknown as BrowserWindow)).toBeNull();
  native.startScrollEvents.mockImplementation(() => {
    throw new Error('unavailable');
  });
  expect(watchIslandScroll(makeWindow() as unknown as BrowserWindow)).toBeNull();
});
it('never loads the macOS input observer on Windows or Linux', async () => {
  for (const platform of ['win32', 'linux']) {
    vi.resetModules();
    vi.stubGlobal('process', { ...process, platform });
    const { watchIslandScroll } =
      await import('../../../src/main/platform/macos/islandWindowBehavior');
    expect(watchIslandScroll(makeWindow() as unknown as BrowserWindow)).toBeNull();
  }
  expect(native.startScrollEvents).not.toHaveBeenCalled();
});
