import { afterEach, expect, it, vi } from 'vitest';
const app = vi.hoisted(() => ({
  isPackaged: true,
  setLoginItemSettings: vi.fn(),
  getLoginItemSettings: vi.fn(),
  getPath: vi.fn(),
}));
vi.mock('electron', () => ({ app }));
import { setAutoLaunch } from '../src/main/platform/macos/autostart';
afterEach(() => {
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
