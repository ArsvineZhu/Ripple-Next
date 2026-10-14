import { app } from 'electron';

export async function setAutoLaunch(enable: boolean): Promise<void> {
  if (!app.isPackaged) throw new Error('macOS login items require a packaged application');
  app.setLoginItemSettings({ openAtLogin: enable });
  if (app.getLoginItemSettings().openAtLogin !== enable)
    throw new Error('macOS did not accept the login item setting');
}
