import { expect, it } from 'vitest';
import { getWindowBoundsForDisplay } from '../../src/main/windowBounds';

it('leaves auto-hide activation edges uncovered when Windows reports full workArea', () => {
  const bounds = { x: -1707, y: 0, width: 1707, height: 1067 };
  const result = getWindowBoundsForDisplay({ bounds, workArea: bounds }, 'win32');
  expect(result).toEqual({ x: -1705, y: 2, width: 1703, height: 1063 });
  // Outward pixel rounding at 150% must still leave the monitor edge free.
  expect(Math.ceil((result.y + result.height) * 1.5)).toBeLessThan(Math.round(bounds.height * 1.5));
});

it('keeps the macOS menu bar and Dock outside the companion window', () => {
  const bounds = { x: 0, y: 0, width: 1440, height: 900 };
  const workArea = { x: 0, y: 25, width: 1440, height: 805 };
  expect(getWindowBoundsForDisplay({ bounds, workArea }, 'darwin')).toEqual(workArea);
  expect(getWindowBoundsForDisplay({ bounds, workArea }, 'linux')).toEqual(workArea);
});
