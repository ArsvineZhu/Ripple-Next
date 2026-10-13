import fs from 'node:fs/promises';
import path from 'node:path';
import { app } from 'electron';
import type { LicenseRecord } from '../../shared/licenses';

let cached: Promise<LicenseRecord[]> | null = null;
function records() {
  if (!cached) {
    const location = app.isPackaged
      ? path.join(process.resourcesPath, 'licenses.json')
      : path.resolve(__dirname, '../../src/assets/third-party/licenses.json');
    cached = fs.readFile(location, 'utf8').then((value) => JSON.parse(value) as LicenseRecord[]);
  }
  return cached;
}
export async function listLicenses() {
  return (await records()).map(({ text: _text, format: _format, ...metadata }) => metadata);
}
export async function readLicense(id: string) {
  const result = (await records()).find((item) => item.id === id);
  if (!result) throw new TypeError('Unknown license record');
  if (result.id === 'Chromium') {
    const location = app.isPackaged
      ? path.join(process.resourcesPath, 'LICENSES.chromium.html')
      : path.resolve(__dirname, '../../out/license-assets/LICENSES.chromium.html');
    return { ...result, text: await fs.readFile(location, 'utf8') };
  }
  return result;
}
