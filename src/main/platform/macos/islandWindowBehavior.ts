import { createRequire } from 'node:module';
import path from 'node:path';
import type { BrowserWindow } from 'electron';

/** Distinct from the settings window title (`Ripple Next`) so [NSApp windows] can match the island. */
export const ISLAND_WINDOW_TITLE = 'Ripple Island';

/** Intentional whole mask — not an OR onto Electron's Transient-only Mission Control bit. */
const ISLAND_COLLECTION_BEHAVIOR = {
  canJoinAllSpaces: true,
  fullScreenAuxiliary: true,
  stationary: true,
  transient: true,
} as const;

type MacosWindowNative = {
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
  applyIslandBehavior: (
    title: string,
    options: {
      canJoinAllSpaces?: boolean;
      fullScreenAuxiliary?: boolean;
      stationary?: boolean;
      transient?: boolean;
    },
  ) => number;
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
 * Call only for the island BrowserWindow after it is shown; never for the settings window.
 */
export function applyIslandCollectionBehavior(
  window: BrowserWindow,
  title = ISLAND_WINDOW_TITLE,
): { ok: true; before: number | null; after: number } | { ok: false; reason: string } {
  const native = loadNative();
  if (!native) return { ok: false, reason: 'native module unavailable' };
  if (window.isDestroyed()) return { ok: false, reason: 'window destroyed' };
  window.setTitle(title);
  const before = native.readIslandBehavior(title);
  try {
    const after = native.applyIslandBehavior(title, { ...ISLAND_COLLECTION_BEHAVIOR });
    return { ok: true, before, after };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}
