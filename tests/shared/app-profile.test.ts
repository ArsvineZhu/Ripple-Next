import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import {
  configureApplicationProfile,
  requestApplicationInstanceLock,
} from '../../src/main/appProfile';

const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0)) fs.rmSync(directory, { recursive: true });
});

it('keeps the packaged profile and isolates development state and caches', () => {
  const appData = fs.mkdtempSync(path.join(os.tmpdir(), 'ripple-profile-'));
  directories.push(appData);
  const setPath = vi.fn();
  const app = { isPackaged: true, getPath: () => appData, setPath };
  const packaged = configureApplicationProfile(app);
  expect(packaged).toBe(path.join(appData, 'Ripple Next'));
  expect(setPath).toHaveBeenCalledWith('userData', packaged);
  expect(setPath).toHaveBeenCalledWith('sessionData', packaged);
  setPath.mockClear();
  const development = configureApplicationProfile({ ...app, isPackaged: false });
  expect(development).not.toBe(packaged);
  expect(setPath).toHaveBeenCalledWith('userData', development);
  expect(setPath).toHaveBeenCalledWith('sessionData', development);
  expect(fs.existsSync(development)).toBe(true);
});

it.each([true, false])(
  'shares the instance namespace and restores profile paths when lock=%s',
  (granted) => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ripple-instance-'));
    directories.push(home);
    const lockDirectories: string[] = [];
    for (const isPackaged of [true, false]) {
      let userData = '';
      const app = {
        isPackaged,
        getPath: (name: string) => (name === 'home' ? home : path.join(home, 'app-data')),
        setPath: vi.fn((name: string, value: string) => {
          if (name === 'userData') userData = value;
        }),
        requestSingleInstanceLock: () => {
          lockDirectories.push(userData);
          return granted;
        },
      };
      const profile = configureApplicationProfile(app);
      app.setPath.mockClear();
      expect(requestApplicationInstanceLock(app, profile)).toBe(granted);
      expect(userData).toBe(profile);
      expect(app.setPath).not.toHaveBeenCalledWith('sessionData', expect.anything());
    }
    expect(lockDirectories[0]).toBe(lockDirectories[1]);
  },
);
