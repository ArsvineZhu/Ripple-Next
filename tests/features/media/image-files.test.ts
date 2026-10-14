import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { mediaArtworkUrl } from '../../../src/main/services/imageFiles';
it('reads real PNG and JPEG artwork from temporary files without image extensions', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ripple-art-test-'));
  const images = [
    [
      'png',
      'image/png',
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGOoCNgCAALAAX3UU3iGAAAAAElFTkSuQmCC',
    ],
    [
      'jpeg',
      'image/jpeg',
      '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDGooor6Y6z/9k=',
    ],
    ['gif', 'image/gif', Buffer.from('GIF89a').toString('base64')],
    ['webp', 'image/webp', Buffer.from('RIFF\0\0\0\0WEBP').toString('base64')],
  ];
  try {
    for (const [name, mime, contents] of images) {
      const file = path.join(directory, '.org.chromium.Chromium.' + name + '123');
      await fs.writeFile(file, Buffer.from(contents, 'base64'));
      expect(await mediaArtworkUrl(pathToFileURL(file).href)).toBe(
        `data:${mime};base64,${contents}`,
      );
    }
    const unknown = path.join(directory, 'unknown');
    await fs.writeFile(unknown, 'not an image');
    expect(await mediaArtworkUrl(pathToFileURL(unknown).href)).toBeNull();
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
it('serves encoded local artwork, bounds reads, and isolates missing/unsupported covers', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ripple-art-test-'));
  try {
    const file = path.join(directory, '封面 #1.png');
    await fs.writeFile(file, Buffer.from([137, 80, 78, 71]));
    expect(await mediaArtworkUrl(pathToFileURL(file).href)).toBe('data:image/png;base64,iVBORw==');
    expect(await mediaArtworkUrl('https://example.com/art.png')).toBe(
      'https://example.com/art.png',
    );
    expect(
      await mediaArtworkUrl(pathToFileURL(path.join(directory, 'missing.png')).href),
    ).toBeNull();
    expect(
      await mediaArtworkUrl(pathToFileURL(path.join(directory, 'script.txt')).href),
    ).toBeNull();
    const oversized = path.join(directory, 'large.png');
    const handle = await fs.open(oversized, 'w');
    await handle.truncate(5 * 1024 * 1024 + 1);
    await handle.close();
    expect(await mediaArtworkUrl(pathToFileURL(oversized).href)).toBeNull();
  } finally {
    for (const name of ['封面 #1.png', 'large.png'])
      await fs.unlink(path.join(directory, name)).catch(() => {});
    await fs.rmdir(directory);
  }
});
