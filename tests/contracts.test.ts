import { islandPages } from '../src/renderer/lib/tabs';
import { defaultPageLayoutContext } from '../src/renderer/lib/tabGeometry';
import { describe, expect, it } from 'vitest';
import { parseCommand, tokenizeArgs } from '../src/main/platform/windows/commands';
import { nextTabId } from '../src/renderer/lib/navigation';
import { modeReducer, resolveMode } from '../src/renderer/lib/modes';
import { islandInputRectangle, toDeviceRectangle } from '../src/shared/inputGeometry';
import { noticeAreaForCode, noticeAreaForPatch } from '../src/shared/contracts';

describe('Windows application commands', () => {
  it('normalizes executable paths while preserving URL arguments and Windows switches', () => {
    expect(parseCommand('C:/Apps/app.exe /open "https://example.com/a/b"')).toEqual({
      exe: 'C:\\Apps\\app.exe',
      args: ['/open', 'https://example.com/a/b'],
    });
  });
  it('preserves quoted paths and mid-token argument quotes', () => {
    expect(parseCommand('"C:\\Program Files\\App\\app.exe" --flag="hello world" --bare')).toEqual({
      exe: 'C:\\Program Files\\App\\app.exe',
      args: ['--flag=hello world', '--bare'],
    });
    expect(parseCommand('C:\\Program Files\\App\\app.exe "hello world"')).toEqual({
      exe: 'C:\\Program Files\\App\\app.exe',
      args: ['hello world'],
    });
    expect(tokenizeArgs('"quoted arg" --bare')).toEqual(['quoted arg', '--bare']);
  });
  it('retains unknown environment variables and expands known ones', () => {
    const key = 'RIPPLE_COMMAND_TEST_ROOT';
    process.env[key] = 'C:\\Apps';
    try {
      expect(parseCommand(`%${key}%/app.exe`)).toEqual({ exe: 'C:\\Apps\\app.exe', args: [] });
      expect(parseCommand('%RIPPLE_UNKNOWN%')).toEqual({ exe: '%RIPPLE_UNKNOWN%', args: [] });
    } finally {
      delete process.env[key];
    }
  });
});

describe('Island navigation and modes', () => {
  it('keeps registered identities, configured order, hidden pages and media availability', () => {
    const visible = islandPages.visible(
      ['settings', 'playing', 'search', 'tasks', 'workflows', 'overview', 'assistant', 'clipboard'],
      ['workflows', 'assistant'],
      defaultPageLayoutContext,
    );
    expect(visible).toEqual(['search', 'tasks', 'overview', 'clipboard']);
    expect(nextTabId(visible, 'clipboard', 1)).toBe('search');
    expect(nextTabId(visible, 'search', -1)).toBe('clipboard');
    expect(nextTabId([], 'overview', 1)).toBe('overview');
  });
  it('keeps Overview reachable when every available page is hidden', () => {
    const hidden = islandPages.definitions.map((page) => page.id);
    expect(islandPages.visible(hidden, hidden, defaultPageLayoutContext)).toEqual(['overview']);
  });
  it('preserves standby precedence and explicit expansion', () => {
    expect(resolveMode('still', true, true)).toBe('quick');
    expect(resolveMode('still', false, true)).toBe('large');
    expect(resolveMode('large', true, false)).toBe('large');
    expect(modeReducer('quick', (mode) => (mode === 'large' ? 'quick' : 'large'))).toBe('large');
  });
});

describe('Linux input geometry', () => {
  it('uses physical coordinates and rounds outward for fractional display scaling', () => {
    expect(
      toDeviceRectangle({ x: 10.5, y: 5.5, width: 170.2, height: 40.2, scaleFactor: 1.5 }),
    ).toEqual([15, 8, 256, 61]);
  });
  it('keeps input padding inside the viewport while leaving the visual bounding shape alone', () => {
    expect(
      islandInputRectangle(
        { left: 5, top: 20, right: 175, bottom: 60 },
        { width: 1920, height: 1200 },
        2,
      ),
    ).toEqual({ x: 0, y: 0, width: 203, height: 88, scaleFactor: 2 });
  });
});

describe('inline notice routing', () => {
  it('routes failures to the feature that owns the affected interaction', () => {
    expect(noticeAreaForCode('appLaunchFailed')).toBe('workflows');
    expect(noticeAreaForCode('windowLoadFailed')).toBe('system');
    expect(noticeAreaForPatch({ tasks: [] })).toBe('tasks');
    expect(noticeAreaForPatch({ workflows: [] })).toBe('workflows');
    expect(noticeAreaForPatch({ quickApps: [] })).toBe('quick-apps');
    expect(noticeAreaForPatch({ settings: { timeZone: 'UTC' } })).toBe('settings');
  });
});

describe('inline notice routing', () => {
  it('routes notices to the feature that can explain or resolve them', () => {
    expect(noticeAreaForCode('appLaunchFailed')).toBe('workflows');
    expect(noticeAreaForCode('windowLoadFailed')).toBe('system');
    expect(noticeAreaForPatch({ tasks: [] })).toBe('tasks');
    expect(noticeAreaForPatch({ workflows: [] })).toBe('workflows');
    expect(noticeAreaForPatch({ quickApps: [] })).toBe('quick-apps');
    expect(noticeAreaForPatch({ settings: { timeZone: 'UTC' } })).toBe('settings');
  });
});
