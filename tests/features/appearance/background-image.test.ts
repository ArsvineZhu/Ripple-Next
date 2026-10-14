import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { backgroundImageUrl } from '../../../src/shared/backgroundImage';

const mock = vi.hoisted(() => ({ handle: vi.fn(), fetch: vi.fn(), register: vi.fn() }));
vi.mock('electron', () => ({
  net: { fetch: mock.fetch },
  protocol: { handle: mock.handle, registerSchemesAsPrivileged: mock.register },
}));
import { installBackgroundImageProtocol } from '../../../src/main/services/backgroundImage';

const temporary: string[] = [];
afterEach(async () => {
  vi.clearAllMocks();
  await Promise.all(temporary.splice(0).map((directory) => fs.rm(directory, { recursive: true })));
});

describe('background image paths', () => {
  it('keeps URLs and preserves Windows, UNC and Unix paths without CSS escaping', () => {
    expect(backgroundImageUrl('none')).toBeNull();
    expect(backgroundImageUrl('  ')).toBeNull();
    const remote = "https://example.com/a'b.png";
    expect(backgroundImageUrl(remote)).toBe(remote);
    for (const source of [
      String.raw`C:\Users\测试\a b#'c.png`,
      "C:/Users/测试/a b#'c.png",
      String.raw`\\server\share\image.png`,
      '/Users/测试/a b.png',
      '~/Pictures/image.png',
      'file:///C:/Users/test/image.png',
    ]) {
      const url = new URL(backgroundImageUrl(source)!);
      expect(url.protocol).toBe('ripple-background:');
      expect(url.searchParams.get('source')).toBe(source);
      expect(backgroundImageUrl(`"${source}"`)).toBe(backgroundImageUrl(source));
    }
  });

  it('serves only the configured image, including file URLs and special filename characters', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ripple-image-'));
    temporary.push(directory);
    const file = path.join(directory, "图片 space#'quote.png");
    const bytes = Buffer.from('image test bytes');
    await fs.writeFile(file, bytes);
    mock.fetch.mockImplementation(
      async (url: string) => new Response(await fs.readFile(fileURLToPath(url))),
    );
    let configured = file;
    const error = vi.fn();
    installBackgroundImageProtocol(async () => configured, error);
    const handler = mock.handle.mock.calls[0][1] as (request: Request) => Promise<Response>;
    for (const source of [file, file.replaceAll('\\', '/'), pathToFileURL(file).href]) {
      configured = source;
      const response = await handler(new Request(backgroundImageUrl(source)!));
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('image/png');
      expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes);
    }
    const fetches = mock.fetch.mock.calls.length;
    expect((await handler(new Request(backgroundImageUrl(file + '.other.png')!))).status).toBe(403);
    expect(
      (await handler(new Request(backgroundImageUrl(configured)!, { method: 'POST' }))).status,
    ).toBe(403);
    expect(mock.fetch).toHaveBeenCalledTimes(fetches);
    expect(error).not.toHaveBeenCalled();
    configured = path.join(directory, 'secret.txt');
    expect((await handler(new Request(backgroundImageUrl(configured)!))).status).toBe(415);
    configured = path.join(directory, 'missing.png');
    expect((await handler(new Request(backgroundImageUrl(configured)!))).status).toBe(404);
    expect(error).toHaveBeenCalledTimes(1);
  });
});
