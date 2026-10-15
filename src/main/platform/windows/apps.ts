import { DiagnosticError } from '../../../shared/diagnosticError';
import type { Application } from '../../../shared/launch';
import fs from 'node:fs/promises';
import { shell } from 'electron';
import { parseCommand } from './commands';
import { powerShellLiteral, runPowerShell } from './powershell';
import { spawnDetached } from '../../services/processes';

// Keep shortcuts intact: their arguments and working directory belong to Windows.
async function buildCache(): Promise<Application[]> {
  const output = await runPowerShell(
    String.raw`
$shell = New-Object -ComObject WScript.Shell
$dirs = @([Environment]::GetFolderPath('CommonPrograms'), [Environment]::GetFolderPath('Programs'))
$results = [System.Collections.Generic.List[object]]::new()
foreach ($dir in $dirs) {
  if (-not (Test-Path -LiteralPath $dir)) { continue }
  Get-ChildItem -LiteralPath $dir -Recurse -Filter '*.lnk' -ErrorAction SilentlyContinue | ForEach-Object {
    $shortcut = $shell.CreateShortcut($_.FullName)
    $target = $shortcut.TargetPath
    if ($target -and $target.EndsWith('.exe', [StringComparison]::OrdinalIgnoreCase) -and
        $target -notlike '*\explorer.exe' -and $target -notmatch 'WindowsApps' -and
        (Test-Path -LiteralPath $target)) {
      $results.Add([PSCustomObject]@{ name = $_.BaseName; identifier = $_.FullName })
    }
  }
}
Get-StartApps | Where-Object { $_.AppID -match '.+!.+' } | ForEach-Object {
  $results.Add([PSCustomObject]@{ name = $_.Name; identifier = 'shell:AppsFolder\' + $_.AppID })
}
ConvertTo-Json -InputObject @($results.ToArray()) -Compress
`,
    { timeout: 30_000, maxBuffer: 5 * 1024 * 1024 },
  );
  const items: unknown = JSON.parse(output);
  if (!Array.isArray(items))
    throw new DiagnosticError('Invalid Windows application discovery response');
  const seen = new Set<string>();
  return items
    .flatMap((item): Application[] => {
      if (!item || typeof item.name !== 'string' || typeof item.identifier !== 'string') {
        throw new DiagnosticError('Invalid Windows application entry');
      }
      const key = item.identifier.toLowerCase();
      if (seen.has(key)) return [];
      seen.add(key);
      return [
        {
          kind: 'application',
          name: item.name,
          native: { platform: 'win32', identifier: item.identifier },
        },
      ];
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function windowsApplications(cacheMs: number) {
  let catalog: { expiresAt: number; value: Promise<Application[]> } | undefined;
  const discover = async (query: string) => {
    if (!catalog || Date.now() >= catalog.expiresAt) {
      const value = buildCache();
      catalog = { expiresAt: Date.now() + cacheMs, value };
      void value.catch(() => {
        if (catalog?.value === value) catalog = undefined;
      });
    }
    const needle = query.trim().toLocaleLowerCase();
    return (await catalog.value)
      .filter((entry) => entry.name.toLocaleLowerCase().includes(needle))
      .slice(0, 20);
  };
  return {
    discover,
    async launch(target: Application) {
      if (target.native) return launchWindowsEntry(target.native.identifier);
      if (!/[\\/]/.test(target.name)) {
        const entry = (await discover(target.name)).find(
          (item) => item.name.toLocaleLowerCase() === target.name.toLocaleLowerCase(),
        );
        if (entry?.native) return launchWindowsEntry(entry.native.identifier);
      }
      return launchWindows(target.name);
    },
  };
}

export async function launchWindowsEntry(identifier: string): Promise<void> {
  if (/^shell:/i.test(identifier)) {
    // Start-Process uses ShellExecuteEx; Explorer's exit code is not an activation result.
    await runPowerShell('Start-Process -FilePath ' + powerShellLiteral(identifier));
  } else if (/\.(exe|com)$/i.test(identifier)) {
    await spawnDetached(identifier, []);
  } else {
    const error = await shell.openPath(identifier);
    if (error) throw new Error(error);
  }
}

export async function launchWindows(input: string): Promise<void> {
  const trimmed = input.trim();
  if (/^shell:/i.test(trimmed)) return launchWindowsEntry(trimmed);
  const candidate = trimmed
    .replace(/^"(.*)"$/, '$1')
    .replace(/%([^%]+)%/g, (_, name) => process.env[name] || '%' + name + '%');
  if (
    await fs.stat(candidate).then(
      () => true,
      () => false,
    )
  ) {
    const error = await shell.openPath(candidate);
    if (error) throw new Error(error);
    return;
  }
  const { exe, args } = parseCommand(trimmed);
  if (/\.ps1$/i.test(exe)) {
    await spawnDetached('powershell.exe', ['-NoProfile', '-File', exe, ...args]);
  } else if (/\.(cmd|bat)$/i.test(exe)) {
    await runPowerShell(
      'Start-Process -FilePath ' +
        powerShellLiteral(exe) +
        (args.length
          ? ' -ArgumentList ' +
            powerShellLiteral(args.map((arg) => '"' + arg.replace(/"/g, '""') + '"').join(' '))
          : ''),
    );
  } else {
    await spawnDetached(exe, args);
  }
}
