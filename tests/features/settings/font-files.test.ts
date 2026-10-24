import { afterEach, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
const handlers = vi.hoisted(() => new Map<string, (request: Request) => Promise<Response>>());
vi.mock('electron', () => ({
  dialog: { showOpenDialog: vi.fn() },
  protocol: {
    registerSchemesAsPrivileged: vi.fn(),
    handle: (name: string, callback: (request: Request) => Promise<Response>) =>
      handlers.set(name, callback),
  },
  net: { fetch: async (url: string) => new Response(await fs.readFile(fileURLToPath(url))) },
}));
vi.mock('../../../src/main/platform/fonts', () => ({
  listSystemFontFamilies: async () => ['Arial'],
}));
import { createFontService } from '../../../src/main/services/fonts';
const directories: string[] = [];
afterEach(async () => {
  for (const directory of directories.splice(0))
    await fs.rm(directory, { recursive: true, force: true });
});
it('imports original font bytes, groups typographic-family weights and serves them after the source disappears', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ripple-font-files-'));
  directories.push(directory);
  const source = path.join(directory, 'source.woff2');
  const regular = await fs.readFile(
    'src/assets/fonts/alibaba-puhuiti/AlibabaPuHuiTi-3-55-Regular.woff2',
  );
  await fs.writeFile(source, regular);
  const bad = path.join(directory, 'broken.ttf');
  await fs.writeFile(bad, 'not a font');
  const service = createFontService(path.join(directory, 'profile'));
  const result = await service.importFiles([
    source,
    path.resolve('src/assets/fonts/alibaba-puhuiti/AlibabaPuHuiTi-3-65-Medium.woff2'),
    bad,
  ]);
  expect(result.fonts).toHaveLength(1);
  expect(result.fonts[0].family).toBe('Alibaba PuHuiTi 3.0');
  expect(result.fonts[0].faces.map((face) => face.weight)).toEqual([
    [400, 400],
    [500, 500],
  ]);
  expect(result.errors.map((error) => error.file)).toEqual(['broken.ttf']);
  await fs.unlink(source);
  service.installProtocol();
  const serve = handlers.get('ripple-font')!;
  const face = result.fonts[0].faces[0];
  const response = await serve(new Request(`ripple-font://font/${face.id}`));
  expect(response.status).toBe(200);
  expect(Buffer.from(await response.arrayBuffer()).equals(regular)).toBe(true);
  expect((await serve(new Request('ripple-font://font/invalid'))).status).toBe(403);
  expect((await serve(new Request(`ripple-font://other/${face.id}`))).status).toBe(403);
  expect(
    (await serve(new Request(`ripple-font://font/${face.id}`, { method: 'POST' }))).status,
  ).toBe(403);
});
