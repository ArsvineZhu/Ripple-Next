import { createRequire } from 'node:module';
import path from 'node:path';
import { NativeScrollSchema } from '../../../shared/contracts';
import type { NativeScroll } from '../../../shared/contracts';
import type { BrowserWindow } from 'electron';

/** Distinct from the settings window title (`Ripple Next`) so [NSApp windows] can match the island. */
export const ISLAND_WINDOW_TITLE = 'Ripple Island';

type MacosWindowNative = {
  startScrollEvents(title: string, callback: (event: NativeScroll) => void): boolean;
  stopScrollEvents(): void;
  describeAppWindows: () => Array<{
    title: string;
    number: number;
    level: number;
    collectionBehavior: number;
    flags: string[];
    visible: boolean;
    key: boolean;
    main: boolean;
    onActiveSpace: boolean;
    canBecomeKey: boolean;
    frame: { x: number; y: number; width: number; height: number };
    className: string;
  }>;
  applyIslandBehavior: (title: string) => number;
  readIslandBehavior: (title: string) => number | null;
  expectedIslandMask: () => number;
};

let nativeModule: MacosWindowNative | null | undefined;

function nativeCandidates(): string[] {
  // Main is bundled to `.vite/build/main.cjs` (dev) or the forge main dir (packaged).
  return [
    ...(process.resourcesPath ? [path.join(process.resourcesPath, 'macos_window.node')] : []),
    path.resolve(__dirname, '../../native/macos-window/build/Release/macos_window.node'),
    path.resolve(__dirname, '../../../native/macos-window/build/Release/macos_window.node'),
    path.resolve(process.cwd(), 'native/macos-window/build/Release/macos_window.node'),
  ];
}

function loadNative(): MacosWindowNative | null {
  if (nativeModule !== undefined) return nativeModule;
  if (process.platform !== 'darwin') {
    nativeModule = null;
    return null;
  }
  const require = createRequire(__filename);
  for (const candidate of nativeCandidates()) {
    try {
      nativeModule = require(candidate) as MacosWindowNative;
      return nativeModule;
    } catch {
      // try next path
    }
  }
  nativeModule = null;
  return null;
}

/**
 * Replace the island NSWindow collectionBehavior with the intentional whole mask.
 * Apply after Electron changes visibility/focus; never apply to the settings window.
 */
export function applyIslandCollectionBehavior(
  window: BrowserWindow,
  title = ISLAND_WINDOW_TITLE,
): { ok: true; before: number | null; after: number } | { ok: false; reason: string } {
  const native = loadNative();
  if (!native) return { ok: false, reason: 'native module unavailable' };
  if (window.isDestroyed()) return { ok: false, reason: 'window destroyed' };
  try {
    window.setTitle(title);
    const before = native.readIslandBehavior(title);
    const after = native.applyIslandBehavior(title);
    const expected = native.expectedIslandMask();
    if (after !== expected) {
      return { ok: false, reason: `expected collectionBehavior ${expected}, received ${after}` };
    }
    return { ok: true, before, after };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

/** Electron can restore Managed when a panel is shown or focused. */
export function watchIslandCollectionBehavior(
  window: BrowserWindow,
  reportFailure: (reason: string) => void,
) {
  const apply = () => {
    const result = applyIslandCollectionBehavior(window);
    if (!result.ok) reportFailure(result.reason);
  };
  window.on('show', apply);
  window.on('focus', apply);
  window.once('closed', () => {
    window.removeListener('show', apply);
    window.removeListener('focus', apply);
  });
  return apply;
}

/** App-local observer; never intercepts events belonging to another window. */
export function watchIslandScroll(window: BrowserWindow): (() => void) | null {
  const native = loadNative();
  if (!native?.startScrollEvents) return null;
  let started = false;
  try {
    started = native.startScrollEvents(ISLAND_WINDOW_TITLE, (event) => {
      if (window.isDestroyed()) return;
      const parsed = NativeScrollSchema.safeParse(event);
      if (!parsed.success) return;
      const zoom = window.webContents.getZoomFactor();
      const payload = parsed.data;
      window.webContents.send('native-scroll', {
        ...payload,
        x: payload.x / zoom,
        y: payload.y / zoom,
        deltaX: payload.deltaX / zoom,
        deltaY: payload.deltaY / zoom,
      });
    });
  } catch {
    return null;
  }
  let closed = false;
  return started
    ? () => {
        if (!closed) {
          closed = true;
          native.stopScrollEvents();
        }
      }
    : null;
}
