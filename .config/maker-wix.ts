import { execFileSync } from 'node:child_process';
import { styleText } from 'node:util';
import { MakerWix } from '@electron-forge/maker-wix';

export const WIX_SKIP_MESSAGE =
  'WiX Toolset 3 candle.exe and light.exe are not on PATH, so the MSI was skipped. pnpm make still writes the portable Windows zip. Install WiX Toolset 3.14 (not WiX 4) and open a new shell. The tools are in C:\\Program Files (x86)\\WiX Toolset v3.14\\bin.';

type ToolRunner = (file: string, args: readonly string[]) => void;

const runTool: ToolRunner = (file, args) => {
  execFileSync(file, args, { stdio: 'ignore', windowsHide: true });
};

export function wixToolsetOnPath(run: ToolRunner = runTool): boolean {
  try {
    run('candle', ['-?']);
    run('light', ['-?']);
    return true;
  } catch {
    return false;
  }
}

export async function windowsMsiArtifacts(
  toolsPresent: boolean,
  makeMsi: () => Promise<string[]>,
): Promise<string[]> {
  if (toolsPresent) return makeMsi();
  console.warn(styleText('yellow', '⚠'), styleText('yellow', WIX_SKIP_MESSAGE));
  return [];
}

export class MakerWixOptional extends MakerWix {
  async make(options: Parameters<MakerWix['make']>[0]): Promise<string[]> {
    // Forge makes distributables concurrently. Throwing here aborts the zip.
    return windowsMsiArtifacts(wixToolsetOnPath(), () => super.make(options));
  }
}
