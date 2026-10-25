import { app } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { getIconPath } from '../../assets';
import { loginLaunchArgument } from '../loginLaunch';

function desktopExecArgument(value: string) {
  return `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('%', '%%')}"`;
}

function autostartEntryPath() {
  const defaultConfigHome = path.join(app.getPath('home'), '.config');
  const configuredHome = process.env.XDG_CONFIG_HOME;
  const configHome =
    configuredHome && path.isAbsolute(configuredHome) ? configuredHome : defaultConfigHome;
  return path.join(configHome, 'autostart', 'ripple-next.desktop');
}

export async function loginLaunchRegistered() {
  try {
    const content = await fs.readFile(autostartEntryPath(), 'utf8');
    return content.includes(loginLaunchArgument);
  } catch {
    return false;
  }
}

export async function setAutoLaunch(enable: boolean): Promise<void> {
  const nextEntryPath = autostartEntryPath();
  const autostartPath = path.dirname(nextEntryPath);

  if (!enable) {
    await fs.rm(nextEntryPath, { force: true });
    return;
  }

  await fs.mkdir(autostartPath, { recursive: true });
  const temporaryPath = path.join(autostartPath, `.ripple-next.${randomUUID()}.tmp`);
  const content = `[Desktop Entry]
Type=Application
Version=1.0
Name=Ripple Next
StartupWMClass=ripple-next
Comment=Ripple Next Desktop Island
Exec=${desktopExecArgument(app.getPath('exe'))} --ozone-platform=x11 ${loginLaunchArgument}
Icon=${getIconPath()}
Terminal=false
StartupNotify=false
`;
  await fs.writeFile(temporaryPath, content, { encoding: 'utf8', mode: 0o644, flag: 'wx' });
  try {
    await fs.rename(temporaryPath, nextEntryPath);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true });
    throw error;
  }
}
