import { EventEmitter } from 'node:events';
import type { BrowserWindow } from 'electron';
import { beforeEach, expect, it, vi } from 'vitest';
import { colorWithAlpha, parseColor } from '../src/shared/color';

const command = vi.hoisted(() => vi.fn());
vi.mock('../src/main/services/processes', () => ({ runCommand: command }));
import { chooseColor, showNativeColorPicker } from '../src/main/services/colorPicker';

beforeEach(() => {
  command.mockReset();
});
it('preserves existing CSS alpha while converting the selected RGB', () => {
  expect(parseColor('rgba(0, 0, 0, 0.64)')).toEqual({ hex: '#000000', alpha: 0.64 });
  expect(colorWithAlpha('#789abc', 0.64)).toBe('rgba(120, 154, 188, 0.64)');
  expect(parseColor('#abc8')).toEqual({ hex: '#AABBCC', alpha: 136 / 255 });
  expect(parseColor('rgb(100% 0% 50% / 25%)')).toEqual({ hex: '#FF0080', alpha: 0.25 });
  expect(parseColor('rgba(255, 255, 255)')).toEqual({ hex: '#FFFFFF', alpha: 1 });
  expect(parseColor('rgba(4, nope, 2, .3)')).toBeNull();
  expect(colorWithAlpha('#123456', 1)).toBe('#123456');
});
it('opens the Windows chooser in STA, with the correct owner and no user-input shell code', async () => {
  command.mockResolvedValue('#80AACC\r\n');
  const signal = new AbortController().signal;
  await expect(chooseColor('#123456', '1234', signal, 'win32')).resolves.toBe('#80AACC');
  const [exe, args, options] = command.mock.calls[0];
  expect(exe).toBe('powershell.exe');
  expect(args.slice(0, 3)).toEqual(['-NoProfile', '-STA', '-EncodedCommand']);
  const script = Buffer.from(args[3], 'base64').toString('utf16le');
  expect(script).toContain("FromHtml('#123456')");
  expect(script).toContain('([long]1234)');
  expect(script).toContain('ShowDialog($owner)');
  expect(options).toMatchObject({ timeout: 0, maxBuffer: 4096, signal });
  await expect(chooseColor("#000000';exit", '1234', signal, 'win32')).rejects.toThrow(TypeError);
  expect(command).toHaveBeenCalledOnce();
});
it('normalizes macOS 16-bit RGB and treats native Cancel as no change', async () => {
  const signal = new AbortController().signal;
  command.mockResolvedValue('65535, 0, 32896\n');
  await expect(chooseColor('#FF0080', '1', signal, 'darwin')).resolves.toBe('#FF0080');
  expect(command.mock.calls[0][1][1]).toContain('{65535, 0, 32896}');
  command.mockResolvedValue('');
  await expect(chooseColor('#123456', '1', signal, 'darwin')).resolves.toBeNull();
  command.mockResolvedValue('bad');
  await expect(chooseColor('#123456', '1', signal, 'darwin')).rejects.toThrow('Invalid macOS');
});
it('selects the desktop chooser and falls back only when the executable is missing', async () => {
  const signal = new AbortController().signal;
  command.mockRejectedValueOnce({ code: 'ENOENT' }).mockResolvedValueOnce('rgb(255, 128, 0)');
  await expect(chooseColor('#000000', '100', signal, 'linux', 'KDE')).resolves.toBe('#FF8000');
  expect(command.mock.calls.map((call) => call[0])).toEqual(['kdialog', 'zenity']);
  command.mockReset().mockRejectedValue({ code: 1 });
  await expect(chooseColor('#000000', '100', signal, 'linux', 'GNOME')).resolves.toBeNull();
  expect(command).toHaveBeenCalledOnce();
  command.mockReset().mockRejectedValue({ code: 2 });
  await expect(chooseColor('#000000', '100', signal, 'linux', 'GNOME')).rejects.toMatchObject({
    code: 2,
  });
  expect(command).toHaveBeenCalledOnce();
});
it('allows only one chooser and aborts it when its owning window closes', async () => {
  const owner = Object.assign(new EventEmitter(), {
    isDestroyed: () => false,
    isEnabled: () => true,
    setEnabled: vi.fn(),
    focus: vi.fn(),
    getNativeWindowHandle: () => Buffer.from([1, 0, 0, 0]),
  });
  command.mockImplementation(
    (_exe, _args, { signal }) =>
      new Promise((_resolve, reject) =>
        signal.addEventListener('abort', () => reject(new Error('aborted'))),
      ),
  );
  const first = showNativeColorPicker(owner as unknown as BrowserWindow, '#000000');
  await expect(
    showNativeColorPicker(owner as unknown as BrowserWindow, '#000000'),
  ).resolves.toBeNull();
  owner.emit('closed');
  await expect(first).resolves.toBeNull();
  expect(owner.listenerCount('closed')).toBe(0);
  command.mockResolvedValue('#FFFFFF');
  await expect(showNativeColorPicker(owner as unknown as BrowserWindow, '#000000')).resolves.toBe(
    '#FFFFFF',
  );
});
