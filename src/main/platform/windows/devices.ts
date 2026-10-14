import { DiagnosticError } from '../../../shared/diagnosticError';
import { powerShellLiteral, runPowerShell, winrtAsync } from './powershell';

async function readStatus(script: string): Promise<boolean> {
  const value = (await runPowerShell(script)).trim().toLowerCase();
  if (value !== 'true' && value !== 'false')
    throw new DiagnosticError('Invalid Windows device status');
  return value === 'true';
}

export function getBluetoothStatus(): Promise<boolean> {
  return readStatus(
    winrtAsync +
      String.raw`
$bluetooth = [Windows.Devices.Bluetooth.BluetoothDevice, Windows.Devices.Bluetooth, ContentType = WindowsRuntime]
$bluetoothLE = [Windows.Devices.Bluetooth.BluetoothLEDevice, Windows.Devices.Bluetooth, ContentType = WindowsRuntime]
$devices = [Windows.Devices.Enumeration.DeviceInformation, Windows.Devices.Enumeration, ContentType = WindowsRuntime]
$collection = [Windows.Devices.Enumeration.DeviceInformationCollection, Windows.Devices.Enumeration, ContentType = WindowsRuntime]
$status = [Windows.Devices.Bluetooth.BluetoothConnectionStatus]::Connected
$classic = Await-WinRT ($devices::FindAllAsync($bluetooth::GetDeviceSelectorFromConnectionStatus($status))) $collection
$le = Await-WinRT ($devices::FindAllAsync($bluetoothLE::GetDeviceSelectorFromConnectionStatus($status))) $collection
($classic.Count + $le.Count) -gt 0
`,
  );
}

function getCaptureStatus(device: 'webcam' | 'microphone'): Promise<boolean> {
  const registryPath =
    'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\' +
    device;
  return readStatus(
    '$path = ' +
      powerShellLiteral(registryPath) +
      String.raw`
if (-not (Test-Path -LiteralPath $path)) { return $false }
@(Get-ChildItem -LiteralPath $path -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
  Get-ItemProperty -LiteralPath $_.PSPath -Name LastUsedTimeStop -ErrorAction SilentlyContinue
} | Where-Object { $_ -and $_.LastUsedTimeStop -eq 0 }).Count -gt 0
`,
  );
}

export const getCameraStatus = () => getCaptureStatus('webcam');
export const getMicrophoneStatus = () => getCaptureStatus('microphone');
