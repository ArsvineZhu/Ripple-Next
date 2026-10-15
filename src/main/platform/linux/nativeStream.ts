import { spawn, type ChildProcess } from 'node:child_process';
import { DiagnosticError } from '../../../shared/diagnosticError';

/** Persistent native event source. No sampling timer; failed sources restart with backoff. */
export function createNativeStream(
  command: () => { executable: string; args: string[] },
  consume: (chunk: string) => boolean,
  reset: () => void,
  failed: (error: unknown) => void,
) {
  let child: ChildProcess | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let startup: ReturnType<typeof setTimeout> | undefined;
  let active = false,
    failures = 0;
  let stopCurrent: (() => void) | undefined;
  function start() {
    active = true;
    if (child || retry) return;
    reset();
    const { executable, args } = command();
    const process = spawn(executable, args, { stdio: ['ignore', 'pipe', 'ignore'], shell: false });
    child = process;
    let ended = false;
    const stop = (error: unknown) => {
      if (ended) return;
      ended = true;
      if (startup) clearTimeout(startup);
      startup = undefined;
      if (child === process) child = undefined;
      process.kill();
      if (!active) return;
      retry = setTimeout(
        () => {
          retry = undefined;
          start();
        },
        Math.min(30_000, 1000 * 2 ** Math.min(failures++, 5)),
      );
      retry.unref();
      failed(error);
    };
    stopCurrent = () => stop(new DiagnosticError('Linux native listener stopped'));
    startup = setTimeout(
      () => stop(new DiagnosticError('Linux native listener startup timed out')),
      5000,
    );
    startup.unref();
    process.on('error', stop);
    process.on('exit', (code) =>
      stop(Object.assign(new DiagnosticError('Linux native listener exited'), { code })),
    );
    process.stdout!.setEncoding('utf8');
    const data = (chunk: string) => {
      if (ended || !active) return;
      try {
        if (consume(chunk)) {
          failures = 0;
          if (startup) clearTimeout(startup);
          startup = undefined;
        }
      } catch (error) {
        stop(error);
      }
    };
    process.once('spawn', () => data(''));
    process.stdout!.on('data', data);
  }
  return {
    start,
    close() {
      active = false;
      if (retry) clearTimeout(retry);
      if (startup) clearTimeout(startup);
      retry = startup = undefined;
      stopCurrent?.();
      stopCurrent = undefined;
    },
  };
}
