import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { DiagnosticError } from '../../../shared/diagnosticError';
import { runPowerShell, powerShellLiteral } from './powershell';
import source from './nativeRuntime.cs?raw';

export type NativeEvent =
  { kind: 'media' | 'devices'; value: unknown } | { kind: 'error'; scope: string; code: number };
async function executable() {
  const directory = path.join(os.tmpdir(), 'Ripple Next', 'native-runtime');
  await fs.mkdir(directory, { recursive: true });
  const file = path.join(
    directory,
    createHash('sha256').update(source).digest('hex').slice(0, 20) + '.exe',
  );
  try {
    await fs.access(file);
    return file;
  } catch {
    /* Compile this source revision once. */
  }
  const sourceFile = file + '.cs';
  await fs.writeFile(sourceFile, source, 'utf8');
  await runPowerShell(
    `
$compiler = New-Object Microsoft.CSharp.CSharpCodeProvider
$parameters = New-Object System.CodeDom.Compiler.CompilerParameters
$parameters.GenerateExecutable = $true
$target = ${powerShellLiteral(file)}
$staging = $target + '.' + [Guid]::NewGuid().ToString('N') + '.exe'
$parameters.OutputAssembly = $staging
@('System.dll','System.Core.dll','System.Web.Extensions.dll','System.Runtime.dll','System.Runtime.WindowsRuntime.dll','System.Runtime.InteropServices.WindowsRuntime.dll','Windows.Media','Windows.Storage','Windows.Foundation','Windows.Devices') | ForEach-Object {
  $reference = if ($_.StartsWith('Windows.')) { Join-Path $env:SystemRoot ('System32/WinMetadata/' + $_ + '.winmd') } else { $_ }
  $null = $parameters.ReferencedAssemblies.Add($reference)
}
try {
  $result = $compiler.CompileAssemblyFromFile($parameters, ${powerShellLiteral(sourceFile)})
  if ($result.Errors.HasErrors) { throw 'Native runtime compilation failed' }
  try { Move-Item -LiteralPath $staging -Destination $target -ErrorAction Stop }
  catch { if (-not (Test-Path -LiteralPath $target)) { throw } }
} finally { $compiler.Dispose(); if (Test-Path -LiteralPath $staging) { Remove-Item -LiteralPath $staging } }
`,
    { timeout: 20_000 },
  );
  return file;
}

/** Supervised JSON-lines executor. Commands are never replayed after a crash. */
export function createNativeRuntime(resolveExecutable: () => Promise<string> = executable) {
  const listeners = new Set<(event: NativeEvent) => void>();
  const pending = new Map<
    number,
    {
      resolve(value: unknown): void;
      reject(error: unknown): void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  let child: ChildProcessWithoutNullStreams | undefined;
  let starting: Promise<void> | undefined;
  let closed = false,
    sequence = 0,
    failures = 0;
  let retry: ReturnType<typeof setTimeout> | undefined;
  const emit = (event: NativeEvent) => listeners.forEach((listener) => listener(event));
  function unavailable(code?: number | string) {
    return Object.assign(
      new DiagnosticError('Windows native executor unavailable'),
      code === undefined ? {} : { code },
    );
  }
  function schedule() {
    if (closed || retry || !listeners.size) return;
    retry = setTimeout(
      () => {
        retry = undefined;
        void ensure().catch(() => {});
      },
      Math.min(30_000, 1000 * 2 ** Math.min(failures++, 5)),
    );
    retry.unref();
  }
  async function ensure() {
    if (closed) throw unavailable();
    if (starting) return starting;
    if (child) return;
    starting = (async () => {
      const file = await resolveExecutable();
      if (closed) throw unavailable();
      await new Promise<void>((resolve, reject) => {
        const process = spawn(file, [String(globalThis.process.pid)], {
          windowsHide: true,
          stdio: 'pipe',
        });
        child = process;
        let buffer = '',
          ready = false,
          ended = false;
        const startupTimer = setTimeout(() => stop(unavailable('NATIVE_START_TIMEOUT')), 15_000);
        function stop(error: unknown) {
          if (ended) return;
          ended = true;
          clearTimeout(startupTimer);
          if (child === process) child = undefined;
          process.kill();
          for (const item of pending.values()) {
            clearTimeout(item.timer);
            item.reject(error);
          }
          pending.clear();
          if (!ready) reject(error);
          if (!closed) {
            emit({ kind: 'error', scope: 'runtime', code: -1 });
            schedule();
          }
        }
        process.on('error', (error) => stop(error));
        process.on('exit', (code) => stop(unavailable(code ?? 'NATIVE_EXIT')));
        process.stdin.on('error', (error) => stop(error));
        process.stdout.setEncoding('utf8');
        process.stderr.resume(); // Native stderr must never expose metadata or request payloads.
        process.stdout.on('data', (chunk: string) => {
          buffer += chunk;
          if (buffer.length > 12 * 1024 * 1024) {
            stop(unavailable('NATIVE_FRAME_LIMIT'));
            return;
          }
          let newline: number;
          while ((newline = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, newline);
            buffer = buffer.slice(newline + 1);
            try {
              const message = JSON.parse(line);
              if (message.kind === 'ready') {
                ready = true;
                failures = 0;
                clearTimeout(startupTimer);
                resolve();
              } else if (message.kind === 'response' && Number.isSafeInteger(message.id)) {
                const request = pending.get(message.id);
                if (!request) continue;
                pending.delete(message.id);
                clearTimeout(request.timer);
                if (message.ok === true) request.resolve(message.value);
                else
                  request.reject(
                    unavailable(typeof message.code === 'number' ? message.code : undefined),
                  );
              } else if (message.kind === 'media' || message.kind === 'devices')
                emit({ kind: message.kind, value: message.value });
              else if (
                message.kind === 'error' &&
                typeof message.scope === 'string' &&
                typeof message.code === 'number'
              )
                emit(message);
              else throw unavailable('NATIVE_PROTOCOL');
            } catch {
              stop(unavailable('NATIVE_PROTOCOL'));
              return;
            }
          }
        });
      });
    })()
      .catch((error) => {
        schedule();
        throw error;
      })
      .finally(() => {
        starting = undefined;
      });
    return starting;
  }
  return {
    subscribe(listener: (event: NativeEvent) => void) {
      listeners.add(listener);
      void ensure().catch(() => {});
      return () => {
        listeners.delete(listener);
      };
    },
    async request(
      method: 'media' | 'devices' | 'control' | 'open',
      fields: Record<string, string> = {},
    ) {
      await ensure();
      if (!child || pending.size >= 128) throw unavailable();
      const process = child,
        id = ++sequence;
      return new Promise<unknown>((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(unavailable('NATIVE_COMMAND_TIMEOUT'));
          // A timed-out native operation may have taken effect; never retry it.
          process.kill();
        }, 5000);
        pending.set(id, { resolve, reject, timer });
        process.stdin.write(JSON.stringify({ ...fields, method, id }) + '\n');
      });
    },
    close() {
      closed = true;
      if (retry) clearTimeout(retry);
      listeners.clear();
      for (const item of pending.values()) {
        clearTimeout(item.timer);
        item.reject(unavailable());
      }
      pending.clear();
      child?.stdin.end();
      child?.kill();
      child = undefined;
    },
  };
}
export const windowsRuntime = createNativeRuntime();
