import { DiagnosticError } from '../../../shared/diagnosticError';
import { app } from 'electron';
import { loginLaunchArgument } from '../loginLaunch';

export function loginLaunchRegistered() {
  if (!app.isPackaged) return true;
  const path = app.getPath('exe');
  return app.getLoginItemSettings({ path, args: [loginLaunchArgument] }).openAtLogin;
}

export async function setAutoLaunch(enable: boolean): Promise<void> {
  if (!app.isPackaged)
    throw new DiagnosticError('Windows login items require a packaged application');
  const path = app.getPath('exe');
  const args = [loginLaunchArgument];
  app.setLoginItemSettings({ openAtLogin: enable, path, args });
  if (app.getLoginItemSettings({ path, args }).openAtLogin !== enable)
    throw new DiagnosticError('Windows did not accept the login item setting');
}
