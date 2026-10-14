import { DiagnosticError } from '../../../shared/diagnosticError';
import { app } from 'electron';
export async function setAutoLaunch(enable: boolean): Promise<void> {
  if (!app.isPackaged)
    throw new DiagnosticError('Windows login items require a packaged application');
  app.setLoginItemSettings({
    openAtLogin: enable,
    path: app.getPath('exe'),
  });
  if (app.getLoginItemSettings({ path: app.getPath('exe') }).openAtLogin !== enable)
    throw new DiagnosticError('Windows did not accept the login item setting');
}
