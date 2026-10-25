import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { _electron } from 'playwright';
import electronBinary from 'electron';
import { captureFlows } from './capture/flows.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const encodeOnly = process.argv[2] === '--encode';
const directory = encodeOnly
  ? path.resolve(process.argv[3])
  : path.join(root, 'out', `capture-${version}-${Date.now()}`);
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
if (!encodeOnly && process.argv.slice(2).some((arg) => arg !== '--skip-build'))
  throw Error('Usage: pnpm capture [--skip-build]. Set FFMPEG_PATH if ffmpeg is not on PATH.');
if (spawnSync(ffmpeg, ['-version'], { windowsHide: true }).status !== 0)
  throw Error('Install ffmpeg or set FFMPEG_PATH to its executable.');
if (!encodeOnly) {
  if (!process.argv.includes('--skip-build')) {
    const { api } = await import('@electron-forge/core');
    await api.package({ dir: root });
  }
  fs.mkdirSync(directory, { recursive: true });
  const electron = await _electron.launch({
    executablePath: electronBinary,
    args: [path.join(root, 'scripts/capture/app.cjs')],
    cwd: root,
    env: {
      ...process.env,
      RIPPLE_CAPTURE_DIRECTORY: directory,
      RIPPLE_CAPTURE_MAIN: path.join(root, '.vite/build/main.cjs'),
    },
    recordVideo: { dir: path.join(directory, 'raw'), size: { width: 1120, height: 780 } },
  });
  try {
    let page;
    for (let attempt = 0; attempt < 200; attempt++) {
      page = electron.windows().find((window) => window.url().includes('#settings'));
      if (page) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (!page) throw Error('Settings did not open.');
    await page.waitForSelector('[data-settings]');
    await page.emulateMedia({ colorScheme: 'dark' });
    await electron.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()
        .find((window) => window.webContents.getURL().includes('#settings'))
        .setContentSize(1120, 780);
    });
    await page.evaluate(async () => {
      await window.electronAPI.updateAppState({
        settings: {
          language: 'en',
          uiFont: [{ kind: 'builtin', id: 'default' }],
          settingsSidebarExpanded: true,
        },
        tasks: ['Review the next release', 'Take a short walk', 'Write down one good idea'],
        quickApps: [
          {
            id: 'docs',
            name: 'Documentation',
            target: { kind: 'url', url: 'https://example.com/docs' },
          },
        ],
        workflows: [
          {
            name: 'Reading room',
            targets: [
              { kind: 'url', url: 'https://example.com/notes' },
              { kind: 'url', url: 'https://example.org/reading' },
            ],
          },
        ],
      });
    });
    await page.waitForTimeout(800);
    await captureFlows({ electron, page, root, directory });
  } finally {
    await electron.close();
  }
}
const { clips, videoPath, videoEpoch } = JSON.parse(
  fs.readFileSync(path.join(directory, 'clips.json'), 'utf8'),
);
for (const clip of clips) {
  const result = spawnSync(
    ffmpeg,
    [
      '-y',
      '-i',
      videoPath,
      '-ss',
      String((clip.start - videoEpoch) / 1000),
      '-t',
      String((clip.end - clip.start) / 1000),
      '-r',
      '30',
      '-c:v',
      'libvpx-vp9',
      '-cpu-used',
      '4',
      '-threads',
      '4',
      '-crf',
      '30',
      '-b:v',
      '1400k',
      '-an',
      path.join(root, 'src/assets/guide', `${clip.name}.webm`),
    ],
    { encoding: 'utf8', windowsHide: true },
  );
  if (result.status !== 0) throw Error(result.stderr);
  console.log(`Recorded ${clip.name}: ${((clip.end - clip.start) / 1000).toFixed(1)}s`);
}
console.log(`Updated gallery, guide clips and settled posters. Raw footage: ${directory}`);
