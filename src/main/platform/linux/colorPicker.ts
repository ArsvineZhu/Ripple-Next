import { runCommand } from '../../services/processes';

export async function chooseColor(hex: string, handle: string, signal: AbortSignal) {
  const options = { timeout: 0, maxBuffer: 4096, signal };
  const desktop = process.env.XDG_CURRENT_DESKTOP ?? '';
  let output: string;
  const choices = /kde/i.test(desktop) ? ['kdialog', 'zenity'] : ['zenity', 'kdialog'];
  for (const executable of choices) {
    try {
      output = await runCommand(
        executable,
        executable === 'kdialog'
          ? ['--getcolor', '--default', hex, '--attach', handle]
          : ['--color-selection', '--show-palette', `--color=${hex}`, `--attach=${handle}`],
        options,
      );
      return output;
    } catch (error) {
      const code = (error as { code?: number | string }).code;
      if (code === 1) return null;
      if (code !== 'ENOENT') throw error;
    }
  }
  throw new Error('Install zenity or kdialog to open the system color picker');
}
