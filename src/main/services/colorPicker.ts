import type { BrowserWindow } from 'electron';
import { RGB_HEX, parseColor } from '../../shared/color';
import { runCommand } from './processes';

function nativeHandle(owner: BrowserWindow) {
  const bytes = owner.getNativeWindowHandle();
  return bytes.length >= 8 ? bytes.readBigUInt64LE().toString() : bytes.readUInt32LE().toString();
}

function windowsScript(hex: string, handle: string) {
  return `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @'
using System;
using System.Windows.Forms;
public sealed class RippleColorOwner : IWin32Window {
  public IntPtr Handle { get; private set; }
  public RippleColorOwner(long handle) { Handle = new IntPtr(handle); }
}
'@ -ReferencedAssemblies System.Windows.Forms
[System.Windows.Forms.Application]::EnableVisualStyles()
$dialog = New-Object System.Windows.Forms.ColorDialog
$dialog.FullOpen = $true
$dialog.AllowFullOpen = $true
$dialog.Color = [System.Drawing.ColorTranslator]::FromHtml('${hex}')
$owner = New-Object RippleColorOwner -ArgumentList ([long]${handle})
try {
  if ($dialog.ShowDialog($owner) -eq [System.Windows.Forms.DialogResult]::OK) {
    '#{0:X2}{1:X2}{2:X2}' -f $dialog.Color.R, $dialog.Color.G, $dialog.Color.B
  }
} finally { $dialog.Dispose() }
`;
}

/** One native RGB chooser. Empty output and native Cancel leave state unchanged. */
export async function chooseColor(
  hex: string,
  handle: string,
  signal: AbortSignal,
  platform = process.platform,
  desktop = process.env.XDG_CURRENT_DESKTOP ?? '',
): Promise<string | null> {
  if (!RGB_HEX.test(hex) || !/^\d+$/.test(handle))
    throw new TypeError('Invalid native color request');
  const options = { timeout: 0, maxBuffer: 4096, signal };
  let output: string;
  if (platform === 'win32') {
    output = await runCommand(
      'powershell.exe',
      [
        '-NoProfile',
        '-STA',
        '-EncodedCommand',
        Buffer.from(windowsScript(hex, handle), 'utf16le').toString('base64'),
      ],
      options,
    );
  } else if (platform === 'darwin') {
    const rgb = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) * 257);
    output = await runCommand(
      '/usr/bin/osascript',
      [
        '-e',
        `try
activate
set selectedColor to choose color default color {${rgb.join(', ')}}
return selectedColor
on error number -128
return ""
end try`,
      ],
      options,
    );
    if (!output.trim()) return null;
    const channels = output.trim().split(/,\s*/).map(Number);
    if (
      channels.length !== 3 ||
      !channels.every((n) => Number.isInteger(n) && n >= 0 && n <= 65535)
    )
      throw new Error('Invalid macOS color response');
    return `#${channels
      .map((n) =>
        Math.round(n / 257)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
      .toUpperCase()}`;
  } else if (platform === 'linux') {
    const choices = /kde/i.test(desktop) ? ['kdialog', 'zenity'] : ['zenity', 'kdialog'];
    for (const executable of choices) {
      try {
        output = await runCommand(
          executable,
          executable === 'kdialog'
            ? ['--getcolor', '--default', hex, '--attach', handle]
            : ['--color-selection', '--show-palette', `--color=${hex}`, `--attach=${handle}`],
          options,
        );
        return readColor(output);
      } catch (error) {
        const code = (error as { code?: number | string }).code;
        if (code === 1) return null;
        if (code !== 'ENOENT') throw error;
      }
    }
    throw new Error('Install zenity or kdialog to open the system color picker');
  } else throw new Error('Native color picker is unavailable on this platform');
  return readColor(output);
}

function readColor(output: string) {
  if (!output.trim()) return null;
  const parsed = parseColor(output.trim());
  if (!parsed) throw new Error('Invalid native color response');
  return parsed.hex;
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
  if (process.platform !== 'win32') owner.setEnabled(false);
  try {
    return await chooseColor(hex, nativeHandle(owner), controller.signal);
  } catch (error) {
    if (controller.signal.aborted) return null;
    throw error;
  } finally {
    active = false;
    owner.removeListener('closed', closed);
    if (!owner.isDestroyed()) {
      if (process.platform !== 'win32') owner.setEnabled(enabled);
      owner.focus();
    }
  }
}
