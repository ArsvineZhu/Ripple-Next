import { DiagnosticError } from '../../../shared/diagnosticError';
import { app } from 'electron';

export async function setAutoLaunch(enable: boolean): Promise<void> {
  if (!app.isPackaged)
    throw new DiagnosticError('macOS login items require a packaged application');
  app.setLoginItemSettings({ openAtLogin: enable });
  if (app.getLoginItemSettings().openAtLogin !== enable)
    throw new DiagnosticError('macOS did not accept the login item setting');
}
