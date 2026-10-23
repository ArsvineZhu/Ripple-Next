import { afterEach, expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
const command = vi.hoisted(() => vi.fn());
const decode = vi.hoisted(() => vi.fn());
vi.mock('../../../src/main/services/processes', () => ({ runCommand: command }));
vi.mock('electron', () => ({ nativeImage: { createFromBuffer: decode } }));
import { readMusicArtwork } from '../../../src/main/platform/macos/musicArtwork';
afterEach(() => {
  command.mockReset();
  decode.mockReset();
});
const track = { name: 'Song "quoted"', artist: 'Artist', album: 'Album', trackId: 'id' };
it.runIf(process.platform === 'darwin')(
  'compiles the Music dictionary and reads native artwork descriptors without contacting a player',
  async () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'ripple-artwork-test-'));
    const png =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aJ1sAAAAASUVORK5CYII=';
    try {
      command.mockImplementation(async (_executable, args: string[]) => {
        const script = args[1];
        // Resolve the installed dictionary directly; sandboxed Launch Services cannot look it up.
        execFileSync('/usr/bin/osacompile', [
          '-o',
          path.join(directory, 'artwork.scpt'),
          '-e',
          script.replaceAll('application "Music"', 'application "/System/Applications/Music.app"'),
        ]);
        const isolated = script
          .replace('if not running of application "Music" then return', '')
          .replace(
            /  tell application "Music"[\s\S]*?\n  end tell/,
            `  return «data PNGf${Buffer.from(png, 'base64').toString('hex')}»`,
          );
        return execFileSync('/usr/bin/osascript', ['-e', isolated, ...args.slice(2)], {
          encoding: 'utf8',
        });
      });
      decode.mockReturnValue({
        isEmpty: () => false,
        getSize: () => ({ width: 1, height: 1 }),
        toDataURL: () => `data:image/png;base64,${png}`,
      });
      expect(await readMusicArtwork(track, new AbortController().signal)).toBe(
        `data:image/png;base64,${png}`,
      );
      expect(decode).toHaveBeenCalledWith(Buffer.from(png, 'base64'));
      expect(command.mock.calls[0][1].slice(2)).toEqual([
        track.name,
        track.artist,
        track.album,
        track.trackId,
      ]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  },
);
it('bounds decoded artwork and rejects missing, malformed and undecodable data', async () => {
  const resize = vi.fn(() => ({ toDataURL: () => 'thumbnail' }));
  decode.mockReturnValue({
    isEmpty: () => false,
    getSize: () => ({ width: 1000, height: 2000 }),
    resize,
  });
  command.mockResolvedValue('«data JPEGffd8ff»');
  expect(await readMusicArtwork(track, new AbortController().signal)).toBe('thumbnail');
  expect(resize).toHaveBeenCalledWith({ height: 512 });
  for (const output of ['', 'missing value', '«data PNGfF»', '«data PNGfzz»']) {
    command.mockResolvedValue(output);
    expect(await readMusicArtwork(track, new AbortController().signal)).toBeNull();
  }
  decode.mockReturnValue({ isEmpty: () => true });
  command.mockResolvedValue('«data PNGf0102»');
  expect(await readMusicArtwork(track, new AbortController().signal)).toBeNull();
});
