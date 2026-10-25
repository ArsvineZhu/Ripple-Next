import { afterEach, expect, it, vi } from 'vitest';
const app = vi.hoisted(() => ({
  isPackaged: true,
  setLoginItemSettings: vi.fn(),
  getLoginItemSettings: vi.fn(),
  getPath: vi.fn(),
}));
const fsPromises = vi.hoisted(() => ({
  mkdir: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  rename: vi.fn(),
  rm: vi.fn(),
}));
vi.mock('electron', () => ({ app }));
vi.mock('node:fs/promises', () => ({ default: fsPromises }));
import { setAutoLaunch } from '../../src/main/platform/macos/autostart';
import {
  loginLaunchRegistered,
  setAutoLaunch as setWindowsAutoLaunch,
} from '../../src/main/platform/windows/autostart';
import { launchedAtLogin, loginLaunchArgument } from '../../src/main/platform/loginLaunch';
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  app.isPackaged = true;
});
it('applies and verifies macOS login items instead of silently succeeding', async () => {
  app.getLoginItemSettings.mockReturnValue({ openAtLogin: true });
  await setAutoLaunch(true);
  expect(app.setLoginItemSettings).toHaveBeenCalledWith({ openAtLogin: true });
  app.getLoginItemSettings.mockReturnValue({ openAtLogin: false });
  await expect(setAutoLaunch(true)).rejects.toThrow('did not accept');
});
it('reports unavailable login-item registration during macOS development', async () => {
  app.isPackaged = false;
  await expect(setAutoLaunch(true)).rejects.toThrow('packaged application');
  expect(app.setLoginItemSettings).not.toHaveBeenCalled();
});
it('recognizes a login launch from the argument or the macOS login item', () => {
  expect(launchedAtLogin(['ripple-next'])).toBe(false);
  expect(launchedAtLogin(['ripple-next', loginLaunchArgument])).toBe(true);
  expect(launchedAtLogin(['ripple-next'], true)).toBe(true);
});
it('updates a Windows login item only when the login argument is absent', () => {
  app.isPackaged = false;
  expect(loginLaunchRegistered()).toBe(true);
  app.isPackaged = true;
  app.getPath.mockReturnValue('C:\\App\\ripple-next.exe');
  app.getLoginItemSettings.mockReturnValue({ openAtLogin: false });
  expect(loginLaunchRegistered()).toBe(false);
  app.getLoginItemSettings.mockReturnValue({ openAtLogin: true });
  expect(loginLaunchRegistered()).toBe(true);
  expect(app.getLoginItemSettings).toHaveBeenCalledWith({
    path: 'C:\\App\\ripple-next.exe',
    args: [loginLaunchArgument],
  });
});
it('registers the Windows login item with the login argument', async () => {
  app.getPath.mockReturnValue('C:\\App\\ripple-next.exe');
  app.getLoginItemSettings.mockReturnValue({ openAtLogin: true });
  await setWindowsAutoLaunch(true);
  expect(app.setLoginItemSettings).toHaveBeenCalledWith({
    openAtLogin: true,
    path: 'C:\\App\\ripple-next.exe',
    args: [loginLaunchArgument],
  });
  expect(app.getLoginItemSettings).toHaveBeenCalledWith({
    path: 'C:\\App\\ripple-next.exe',
    args: [loginLaunchArgument],
  });
  app.getLoginItemSettings.mockReturnValue({ openAtLogin: false });
  await setWindowsAutoLaunch(false);
  expect(app.setLoginItemSettings).toHaveBeenLastCalledWith({
    openAtLogin: false,
    path: 'C:\\App\\ripple-next.exe',
    args: [loginLaunchArgument],
  });
});
it('keeps the Linux autostart entry on X11 and marks it as a login launch', async () => {
  vi.stubEnv('XDG_CONFIG_HOME', '');
  app.isPackaged = false;
  app.getPath.mockImplementation((name: string) =>
    name === 'home' ? '/home/user' : '/opt/ripple-next/ripple-next',
  );
  const { setAutoLaunch: setLinuxAutoLaunch } =
    await import('../../src/main/platform/linux/autostart');
  await setLinuxAutoLaunch(true);
  const written = String(fsPromises.writeFile.mock.calls[0]?.[1]);
  expect(written).toContain(
    `"/opt/ripple-next/ripple-next" --ozone-platform=x11 ${loginLaunchArgument}`,
  );
});
