import fs from 'node:fs';
import path from 'node:path';
import { installedChromeSandbox, resolveLinuxSandbox } from './linuxSandbox';

const electronArgs = process.argv.slice(2);

function setuidRoot(filePath: string): boolean {
  try {
    const stat = fs.statSync(filePath);
    return stat.uid === 0 && (stat.mode & 0o4000) !== 0 && (stat.mode & 0o001) !== 0;
  } catch {
    return false;
  }
}

function sameBytes(left: string, right: string): boolean {
  try {
    return fs.readFileSync(left).equals(fs.readFileSync(right));
  } catch {
    return false;
  }
}

function prepareLinuxSandbox(): void {
  if (process.platform !== 'linux') return;
  const bundled = path.resolve(__dirname, '../node_modules/electron/dist/chrome-sandbox');
  const hidden = `${bundled}.dev-hidden`;
  const bundledExists = fs.existsSync(bundled);
  const hiddenExists = fs.existsSync(hidden);
  const reference = bundledExists ? bundled : hiddenExists ? hidden : undefined;
  const helper = resolveLinuxSandbox({
    platform: process.platform,
    configured: process.env.CHROME_DEVEL_SANDBOX,
    bundledSetuidRoot: bundledExists && setuidRoot(bundled),
    installedSetuidRoot: setuidRoot(installedChromeSandbox),
    sameBytes: reference ? sameBytes(reference, installedChromeSandbox) : false,
  });
  const restore = () => {
    if (!fs.existsSync(bundled) && fs.existsSync(hidden)) fs.renameSync(hidden, bundled);
  };
  if (!helper) {
    if (bundledExists && hiddenExists) fs.rmSync(hidden);
    else restore();
    return;
  }
  if (bundledExists) fs.renameSync(bundled, hidden);
  process.env.CHROME_DEVEL_SANDBOX = helper;
  process.on('exit', restore);
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
    process.on(signal, () => {
      restore();
      process.exit(128 + (signal === 'SIGINT' ? 2 : signal === 'SIGTERM' ? 15 : 1));
    });
  }
}

prepareLinuxSandbox();

if (
  process.platform === 'linux' &&
  (process.env.XDG_SESSION_TYPE === 'wayland' || process.env.WAYLAND_DISPLAY)
) {
  electronArgs.unshift('--ozone-platform=x11');
}

// The CLI launches console commands to re-check pnpm configuration on every
// start. The start API keeps Windows development inside the invoking terminal.
void import('@electron-forge/core')
  .then(({ api }) => api.start({ dir: path.resolve(__dirname, '..'), args: electronArgs }))
  .then((child) => {
    child.on('error', (error) => {
      console.error('Failed to start Electron:', error);
      process.exitCode = 1;
    });
    child.on('exit', (code, signal) => {
      if (!child.restarted) process.exit(code ?? (signal ? 1 : 0));
    });
  })
  .catch((error) => {
    console.error('Failed to start Electron Forge:', error);
    process.exit(1);
  });
