import { DiagnosticError } from '../../../shared/diagnosticError';
import { runCommand } from '../../services/processes';

let captureSnapshot: Promise<string> | undefined;
let captureSnapshotAt = 0;

function getCaptureSnapshot(): Promise<string> {
  // Both capture checks belong to one poll. Share the expensive registry dump,
  // including concurrent callers, but refresh on the next five-second poll.
  if (!captureSnapshot || Date.now() - captureSnapshotAt >= 1000) {
    captureSnapshotAt = Infinity;
    const pending = runCommand('ioreg', ['-l'], { maxBuffer: 10 * 1024 * 1024 });
    captureSnapshot = pending;
    void pending.then(
      () => {
        if (captureSnapshot === pending) captureSnapshotAt = Date.now();
      },
      () => {
        if (captureSnapshot === pending) captureSnapshot = undefined;
      },
    );
  }
  return captureSnapshot;
}

export async function getBluetoothStatus(): Promise<boolean> {
  const data = JSON.parse(
    await runCommand('system_profiler', ['SPBluetoothDataType', '-json'], { timeout: 30_000 }),
  );
  const bluetooth = data.SPBluetoothDataType?.[0];
  if (!bluetooth) throw new DiagnosticError('Invalid macOS Bluetooth response');
  return Boolean(bluetooth.device_connected?.length);
}

export async function getCameraStatus(): Promise<boolean> {
  const output = await getCaptureSnapshot();
  return /^.*(?:FrontCameraActive|FrontCameraStreaming).*=\s*Yes\s*$/m.test(output);
}

export async function getMicrophoneStatus(): Promise<boolean> {
  const output = await getCaptureSnapshot();
  return /^.*(?:IOAudioStreamActive|IOAudioEngine|IOAudioStream).*Yes.*$/m.test(output);
}
