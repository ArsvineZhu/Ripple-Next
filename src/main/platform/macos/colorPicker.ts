import { runCommand } from '../../services/processes';

export async function chooseColor(hex: string, _handle: string, signal: AbortSignal) {
  const options = { timeout: 0, maxBuffer: 4096, signal };
  let output: string;
  const rgb = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) * 257);
  output = await runCommand(
    '/usr/bin/osascript',
    [
      '-e',
      `try
activate
set selectedColor to choose color default color {${rgb.join(', ')}}
return selectedColor
on error number -128
return ""
end try`,
    ],
    options,
  );
  if (!output.trim()) return null;
  const channels = output.trim().split(/,\s*/).map(Number);
  if (channels.length !== 3 || !channels.every((n) => Number.isInteger(n) && n >= 0 && n <= 65535))
    throw new Error('Invalid macOS color response');
  return `#${channels
    .map((n) =>
      Math.round(n / 257)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')
    .toUpperCase()}`;
}
