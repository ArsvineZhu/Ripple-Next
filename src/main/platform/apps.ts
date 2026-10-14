import { DiagnosticError } from '../../shared/diagnosticError';
import { windowsApplications } from './windows/apps';
import { macosApplications } from './macos/apps';
import { linuxApplications } from './linux/apps';
import type { Application } from '../../shared/launch';

/** Platform selection stays at the adapter boundary. */
export function createPlatformApplications(discoveryCacheMs: number) {
  const adapter =
    process.platform === 'win32'
      ? windowsApplications(discoveryCacheMs)
      : process.platform === 'darwin'
        ? macosApplications
        : linuxApplications;
  return {
    discover: adapter.discover,
    launch(application: Application) {
      if (application.native && application.native.platform !== process.platform)
        throw new DiagnosticError('Application belongs to another platform');
      return adapter.launch(application);
    },
  };
}
