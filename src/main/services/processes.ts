import { execFile, spawn } from 'node:child_process';

export function runCommand(
  executable: string,
  args: string[],
  options: { timeout?: number; maxBuffer?: number; signal?: AbortSignal } = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      executable,
      args,
      { windowsHide: true, encoding: 'utf8', timeout: 15_000, maxBuffer: 1024 * 1024, ...options },
      (error, stdout, stderr) => {
        if (error)
          reject(
            Object.assign(
              new Error(
                'System command failed (' + (error.code ?? error.signal ?? 'unknown') + ')',
                { cause: error },
              ),
              { code: error.code, signal: error.signal, killed: error.killed, stderr },
            ),
          );
        else resolve(stdout);
      },
    );
  });
}

export function spawnDetached(
  executable: string,
  args: string[],
  workingDirectory?: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      ...(workingDirectory ? { cwd: workingDirectory } : {}),
      detached: true,
      stdio: 'ignore',
      shell: false,
      windowsHide: true,
    });
    child.once('error', reject);
    child.once('spawn', () => {
      child.unref();
      resolve();
    });
  });
}
