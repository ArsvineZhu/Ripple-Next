import dbus, { type Message, type MessageBus } from 'dbus-native';
import { DiagnosticError } from '../../../shared/diagnosticError';

/** One D-Bus connection and match set; only reconnects after transport failure. */
export function createSignalBus(
  kind: 'session' | 'system',
  rules: string[],
  accepts: (message: Message) => boolean,
) {
  const listeners = new Set<() => void>();
  let bus: MessageBus | undefined;
  let ready: Promise<MessageBus> | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let failures = 0;
  const emit = () => listeners.forEach((listener) => listener());
  function schedule() {
    if (retry || !listeners.size) return;
    retry = setTimeout(
      () => {
        retry = undefined;
        void get().catch(() => {});
      },
      Math.min(30_000, 1000 * 2 ** Math.min(failures++, 5)),
    );
    retry.unref();
  }
  function get(): Promise<MessageBus> {
    if (ready) return ready;
    if (retry) return Promise.reject(new DiagnosticError('Linux event bus reconnecting'));
    let current: MessageBus;
    try {
      current =
        kind === 'session'
          ? dbus.sessionBus({ timeout: 5000, maxMessageSize: 8 * 1024 * 1024 })
          : dbus.createClient({
              busAddress:
                process.env.DBUS_SYSTEM_BUS_ADDRESS || 'unix:path=/var/run/dbus/system_bus_socket',
              timeout: 5000,
              maxMessageSize: 8 * 1024 * 1024,
            });
    } catch (error) {
      schedule();
      return Promise.reject(error);
    }
    bus = current;
    const lost = () => {
      if (bus !== current) return;
      bus = undefined;
      ready = undefined;
      current.connection.end();
      schedule();
      emit();
    };
    current.on('error', lost);
    current.connection.on('close', lost);
    current.connection.on('message', (message) => {
      if (bus === current && message.type === 4 && accepts(message)) emit();
    });
    ready = Promise.all(rules.map((rule) => current.addMatch(rule)))
      .then(() => {
        if (bus !== current) throw new DiagnosticError('Linux event bus disconnected');
        failures = 0;
        emit();
        return current;
      })
      .catch((error: unknown) => {
        lost();
        throw error;
      });
    return ready;
  }
  return {
    get,
    subscribe(listener: () => void) {
      listeners.add(listener);
      void get().catch(() => {});
      return () => {
        listeners.delete(listener);
        if (!listeners.size && retry) {
          clearTimeout(retry);
          retry = undefined;
        }
      };
    },
    close() {
      listeners.clear();
      if (retry) clearTimeout(retry);
      retry = undefined;
      const current = bus;
      bus = undefined;
      ready = undefined;
      current?.connection.end();
    },
  };
}
