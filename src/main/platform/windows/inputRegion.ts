import { screen } from 'electron';
import type { InputRect } from '../../../shared/contracts';
import type { DiagnosticsService } from '../../services/diagnostics';

interface InputWindow {
  isDestroyed(): boolean;
  isVisible(): boolean;
  getBounds(): { x: number; y: number; width: number; height: number };
  setIgnoreMouseEvents(ignore: boolean, options: { forward: boolean }): void;
  on(event: string, listener: (...args: unknown[]) => void): unknown;
  webContents: {
    on(event: 'input-event', listener: (_event: unknown, input: { type: string }) => void): unknown;
    removeListener(
      event: 'input-event',
      listener: (_event: unknown, input: { type: string }) => void,
    ): unknown;
  };
}

export function createWindowsInputRegion(
  window: InputWindow,
  diagnostics: Pick<DiagnosticsService, 'record'>,
) {
  const webContents = window.webContents;
  let region: InputRect | undefined;
  let ignoring: boolean | undefined;
  let held = false;
  let closed = false;
  const sync = () => {
    if (closed || window.isDestroyed() || !window.isVisible() || !region) return;
    const point = screen.getCursorScreenPoint();
    const bounds = window.getBounds();
    const x = point.x - bounds.x;
    const y = point.y - bounds.y;
    // Electron reports the cursor and window bounds in DIP; do not scale twice.
    const inside =
      x >= region.x && x < region.x + region.width && y >= region.y && y < region.y + region.height;
    const next = !held && !inside;
    if (next === ignoring) return;
    window.setIgnoreMouseEvents(next, { forward: true });
    ignoring = next;
    diagnostics.record({
      kind: 'windows-input-region',
      state: next ? 'passthrough' : 'capturing',
      width: region.width,
      height: region.height,
    });
  };
  const input = (_event: unknown, event: { type: string }) => {
    if (event.type === 'mouseDown') held = true;
    if (event.type === 'mouseUp') held = false;
    sync();
  };
  webContents.on('input-event', input);
  let timer: ReturnType<typeof setInterval> | undefined;
  const watchCursor = () => {
    if (closed || timer || window.isDestroyed() || !window.isVisible()) return;
    timer = setInterval(sync, 16);
  };
  const stopCursor = () => {
    if (!timer) return;
    clearInterval(timer);
    timer = undefined;
  };
  window.on('show', () => {
    watchCursor();
    sync();
  });
  window.on('hide', () => {
    held = false;
    stopCursor();
  });
  watchCursor();
  const close = () => {
    if (closed) return;
    closed = true;
    stopCursor();
    webContents.removeListener('input-event', input);
  };
  window.on('closed', close);
  return {
    apply(rect: InputRect) {
      region = rect;
      sync();
    },
    close,
  };
}
