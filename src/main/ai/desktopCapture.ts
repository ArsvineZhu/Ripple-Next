import { desktopCapturer, screen } from 'electron';
import { getMainWindow } from '../window';

/** One PNG of the display that contains the Island. Nothing is written to disk. */
export async function captureIslandDisplay(): Promise<Uint8Array | null> {
  try {
    const window = getMainWindow();
    const display = window
      ? screen.getDisplayMatching(window.getBounds())
      : screen.getPrimaryDisplay();
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: Math.max(1, Math.min(1280, display.size.width)),
        height: Math.max(1, Math.min(720, display.size.height)),
      },
    });
    const source = sources.find((item) => item.display_id === String(display.id)) ?? sources[0];
    if (!source || source.thumbnail.isEmpty()) return null;
    return source.thumbnail.toPNG();
  } catch {
    return null;
  }
}
