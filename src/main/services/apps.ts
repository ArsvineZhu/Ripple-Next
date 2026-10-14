import { shell } from 'electron';
import type { LaunchTarget, LaunchResult } from '../../shared/launch';
import { createPlatformApplications } from '../platform/apps';
import { spawnDetached } from './processes';

export function createAppService(
  reportFailure: (error: unknown, index: number, kind: LaunchTarget['kind']) => void,
  discoveryCacheMs = 300_000,
) {
  const applications = createPlatformApplications(discoveryCacheMs);
  return {
    discoverApps: applications.discover,
    async launchTargets(targets: LaunchTarget[]): Promise<LaunchResult> {
      const failures: LaunchResult['failures'] = [];
      for (const [index, target] of targets.entries()) {
        try {
          if (target.kind === 'url') await shell.openExternal(target.url);
          else if (target.kind === 'command')
            await spawnDetached(target.executable, target.args, target.workingDirectory);
          else await applications.launch(target);
        } catch (error) {
          reportFailure(error, index, target.kind);
          failures.push({ index, detail: error instanceof Error ? error.message : String(error) });
        }
      }
      return { failures };
    },
  };
}
