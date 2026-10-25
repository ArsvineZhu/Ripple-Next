export const installedChromeSandbox = '/usr/lib/ripple-next/chrome-sandbox';

export function resolveLinuxSandbox(input: {
  platform: NodeJS.Platform;
  configured?: string;
  bundledSetuidRoot: boolean;
  installedSetuidRoot: boolean;
  sameBytes: boolean;
}): string | undefined {
  if (input.platform !== 'linux') return undefined;
  const configured = input.configured?.trim();
  if (configured) return configured;
  if (input.bundledSetuidRoot || !input.installedSetuidRoot || !input.sameBytes) return undefined;
  return installedChromeSandbox;
}
