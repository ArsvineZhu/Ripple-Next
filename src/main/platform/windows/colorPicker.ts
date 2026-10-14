import { runPowerShell } from './powershell';

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

export function chooseColor(hex: string, handle: string, signal: AbortSignal) {
  return runPowerShell(windowsScript(hex, handle), { timeout: 0, maxBuffer: 4096, signal });
}
