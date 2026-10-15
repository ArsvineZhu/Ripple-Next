import { describe, expect, it } from 'vitest';
import { desktopLaunchEnvironment } from '../../../src/main/platform/linux/apps';

describe('Linux desktop app launch environment', () => {
  it('does not pass the launching app development mode to installed applications', () => {
    const environment = desktopLaunchEnvironment({
      DISPLAY: ':0',
      NODE_ENV: 'development',
      ELECTRON_DEV: 'true',
      ELECTRON_RUN_AS_NODE: '1',
      ELECTRON_OVERRIDE_DIST_PATH: '/tmp/electron-dev',
      VITE_DEV_SERVER_URL: 'http://localhost:5173',
    });

    expect(environment).toEqual({ DISPLAY: ':0' });
  });

  it('preserves production mode and the desktop session environment', () => {
    const environment = desktopLaunchEnvironment({
      DISPLAY: ':0',
      NODE_ENV: 'production',
      WAYLAND_DISPLAY: 'wayland-0',
    });

    expect(environment).toEqual({
      DISPLAY: ':0',
      NODE_ENV: 'production',
      WAYLAND_DISPLAY: 'wayland-0',
    });
  });
});
