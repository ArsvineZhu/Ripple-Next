import { describe, expect, it } from 'vitest';
import { shouldQuitAfterLastWindow } from '../../src/main/appLifecycle';

describe('Linux last-window quit guard', () => {
  it('quits on Linux only when the tray is gone', () => {
    expect(shouldQuitAfterLastWindow({ platform: 'linux', hasTray: false })).toBe(true);
    expect(shouldQuitAfterLastWindow({ platform: 'linux', hasTray: true })).toBe(false);
  });
  it('never quits from window-all-closed on macOS or Windows', () => {
    expect(shouldQuitAfterLastWindow({ platform: 'darwin', hasTray: false })).toBe(false);
    expect(shouldQuitAfterLastWindow({ platform: 'win32', hasTray: false })).toBe(false);
    expect(shouldQuitAfterLastWindow({ platform: 'darwin', hasTray: true })).toBe(false);
    expect(shouldQuitAfterLastWindow({ platform: 'win32', hasTray: true })).toBe(false);
  });
});
