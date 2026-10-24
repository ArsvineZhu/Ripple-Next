import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { dialog, net, protocol, type BrowserWindow } from 'electron';
import { create } from 'fontkit';
import { listSystemFontFamilies } from '../platform/fonts';
import {
  FontChoiceSchema,
  appendFonts,
  type FileFontChoice,
  type FontImportResult,
} from '../../shared/fonts';
import { DiagnosticError } from '../../shared/diagnosticError';

export function registerFontScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'ripple-font',
      privileges: {
        standard: true,
        secure: true,
        corsEnabled: true,
        supportFetchAPI: true,
      },
    },
  ]);
}

export function createFontService(userData: string) {
  const directory = path.join(userData, 'fonts');
  const importFiles = async (files: string[]): Promise<FontImportResult> => {
    const fonts: FileFontChoice[] = [];
    const errors: FontImportResult['errors'] = [];
    await fs.mkdir(directory, { recursive: true });
    for (const file of files) {
      try {
        if (!/\.(ttf|otf|woff2?)$/i.test(file) || (await fs.stat(file)).size > 64 * 1024 * 1024)
          throw new DiagnosticError('Choose a TTF, OTF, WOFF or WOFF2 font up to 64 MB');
        const bytes = await fs.readFile(file);
        const font = create(bytes);
        if ('fonts' in font) throw new DiagnosticError('Choose an individual font file');
        const family = font.getName('preferredFamily', 'en') || font.familyName;
        const axis = font.variationAxes.wght;
        const weight = font['OS/2']?.usWeightClass || 400;
        const id = createHash('sha256').update(bytes).digest('hex');
        const choice = FontChoiceSchema.parse({
          kind: 'file',
          family,
          faces: [
            {
              id,
              weight: axis ? [axis.min, axis.max] : [weight, weight],
              style: font.italicAngle || font['OS/2']?.fsSelection.italic ? 'italic' : 'normal',
            },
          ],
        }) as FileFontChoice;
        await fs
          .writeFile(path.join(directory, `${id}.font`), bytes, { flag: 'wx' })
          .catch((error) => {
            if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
          });
        fonts.push(choice);
      } catch (error) {
        errors.push({
          file: path.basename(file),
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return { fonts: appendFonts([], fonts) as FileFontChoice[], errors };
  };
  return {
    listSystem: listSystemFontFamilies,
    importFiles,
    async chooseFiles(window: BrowserWindow): Promise<FontImportResult> {
      const selection = await dialog.showOpenDialog(window, {
        properties: ['openFile', 'multiSelections'],
        filters: [{ name: 'Fonts', extensions: ['ttf', 'otf', 'woff', 'woff2'] }],
      });
      return selection.canceled ? { fonts: [], errors: [] } : importFiles(selection.filePaths);
    },
    installProtocol() {
      protocol.handle('ripple-font', async (request) => {
        const url = new URL(request.url);
        if (
          request.method !== 'GET' ||
          url.hostname !== 'font' ||
          !/^\/[a-f0-9]{64}$/.test(url.pathname)
        )
          return new Response(null, { status: 403 });
        try {
          const response = await net.fetch(
            pathToFileURL(path.join(directory, `${url.pathname.slice(1)}.font`)).href,
          );
          return new Response(response.body, {
            status: response.status,
            headers: {
              'Content-Type': 'application/octet-stream',
              'Access-Control-Allow-Origin': '*',
              'Cache-Control': 'public, max-age=31536000, immutable',
            },
          });
        } catch {
          return new Response(null, { status: 404 });
        }
      });
    },
  };
}
