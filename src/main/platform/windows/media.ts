import { DiagnosticError } from '../../../shared/diagnosticError';
import { z } from 'zod';
import type { MediaCommand, MediaSession } from '../../../shared/media';
import { runPowerShell } from './powershell';
import { windowsRuntime } from './nativeRuntime';

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
let startApps: { expires: number; entries: Map<string, string> } | undefined;
let appLookup: Promise<Map<string, string>> | undefined;
async function registeredApplications() {
  if (startApps && Date.now() < startApps.expires) return startApps.entries;
  if (!appLookup)
    appLookup = loadApplications().finally(() => {
      appLookup = undefined;
    });
  if (startApps) {
    // Revalidating names/registered identities must never block a playback command.
    startApps.expires = Date.now() + 300_000;
    void appLookup.catch(() => {});
    return startApps.entries;
  }
  return appLookup;
}
async function loadApplications() {
  const output = await runPowerShell(
    'ConvertTo-Json -InputObject @(Get-StartApps | Select-Object AppID, Name) -Compress',
  );
  const entries = z
    .array(z.object({ AppID: z.string(), Name: z.string() }))
    .parse(JSON.parse(output));
  startApps = {
    expires: Date.now() + 300_000,
    entries: new Map(entries.map((item) => [item.AppID, item.Name])),
  };
  return startApps.entries;
}
export async function getMediaSessions() {
  if (readFailure) throw readFailure;
  const output = nativeSnapshot ?? (await windowsRuntime.request('media'));
  const data = z
    .object({
      Sessions: z.array(sessionSchema),
      FailedIds: z.array(z.string()),
      Errors: z.array(z.object({ Code: z.number(), Kind: z.string() })),
    })
    .parse(output);
  const errors: unknown[] = data.Errors.map((error) =>
    Object.assign(new DiagnosticError('Windows media session update failed'), {
      code: error.Code,
      name: error.Kind,
    }),
  );
  let registered = new Map<string, string>();
  if (
    data.Sessions.some(
      (item) => !item.ApplicationPath && item.Id === item.Source && !item.Source.includes('!'),
    )
  ) {
    try {
      registered = await registeredApplications();
    } catch (error) {
      errors.push(
        new DiagnosticError('Windows media application identity lookup failed', [], {
          cause: error,
        }),
      );
    }
  }
  applicationPaths.clear();
  for (const item of data.Sessions) {
    if (item.Id !== item.Source) continue;
    if (item.ApplicationPath) applicationPaths.set(item.Id, item.ApplicationPath);
    else if (item.Source.includes('!') || registered.has(item.Source))
      applicationPaths.set(item.Id, 'shell:AppsFolder\\' + item.Source);
  }
  return {
    failedIds: data.FailedIds,
    errors,
    sessions: data.Sessions.map((item): MediaSession => ({
      id: item.Id,
      source: item.Source,
      playerName: registered.get(item.Source) ?? item.Source.replace(/\.exe$/i, ''),
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
  await windowsRuntime.request('control', { command, source: target.source });
}
export async function openMediaSession(target: MediaSession): Promise<void> {
  const applicationPath = applicationPaths.get(target.id);
  if (!applicationPath)
    throw new DiagnosticError('Media application path unavailable or ambiguous');
  await windowsRuntime.request('open', { target: applicationPath });
}
let readFailure: Error | undefined;
let nativeSnapshot: unknown;
export function subscribe(listener: () => void) {
  return windowsRuntime.subscribe((event) => {
    if (event.kind === 'media') {
      readFailure = undefined;
      nativeSnapshot = event.value;
      listener();
    } else if (event.kind === 'error' && ['media', 'runtime'].includes(event.scope)) {
      readFailure = Object.assign(new DiagnosticError('Windows media listener failed'), {
        code: event.code,
      });
      nativeSnapshot = undefined;
      listener();
    }
  });
}
export const close = () => windowsRuntime.close();
