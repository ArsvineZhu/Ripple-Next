import { z } from 'zod';
import { DiagnosticError } from '../../../shared/diagnosticError';
import { windowsRuntime } from './nativeRuntime';
const statusSchema = z.object({
  bluetooth: z.boolean().nullable(),
  camera: z.boolean().nullable(),
  microphone: z.boolean().nullable(),
});
const failures = new Map<string, number>();
export function subscribe(listener: () => void) {
  return windowsRuntime.subscribe((event) => {
    if (event.kind === 'devices') {
      const data = statusSchema.safeParse(event.value);
      if (data.success)
        for (const [key, value] of Object.entries(data.data))
          if (value !== null) failures.delete(key);
      listener();
    } else if (
      event.kind === 'error' &&
      ['runtime', 'bluetooth', 'capture'].includes(event.scope)
    ) {
      const keys =
        event.scope === 'bluetooth'
          ? ['bluetooth']
          : event.scope === 'capture'
            ? ['camera', 'microphone']
            : ['bluetooth', 'camera', 'microphone'];
      keys.forEach((key) => failures.set(key, event.code));
      listener();
    }
  });
}
async function status(key: keyof z.infer<typeof statusSchema>) {
  if (failures.has(key))
    throw Object.assign(new DiagnosticError('Windows device listener failed'), {
      code: failures.get(key),
    });
  const data = statusSchema.parse(await windowsRuntime.request('devices'));
  if (data[key] === null) throw new DiagnosticError('Windows device listener is not ready');
  return data[key];
}
export const getBluetoothStatus = () => status('bluetooth');
export const getCameraStatus = () => status('camera');
export const getMicrophoneStatus = () => status('microphone');
