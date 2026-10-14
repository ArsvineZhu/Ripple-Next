import { RGB_HEX, parseColor } from '../../shared/color';
import { chooseColor as windows } from './windows/colorPicker';
import { chooseColor as macos } from './macos/colorPicker';
import { chooseColor as linux } from './linux/colorPicker';

export const colorPickerOwnsModality = process.platform === 'win32';
const choose =
  process.platform === 'win32' ? windows : process.platform === 'darwin' ? macos : linux;

/** Platform commands receive validated RGB and native handles; callers receive RGB or Cancel. */
export async function chooseNativeColor(hex: string, handle: string, signal: AbortSignal) {
  if (!RGB_HEX.test(hex) || !/^\d+$/.test(handle))
    throw new TypeError('Invalid native color request');
  const output = await choose(hex, handle, signal);
  if (!output?.trim()) return null;
  const color = parseColor(output.trim());
  if (!color) throw new Error('Invalid native color response');
  return color.hex;
}
