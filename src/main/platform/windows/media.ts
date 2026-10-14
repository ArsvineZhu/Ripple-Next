import { z } from 'zod';
import type { MediaCommand, MediaSession } from '../../../shared/media';
import { powerShellLiteral, runPowerShell, winrtAsync } from './powershell';
import { mediaArtworkBridge } from './mediaArtwork';
import { shell } from 'electron';

const manager =
  winrtAsync +
  String.raw`
$managerType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]
$manager = Await-WinRT ($managerType::RequestAsync()) $managerType
`;
const sessionSchema = z.object({
  Id: z.string(),
  Source: z.string(),
  ApplicationPath: z.string().nullable(),
  Title: z.string(),
  Artist: z.string(),
  Album: z.string(),
  Artwork: z.string().nullable(),
  Current: z.boolean(),
  Status: z.string(),
  Previous: z.boolean(),
  Next: z.boolean(),
  Play: z.boolean(),
  Pause: z.boolean(),
  Toggle: z.boolean(),
});
const applicationPaths = new Map<string, string>();
export async function getMediaSessions() {
  const output = await runPowerShell(
    manager +
      (await mediaArtworkBridge()) +
      String.raw`
$current = $manager.GetCurrentSession()
$all = @($manager.GetSessions())
$sessions = @()
$failures = @()
$errors = @()
$artworkBytes = 0
$duplicates = @{}
foreach ($session in $all) {
  $source = [string]$session.SourceAppUserModelId
  $sameSource = @($all | Where-Object { $_.SourceAppUserModelId -eq $source }).Count
  $id = $source
  if ($sameSource -gt 1) { $duplicates[$source] = [int]$duplicates[$source] + 1; $id += '#' + $duplicates[$source] }
  try {
    $propertiesType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties, Windows.Media.Control, ContentType = WindowsRuntime]
    $props = Await-WinRT ($session.TryGetMediaPropertiesAsync()) $propertiesType
    $info = $session.GetPlaybackInfo()
    $artwork = $null
    if ($props.Thumbnail) {
      $stream = $null
      $reader = $null
      try {
        $streamType = [Windows.Storage.Streams.IRandomAccessStreamWithContentType, Windows.Storage.Streams, ContentType = WindowsRuntime]
        $stream = Await-WinRT ($props.Thumbnail.OpenReadAsync()) $streamType
        $size = [RippleMediaArtwork]::Size($stream)
        $mime = ([RippleMediaArtwork]::Mime($stream) -split ',')[0]
        $reader = [RippleMediaArtwork]::Reader($stream)
        if ($size -gt 0 -and $artworkBytes + $size -le 5MB) {
          $null = Await-WinRT ($reader.LoadAsync([uint32]$size)) ([uint32])
          $buffer = New-Object byte[] ([int]$size)
          $reader.ReadBytes($buffer)
          $artwork = 'data:' + $mime + ';base64,' + [Convert]::ToBase64String($buffer)
          $artworkBytes += $size
        }
      } catch { $artwork = $null } finally {
        if ($reader) { $reader.Dispose() }
        elseif ($stream) { $null = [System.Runtime.InteropServices.Marshal]::ReleaseComObject($stream) }
      }
    }
    $unique = $sameSource -eq 1
    $applicationPath = $null
    if ($unique -and $source -match '^[^\\/:*?"<>|]+[.]exe$') {
      try {
        $paths = @(Get-Process -Name ([IO.Path]::GetFileNameWithoutExtension($source)) -ErrorAction SilentlyContinue | ForEach-Object { $_.Path } | Where-Object { $_ } | Sort-Object -Unique)
        if ($paths.Count -eq 1) { $applicationPath = $paths[0] }
      } catch { $applicationPath = $null }
    }
    $sessions += @{ Id = $id; Source = $source; Title = [string]$props.Title; Artist = [string]$props.Artist; Album = [string]$props.AlbumTitle;
      ApplicationPath = $applicationPath;
      Artwork = $artwork; Status = $info.PlaybackStatus.ToString().ToLowerInvariant(); Current = [bool]($current -and $current.SourceAppUserModelId -eq $source);
      Previous = [bool]($unique -and $info.Controls.IsPreviousEnabled); Next = [bool]($unique -and $info.Controls.IsNextEnabled);
      Play = [bool]($unique -and $info.Controls.IsPlayEnabled); Pause = [bool]($unique -and $info.Controls.IsPauseEnabled); Toggle = [bool]($unique -and $info.Controls.IsPlayPauseToggleEnabled) }
  } catch {
    $failures += $id
    $errors += @{ Code = $_.Exception.HResult; Line = $_.InvocationInfo.ScriptLineNumber; Kind = $_.Exception.GetType().Name }
  }
}
@{ Sessions = @($sessions); FailedIds = @($failures); Errors = @($errors) } | ConvertTo-Json -Depth 4 -Compress
`,
    { maxBuffer: 10 * 1024 * 1024, apartment: 'MTA' },
  );
  const data = z
    .object({
      Sessions: z.array(sessionSchema),
      FailedIds: z.array(z.string()),
      Errors: z.array(z.object({ Code: z.number(), Line: z.number(), Kind: z.string() })),
    })
    .parse(JSON.parse(output));
  applicationPaths.clear();
  for (const item of data.Sessions) {
    if (item.ApplicationPath) applicationPaths.set(item.Id, item.ApplicationPath);
    else if (item.Id === item.Source && item.Source.includes('!'))
      applicationPaths.set(item.Id, 'shell:AppsFolder\\' + item.Source);
  }
  return {
    failedIds: data.FailedIds,
    errors: data.Errors.map((error) =>
      Object.assign(new Error('Windows media query failed at line ' + error.Line), {
        code: error.Code,
        name: error.Kind,
      }),
    ),
    sessions: data.Sessions.map((item): MediaSession => ({
      id: item.Id,
      source: item.Source,
      playerName: item.Source.replace(/\.exe$/i, ''),
      name: item.Title,
      artist: item.Artist,
      album: item.Album,
      artworkUrl: item.Artwork,
      isCurrent: item.Current,
      state:
        item.Status === 'playing' || item.Status === 'paused' || item.Status === 'stopped'
          ? item.Status
          : 'unknown',
      capabilities: {
        previous: item.Previous,
        next: item.Next,
        play: item.Play,
        pause: item.Pause,
        toggle: item.Toggle,
      },
    })),
  };
}
export async function controlSystemMedia(
  command: MediaCommand,
  target: MediaSession,
): Promise<void> {
  const operation = {
    previous: 'TrySkipPreviousAsync',
    next: 'TrySkipNextAsync',
    playpause: 'TryTogglePlayPauseAsync',
  }[command];
  await runPowerShell(
    manager +
      `
$sessions = @($manager.GetSessions() | Where-Object { $_.SourceAppUserModelId -eq ${powerShellLiteral(target.source)} })
if ($sessions.Count -ne 1) { throw 'Media session unavailable or ambiguous' }
$session = $sessions[0]
$controls = $session.GetPlaybackInfo().Controls
` +
      (command === 'playpause'
        ? String.raw`
if ($session.GetPlaybackInfo().PlaybackStatus.ToString() -eq 'Playing' -and $controls.IsPauseEnabled) {
  $accepted = Await-WinRT ($session.TryPauseAsync()) ([bool])
} elseif ($controls.IsPlayEnabled) { $accepted = Await-WinRT ($session.TryPlayAsync()) ([bool])
} elseif ($controls.IsPlayPauseToggleEnabled) { $accepted = Await-WinRT ($session.TryTogglePlayPauseAsync()) ([bool])
} else { throw 'Media command unsupported' }
`
        : `
if (-not $controls.${command === 'previous' ? 'IsPreviousEnabled' : 'IsNextEnabled'}) { throw 'Media command unsupported' }
$accepted = Await-WinRT ($session.${operation}()) ([bool])
`) +
      "\nif (-not $accepted) { throw 'Media command declined' }",
  );
}
export async function openMediaSession(target: MediaSession): Promise<void> {
  // Resolve identities during the normal query; opening must not wait for another
  // metadata/thumbnail read or another PowerShell process for desktop players.
  const applicationPath = applicationPaths.get(target.id);
  if (!applicationPath) throw new Error('Media application path unavailable or ambiguous');
  if (applicationPath.startsWith('shell:')) {
    await runPowerShell('Start-Process -FilePath ' + powerShellLiteral(applicationPath));
  } else {
    const error = await shell.openPath(applicationPath);
    if (error) throw new Error('Media application activation failed');
  }
}
