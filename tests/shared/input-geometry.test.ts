import { describe, expect, it } from 'vitest';
import { islandInputRectangle, toDeviceRectangle } from '../../src/shared/inputGeometry';

describe('Input geometry', () => {
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
