import { describe, expect, it } from 'vitest';
import { noticeAreaForCode, noticeAreaForPatch } from '../../src/shared/contracts';

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
