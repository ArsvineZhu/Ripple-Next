import type { Dispatch, SetStateAction } from 'react';
import type { IslandMode } from '../../shared/contracts';
import { useState, useEffect, useRef } from 'react';
import { recordRendererError } from '../lib/diagnostics';
import { enterAlertMode, leaveAlertMode } from '../lib/modes';

const BLUETOOTH_POLL_INTERVAL_MS = 15000;
const CAPTURE_DEVICE_POLL_INTERVAL_MS = 5000;

export function useDeviceAlerts(setMode: Dispatch<SetStateAction<IslandMode>>) {
  const [bluetooth, setBluetooth] = useState(false);
  const [bluetoothAlert, setBluetoothAlert] = useState(false);
  const [cameraInUse, setCameraInUse] = useState(false);
  const [cameraAlert, setCameraAlert] = useState(false);
  const [microphoneInUse, setMicrophoneInUse] = useState(false);
  const [microphoneAlert, setMicrophoneAlert] = useState(false);
  const captureAlertQueue = useRef<('camera' | 'microphone')[]>([]);
  const captureAlertTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const captureAlertDisplayed = useRef({ camera: false, microphone: false });
  useEffect(() => {
    if (bluetooth === true) {
      setMode(enterAlertMode);
      setBluetoothAlert(true);
      const timerId = setTimeout(() => {
        setMode(leaveAlertMode);
        setBluetoothAlert(false);
      }, 3000);
      return () => {
        clearTimeout(timerId);
      };
    }
  }, [bluetooth, setMode]);
  useEffect(() => {
    let active = true;
    let bluetoothTimer: ReturnType<typeof setTimeout> | undefined;
    let captureTimer: ReturnType<typeof setTimeout> | undefined;
    let bluetoothPending = false,
      capturePending = false;
    let bluetoothDirty = false,
      captureDirty = false;
    const events = window.electronAPI.systemEventCapabilities?.devices;
    const pollBluetooth = async () => {
      bluetoothDirty = true;
      if (bluetoothPending) return;
      bluetoothPending = true;
      clearTimeout(bluetoothTimer);
      try {
        do {
          bluetoothDirty = false;
          try {
            const connected = await window.electronAPI.getBluetoothStatus();
            if (active) setBluetooth(connected);
          } catch (error) {
            recordRendererError('device', error);
          }
        } while (bluetoothDirty && active);
      } finally {
        bluetoothPending = false;
        if (active && !events)
          bluetoothTimer = setTimeout(() => void pollBluetooth(), BLUETOOTH_POLL_INTERVAL_MS);
      }
    };
    const pollCaptureDevices = async () => {
      captureDirty = true;
      if (capturePending) return;
      capturePending = true;
      clearTimeout(captureTimer);
      try {
        do {
          captureDirty = false;
          const results = await Promise.allSettled([
            window.electronAPI.getCameraStatus(),
            window.electronAPI.getMicrophoneStatus(),
          ]);
          if (active)
            results.forEach((result, index) => {
              if (result.status === 'fulfilled')
                [setCameraInUse, setMicrophoneInUse][index]!(result.value);
              else recordRendererError('device', result.reason);
            });
        } while (captureDirty && active);
      } finally {
        capturePending = false;
        if (active && !events)
          captureTimer = setTimeout(
            () => void pollCaptureDevices(),
            CAPTURE_DEVICE_POLL_INTERVAL_MS,
          );
      }
    };
    const unsubscribe = window.electronAPI.onDevicesChanged?.(() => {
      void pollBluetooth();
      void pollCaptureDevices();
    });
    void pollCaptureDevices();
    if (events) void pollBluetooth();
    else bluetoothTimer = setTimeout(() => void pollBluetooth(), CAPTURE_DEVICE_POLL_INTERVAL_MS);
    return () => {
      active = false;
      unsubscribe?.();
      if (bluetoothTimer) clearTimeout(bluetoothTimer);
      if (captureTimer) clearTimeout(captureTimer);
      if (captureAlertTimer.current) clearTimeout(captureAlertTimer.current);
      captureAlertTimer.current = null;
      captureAlertQueue.current = [];
    };
  }, []);
  useEffect(() => {
    const processCaptureQueue = () => {
      if (captureAlertTimer.current || captureAlertQueue.current.length === 0) return;
      const nextAlert = captureAlertQueue.current.shift();
      if (!nextAlert) return;

      setMode(enterAlertMode);
      if (nextAlert === 'camera') {
        setCameraAlert(true);
      } else {
        setMicrophoneAlert(true);
      }

      captureAlertTimer.current = setTimeout(() => {
        if (nextAlert === 'camera') {
          setCameraAlert(false);
        } else {
          setMicrophoneAlert(false);
        }
        captureAlertTimer.current = null;
        if (captureAlertQueue.current.length > 0) {
          processCaptureQueue();
        } else {
          setMode(leaveAlertMode);
        }
      }, 3000);
    };

    if (cameraInUse && !captureAlertDisplayed.current.camera) {
      captureAlertQueue.current.push('camera');
      captureAlertDisplayed.current.camera = true;
    }
    if (!cameraInUse) {
      captureAlertDisplayed.current.camera = false;
    }

    if (microphoneInUse && !captureAlertDisplayed.current.microphone) {
      captureAlertQueue.current.push('microphone');
      captureAlertDisplayed.current.microphone = true;
    }
    if (!microphoneInUse) {
      captureAlertDisplayed.current.microphone = false;
    }

    captureAlertQueue.current = captureAlertQueue.current.filter((item) => {
      if (item === 'camera' && !cameraInUse) return false;
      if (item === 'microphone' && !microphoneInUse) return false;
      return true;
    });

    processCaptureQueue();

    return () => {
      if (!cameraInUse && !microphoneInUse) {
        if (captureAlertTimer.current) {
          clearTimeout(captureAlertTimer.current);
          captureAlertTimer.current = null;
        }
        captureAlertQueue.current = [];
      }
    };
  }, [cameraInUse, microphoneInUse, setMode]);
  return {
    bluetoothAlert,
    cameraInUse,
    cameraAlert,
    microphoneInUse,
    microphoneAlert,
  };
}
