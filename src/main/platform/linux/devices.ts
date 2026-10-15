import { readdir } from 'node:fs/promises';
import { z } from 'zod';
import { runCommand } from '../../services/processes';
import { app } from 'electron';
import path from 'node:path';
import { createSignalBus } from './signalBus';
import { createNativeStream } from './nativeStream';
import { createPipeWireState } from './pipewire';
import { DiagnosticError } from '../../../shared/diagnosticError';

let microphoneBackend: 'pactl' | 'pw-dump' = 'pactl';
const pipeWireObjects = z.array(
  z.object({
    type: z.string(),
    info: z
      .object({
        state: z.string().optional(),
        props: z.record(z.string(), z.unknown()).optional(),
      })
      .nullish(),
  }),
);

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
let observing = false;
let bluetooth: boolean | undefined;
let bluetoothError: unknown;
let bluetoothPending: Promise<boolean> | undefined;
let bluetoothDirty = false;
const bluez = createSignalBus(
  'system',
  [
    "type='signal',sender='org.bluez',interface='org.freedesktop.DBus.Properties',member='PropertiesChanged',arg0='org.bluez.Device1'",
    "type='signal',sender='org.bluez',interface='org.freedesktop.DBus.ObjectManager'",
    "type='signal',interface='org.freedesktop.DBus',member='NameOwnerChanged',arg0='org.bluez'",
  ],
  () => true,
);
async function readBluetooth() {
  try {
    const bus = await bluez.get();
    const objects = await bus.invoke<Record<string, Record<string, Record<string, unknown>>>>({
      destination: 'org.bluez',
      path: '/',
      interface: 'org.freedesktop.DBus.ObjectManager',
      member: 'GetManagedObjects',
    });
    return Object.values(objects).some((object) => object['org.bluez.Device1']?.Connected === true);
  } catch (error) {
    if ((error as { dbusName?: string })?.dbusName === 'org.freedesktop.DBus.Error.ServiceUnknown')
      return false;
    throw error;
  }
}
function refreshBluetooth(): Promise<boolean> {
  if (!bluetoothPending)
    bluetoothPending = (async () => {
      do {
        bluetoothDirty = false;
        try {
          bluetooth = await readBluetooth();
          bluetoothError = undefined;
        } catch (error) {
          bluetoothError = error;
        }
      } while (bluetoothDirty && observing);
      emit();
      if (bluetoothError) throw bluetoothError;
      return bluetooth!;
    })().finally(() => {
      bluetoothPending = undefined;
    });
  return bluetoothPending;
}
export async function getBluetoothStatus(): Promise<boolean> {
  if (observing && bluetoothError && !bluetoothPending) throw bluetoothError;
  if (!observing || bluetooth === undefined || bluetoothPending) return refreshBluetooth();
  if (bluetoothError) throw bluetoothError;
  return bluetooth;
}

async function readCamera(): Promise<boolean> {
  const devices = (await readdir('/dev'))
    .filter((name) => /^video\d+$/.test(name))
    .map((name) => '/dev/' + name);
  if (!devices.length) return false;
  try {
    return (await runCommand('fuser', devices)).trim().length > 0;
  } catch (error) {
    const result = error as { code?: unknown; stderr?: unknown };
    if (result.code === 1 && typeof result.stderr === 'string' && !result.stderr.trim())
      return false;
    throw error;
  }
}

async function readMicrophone(): Promise<boolean> {
  if (microphoneBackend === 'pactl') {
    try {
      return /Source #/.test(await runCommand('pactl', ['list', 'source-outputs']));
    } catch (error) {
      if ((error as { code?: unknown })?.code !== 'ENOENT') throw error;
      microphoneBackend = 'pw-dump';
    }
  }
  const objects = pipeWireObjects.parse(JSON.parse(await runCommand('pw-dump', ['--no-colors'])));
  return objects.some(
    (object) =>
      object.type === 'PipeWire:Interface:Node' &&
      object.info?.state === 'running' &&
      object.info.props?.['media.class'] === 'Stream/Input/Audio',
  );
}

let camera: boolean | undefined;
let cameraError: unknown;
let cameraListenerError: unknown;
let cameraPending: Promise<boolean> | undefined;
let cameraDirty = false;
let pipeCamera = false;
let microphone: boolean | undefined;
let microphoneError: unknown;
let streamBackend: 'pipewire' | 'pulse' = 'pipewire';
let audioGeneration = 0;
let pulsePending: Promise<void> | undefined;
let pulseDirty = false;
function refreshCamera(): Promise<boolean> {
  if (!cameraPending)
    cameraPending = (async () => {
      do {
        cameraDirty = false;
        try {
          camera = await readCamera();
          cameraError = undefined;
        } catch (error) {
          cameraError = error;
        }
      } while (cameraDirty && observing);
      emit();
      if (cameraError) throw cameraError;
      return camera!;
    })().finally(() => {
      cameraPending = undefined;
    });
  return cameraPending;
}
export async function getCameraStatus(): Promise<boolean> {
  if (pipeCamera) return true;
  if (observing && cameraListenerError) throw cameraListenerError;
  if (observing && cameraError && !cameraPending) throw cameraError;
  if (!observing || camera === undefined || cameraPending) return refreshCamera();
  if (cameraError) throw cameraError;
  return camera;
}
export async function getMicrophoneStatus(): Promise<boolean> {
  if (!observing) return readMicrophone();
  if (microphoneError) throw microphoneError;
  if (microphone !== undefined) return microphone;
  return readMicrophone();
}
function refreshPulse() {
  pulseDirty = true;
  if (pulsePending) return;
  pulsePending = (async () => {
    do {
      pulseDirty = false;
      const generation = audioGeneration;
      try {
        const value = /Source #/.test(await runCommand('pactl', ['list', 'source-outputs']));
        if (!observing || generation !== audioGeneration) return;
        microphone = value;
        microphoneError = undefined;
      } catch (error) {
        microphoneError = error;
      }
    } while (pulseDirty && observing);
    emit();
  })().finally(() => {
    pulsePending = undefined;
  });
}
const pipewire = createPipeWireState((status) => {
  const changed =
    microphone !== status.microphone ||
    pipeCamera !== status.camera ||
    microphoneError !== undefined;
  microphone = status.microphone;
  pipeCamera = status.camera;
  microphoneError = undefined;
  if (changed) emit();
});
let audioBuffer = '';
const audioEvents = createNativeStream(
  () =>
    streamBackend === 'pipewire'
      ? { executable: 'pw-dump', args: ['--monitor', '--no-colors'] }
      : { executable: 'pactl', args: ['subscribe'] },
  (chunk) => {
    if (streamBackend === 'pipewire') return pipewire.consume(chunk);
    if (!chunk) {
      refreshPulse();
      return true;
    }
    audioBuffer += chunk;
    if (audioBuffer.length > 64 * 1024)
      throw new DiagnosticError('PulseAudio event frame limit exceeded');
    let newline: number;
    while ((newline = audioBuffer.indexOf('\n')) !== -1) {
      const line = audioBuffer.slice(0, newline);
      audioBuffer = audioBuffer.slice(newline + 1);
      if (/source-output|server/.test(line)) refreshPulse();
    }
    return true;
  },
  () => {
    audioGeneration++;
    pipewire.reset();
    audioBuffer = '';
  },
  (error) => {
    microphone = undefined;
    pipeCamera = false;
    microphoneError = error;
    if (streamBackend === 'pipewire' && (error as { code?: string })?.code === 'ENOENT')
      streamBackend = 'pulse';
    emit();
  },
);
let cameraBuffer = '';
const cameraEvents = createNativeStream(
  () => ({
    executable: app.isPackaged
      ? path.join(process.resourcesPath, 'ripple-device-events')
      : path.join(app.getAppPath(), 'out/native/ripple-device-events'),
    args: [],
  }),
  (chunk) => {
    cameraBuffer += chunk;
    if (cameraBuffer.length > 64 * 1024)
      throw new DiagnosticError('Camera event frame limit exceeded');
    let newline: number,
      ready = false;
    while ((newline = cameraBuffer.indexOf('\n')) !== -1) {
      const line = cameraBuffer.slice(0, newline);
      cameraBuffer = cameraBuffer.slice(newline + 1);
      if (line !== 'ready' && line !== 'camera') throw new DiagnosticError('Invalid camera event');
      cameraListenerError = undefined;
      cameraDirty = true;
      void refreshCamera().catch(() => {});
      ready = true;
    }
    return ready;
  },
  () => {
    cameraBuffer = '';
  },
  (error) => {
    cameraListenerError = error;
    emit();
  },
);
let unsubscribeBluez: (() => void) | undefined;
export function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!observing) {
    observing = true;
    unsubscribeBluez = bluez.subscribe(() => {
      bluetoothDirty = true;
      void refreshBluetooth().catch(() => {});
    });
    audioEvents.start();
    cameraEvents.start();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size) return;
    observing = false;
    audioGeneration++;
    unsubscribeBluez?.();
    unsubscribeBluez = undefined;
    bluez.close();
    audioEvents.close();
    cameraEvents.close();
    bluetooth = camera = microphone = undefined;
    pipeCamera = false;
    bluetoothError = cameraError = cameraListenerError = microphoneError = undefined;
  };
}
