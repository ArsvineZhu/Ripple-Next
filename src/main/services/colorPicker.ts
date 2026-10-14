import type { BrowserWindow } from 'electron';
import { chooseNativeColor, colorPickerOwnsModality } from '../platform/colorPicker';

function nativeHandle(owner: BrowserWindow) {
  const bytes = owner.getNativeWindowHandle();
  return bytes.length >= 8 ? bytes.readBigUInt64LE().toString() : bytes.readUInt32LE().toString();
}

let active = false;
export async function showNativeColorPicker(owner: BrowserWindow, hex: string) {
  if (active || owner.isDestroyed()) return null;
  active = true;
  const controller = new AbortController();
  const closed = () => controller.abort();
  owner.once('closed', closed);
  const enabled = owner.isEnabled();
  // Windows' ShowDialog manages HWND modality itself. AppleScript/GTK run separately.
  if (!colorPickerOwnsModality) owner.setEnabled(false);
  try {
    return await chooseNativeColor(hex, nativeHandle(owner), controller.signal);
  } catch (error) {
    if (controller.signal.aborted) return null;
    throw error;
  } finally {
    active = false;
    owner.removeListener('closed', closed);
    if (!owner.isDestroyed()) {
      if (!colorPickerOwnsModality) owner.setEnabled(enabled);
      owner.focus();
    }
  }
}
