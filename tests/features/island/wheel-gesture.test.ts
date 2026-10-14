import { expect, it } from 'vitest';
import {
  isClearVerticalSample,
  isResumedWheelPush,
  isTailDecay,
  isVerticalStroke,
  isVerticalTakeover,
  wheelEventAxis,
} from '../../../src/renderer/lib/wheelGesture';
it('gives diagonals to vertical scrolling and keeps the drift a swipe carries', () => {
  expect(wheelEventAxis(30, 32)).toBe('vertical');
  expect(wheelEventAxis(30, 12)).toBe('vertical');
  expect(wheelEventAxis(200, 20)).toBe('horizontal');
  expect(wheelEventAxis(0, 1)).toBe('vertical');
  expect(wheelEventAxis(200, 1)).toBe('horizontal');
  expect(wheelEventAxis(-40, -1)).toBe('horizontal');
  expect(wheelEventAxis(1, 0)).toBe('horizontal');
  expect(wheelEventAxis(0, 0)).toBe('none');
});
it('only locks a stroke away from the rail when the vertical axis dominates', () => {
  // A vertical scroll owns the stroke, and so does a single clearly vertical sample.
  expect(isVerticalStroke(4, 120)).toBe(true);
  expect(isClearVerticalSample(200, 60)).toBe(true);
  expect(isClearVerticalSample(2, 120)).toBe(true);
  // Short vertical movement is not enough yet.
  expect(isVerticalStroke(1, 8)).toBe(false);
  // Drift on a sideways sample never qualifies, however large the swipe is.
  expect(isClearVerticalSample(9, 3)).toBe(false);
  expect(isClearVerticalSample(200, 12)).toBe(false);
  // A sideways swipe never qualifies, however far it has travelled.
  expect(isVerticalStroke(40, 6)).toBe(false);
  expect(isVerticalStroke(138, 21)).toBe(false);
});
it('only hands a horizontal stroke over to a real diagonal', () => {
  // Drift a sideways swipe carries stays on the rail.
  expect(isVerticalTakeover(25, 4)).toBe(false);
  expect(isVerticalTakeover(40, 6)).toBe(false);
  expect(isVerticalTakeover(200, 12)).toBe(false);
  // A diagonal, or vertical movement on its own, takes the stroke over.
  expect(isVerticalTakeover(30, 32)).toBe(true);
  expect(isVerticalTakeover(20, 40)).toBe(true);
  expect(isVerticalTakeover(1, 40)).toBe(true);
});
it('resumes only after a decayed tail and a clear rising run', () => {
  // A momentum tail only decays, so nothing in it may look like a new push.
  expect(
    isResumedWheelPush({ magnitude: 12, tailMagnitude: 40, risingSamples: 3, decayed: false }),
  ).toBe(false);
  // A rise inside the stroke's own ramp has not seen a decayed tail yet.
  expect(
    isResumedWheelPush({ magnitude: 40, tailMagnitude: 20, risingSamples: 2, decayed: false }),
  ).toBe(false);
  // A single rise is not a fresh push either.
  expect(
    isResumedWheelPush({ magnitude: 20, tailMagnitude: 10, risingSamples: 1, decayed: true }),
  ).toBe(false);
  // A rise that does not clear the tail is still part of the same stroke.
  expect(
    isResumedWheelPush({ magnitude: 12, tailMagnitude: 10, risingSamples: 2, decayed: true }),
  ).toBe(false);
  // A rising run that clears a decayed tail is the next push, even without an input gap.
  expect(
    isResumedWheelPush({ magnitude: 20, tailMagnitude: 10, risingSamples: 2, decayed: true }),
  ).toBe(true);
});
it('marks the momentum tail once a sample drops well below the peak', () => {
  // A quick flick decays once and then rises again; the mark has to survive the rise.
  expect(isTailDecay(30, 120)).toBe(true);
  expect(isTailDecay(88, 120)).toBe(false);
  expect(isTailDecay(120, 120)).toBe(false);
});
