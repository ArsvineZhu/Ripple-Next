import { runPowerShell } from './powershell';

export async function listWindowsFonts(): Promise<string[]> {
  const output = await runPowerShell(
    `
Add-Type -AssemblyName PresentationCore
ConvertTo-Json -Compress -InputObject @([Windows.Media.Fonts]::SystemFontFamilies | ForEach-Object { $_.Source })
`,
    { timeout: 15_000 },
  );
  const fonts: unknown = JSON.parse(output);
  return Array.isArray(fonts)
    ? fonts.filter((font): font is string => typeof font === 'string')
    : [];
}
