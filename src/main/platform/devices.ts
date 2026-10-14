import * as windows from './windows/devices';
import * as macos from './macos/devices';
import * as linux from './linux/devices';

/** Native sampling and caches stay inside the selected platform adapter. */
export const devices =
  process.platform === 'win32'
    ? {
        getBluetoothStatus: windows.getBluetoothStatus,
        getCameraStatus: windows.getCameraStatus,
        getMicrophoneStatus: windows.getMicrophoneStatus,
      }
    : process.platform === 'darwin'
      ? {
          getBluetoothStatus: macos.getBluetoothStatus,
          getCameraStatus: macos.getCameraStatus,
          getMicrophoneStatus: macos.getMicrophoneStatus,
        }
      : {
          getBluetoothStatus: linux.getBluetoothStatus,
          getCameraStatus: linux.getCameraStatus,
          getMicrophoneStatus: linux.getMicrophoneStatus,
        };
