import path from 'node:path';
import { runCommand } from '../../services/processes';

export const winrtAsync = String.raw`
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and
  $_.GetGenericArguments().Count -eq 1 -and $_.GetParameters().Count -eq 1 -and
  $_.GetParameters()[0].ParameterType.Name -eq ('IAsyncOperation'+[char]96+'1')
} | Select-Object -First 1
function Await-WinRT($operation, [Type]$resultType) {
  $task = $asTask.MakeGenericMethod($resultType).Invoke($null, @($operation))
  return $task.GetAwaiter().GetResult()
}
`;

export function powerShellLiteral(value: string): string {
  return "'" + value.replace(/'/g, "''") + "'";
}

export async function runPowerShell(
  script: string,
  options: {
    timeout?: number;
    maxBuffer?: number;
    apartment?: 'STA' | 'MTA';
    signal?: AbortSignal;
  } = {},
): Promise<string> {
  const preamble =
    "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8\n$ErrorActionPreference = 'Stop'\n$ProgressPreference = 'SilentlyContinue'\n";
  const executable = path.win32.join(
    process.env.SystemRoot || 'C:\\Windows',
    'System32',
    'WindowsPowerShell',
    'v1.0',
    'powershell.exe',
  );
  const wrapped =
    preamble +
    '\ntry {\n' +
    script +
    "\n} catch {\n$exception = $_.Exception\nwhile ($exception.InnerException) { $exception = $exception.InnerException }\n[Console]::Error.WriteLine('RIPPLE_WINDOWS_ERROR ' + $exception.HResult)\nexit 1\n}";
  try {
    return await runCommand(
      executable,
      [
        '-NoProfile',
        '-NonInteractive',
        options.apartment === 'MTA' ? '-MTA' : '-STA',
        '-EncodedCommand',
        Buffer.from(wrapped, 'utf16le').toString('base64'),
      ],
      options,
    );
  } catch (error) {
    const stderr =
      error && typeof error === 'object' && 'stderr' in error ? error.stderr : undefined;
    const nativeCode =
      typeof stderr === 'string'
        ? stderr.match(/^RIPPLE_WINDOWS_ERROR (-?\d+)\r?$/m)?.[1]
        : undefined;
    if (nativeCode) {
      throw Object.assign(
        new Error('Windows operation failed (0x' + (Number(nativeCode) >>> 0).toString(16) + ')', {
          cause: error,
        }),
        { code: Number(nativeCode) },
      );
    }
    throw error;
  }
}
