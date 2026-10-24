import { getFonts } from 'font-list';
import { listWindowsFonts } from './windows/fonts';

export async function listSystemFontFamilies(): Promise<string[]> {
  const fonts =
    process.platform === 'win32'
      ? await listWindowsFonts()
      : await getFonts({ disableQuoting: true });
  return [...new Set(fonts.map((font) => font.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}
