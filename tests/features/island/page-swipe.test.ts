import { expect, it } from 'vitest';
import { PageSwipe, pageSwipeSettlement } from '../../../src/renderer/lib/pageSwipe';

it('tracks distance directly and never selects a page from a tiny high-speed flick', () => {
  const gesture = new PageSwipe(0, 0, 400, 0);
  expect(gesture.move(16, 0, 1)).toBeCloseTo(0.04);
  expect(gesture.release(2)).toBe(0);
});
it('allows deliberate distance or sufficient flick distance, and rejects low-speed short motion', () => {
  const slow = new PageSwipe(0, 0, 400, 0);
  slow.move(80, 1, 200);
  expect(slow.release(220)).toBe(0);
  slow.move(125, 0, 400);
  expect(slow.release(600)).toBe(1);
  const fast = new PageSwipe(0, 0, 400, 0);
  fast.move(30, 1, 20);
  fast.move(30, 1, 40);
  expect(fast.release(40)).toBe(1);
});
it('limits a huge or fluctuating stroke to one neighbor in either direction', () => {
  for (const sign of [-1, 1]) {
    const stroke = new PageSwipe(3, 3, 400, 0);
    for (let i = 1; i <= 10; i++)
      expect(Math.abs(stroke.move(sign * 900, 0, i * 16)! - 3)).toBeLessThanOrEqual(1);
    expect(stroke.release(200)).toBe(3 + sign);
  }
});
it('locks the axis for the stroke, so drift cannot undo a horizontal selection', () => {
  const horizontal = new PageSwipe(0, 0, 400, 0);
  horizontal.move(50, 4, 16);
  horizontal.move(170, 80, 32);
  expect(horizontal.axis).toBe('horizontal');
  expect(horizontal.release(160)).toBe(1);
  const vertical = new PageSwipe(0, 0, 400, 0);
  expect(vertical.move(2, 80, 16)).toBeNull();
  expect(vertical.move(500, 0, 32)).toBeNull();
  expect(vertical.release(40)).toBe(0);
});
it('supports a reversed flick and cancellation without noisy one-pixel oscillation', () => {
  const stroke = new PageSwipe(0, 0, 400, 0);
  stroke.move(240, 0, 50);
  stroke.move(-60, 0, 90);
  stroke.move(-30, 0, 110);
  expect(stroke.release(110)).toBe(-1);
  const noise = new PageSwipe(0, 0, 400, 0);
  noise.move(240, 0, 20);
  noise.move(-0.1, 0, 30);
  expect(noise.release(30)).toBe(1);
  expect(noise.release(30, true)).toBe(0);
});
it('does not count an interrupted animation as distance supplied by a new finger', () => {
  const next = new PageSwipe(1, 0.65, 400, 0);
  expect(next.move(20, 0, 16)).toBeCloseTo(0.7);
  expect(next.release(20)).toBe(1);
});
it('uses the captured width throughout a stroke and does not turn stale velocity into a flick', () => {
  const stroke = new PageSwipe(0, 0, 320, 0);
  expect(stroke.move(60, 0, 20)).toBeCloseTo(0.1875);
  expect(stroke.release(250)).toBe(0);
});

it('returns to the same position after retracing a stroke beyond the visual bound', () => {
  const stroke = new PageSwipe(0, 0, 400, 0);
  expect(stroke.move(600, 0, 30)).toBe(1);
  expect(stroke.move(-200, 0, 1000)).toBe(1);
  expect(stroke.move(-400, 0, 2000)).toBe(0);
  expect(stroke.release(2200)).toBe(0);
});

it('settles with a fixed curve and bounded travel speed in either direction', () => {
  for (const destination of [-1, 0, 0.39, 0.41, 1]) {
    const from = 0.4;
    const { ease, duration } = pageSwipeSettlement(from, destination);
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    let previous = 0;
    for (let step = 1; step <= 100; step++) {
      const progress = ease(step / 100);
      expect(progress).toBeGreaterThanOrEqual(previous);
      expect(progress).toBeLessThanOrEqual(1);
      const pagesPerSecond =
        ((progress - previous) * Math.abs(destination - from)) / (duration / 100);
      expect(pagesPerSecond).toBeLessThanOrEqual(5);
      previous = progress;
    }
    expect(ease(0.0001) / 0.0001).toBeLessThan(0.001);
    expect((1 - ease(0.9999)) / 0.0001).toBeLessThan(0.001);
  }
  expect(pageSwipeSettlement(0, 1).duration).toBeCloseTo(0.3);
  expect(pageSwipeSettlement(0.6, -1).duration).toBeCloseTo(0.48);
});

it('uses visible halfway progress for a slow drag, including a pause before release', () => {
  for (const direction of [-1, 1]) {
    for (const distance of [40, 160, 199, 200, 201, 300]) {
      const stroke = new PageSwipe(3, 3, 400, 0);
      stroke.move(direction * distance, 0, 1000);
      expect(stroke.release(2000)).toBe(3 + (distance > 200 ? direction : 0));
    }
  }
});
it('accepts a small deliberate flick but returns the same short movement when released at rest', () => {
  for (const direction of [-1, 1]) {
    const flick = new PageSwipe(0, 0, 400, 0);
    flick.move(direction * 8, 0, 10);
    flick.move(direction * 12, 0, 25);
    expect(flick.release(30)).toBe(direction);
    expect(flick.release(200)).toBe(0);
    const drag = new PageSwipe(0, 0, 400, 0);
    drag.move(direction * 8, 0, 100);
    drag.move(direction * 12, 0, 250);
    expect(drag.release(300)).toBe(0);
  }
});

it('uses the last flick direction even while the rail remains on the other side of origin', () => {
  for (const direction of [-1, 1]) {
    const stroke = new PageSwipe(3, 3, 400, 0);
    expect(stroke.move(direction * 260, 0, 200)).toBeCloseTo(3 + direction * 0.65);
    stroke.move(-direction * 60, 0, 1000);
    expect(stroke.move(-direction * 80, 0, 1015)).toBeCloseTo(3 + direction * 0.3);
    expect(stroke.release(1020)).toBe(3 - direction);
  }
});
it('uses halfway progress for slow reversal on either side without inventing a flick', () => {
  for (const direction of [-1, 1]) {
    const stroke = new PageSwipe(3, 3, 400, 0);
    stroke.move(direction * 300, 0, 300);
    stroke.move(-direction * 40, 0, 700);
    expect(stroke.release(750)).toBe(3 + direction);
    stroke.move(-direction * 80, 0, 1100);
    expect(stroke.release(1150)).toBe(3);
    stroke.move(-direction * 400, 0, 2100);
    expect(stroke.release(2200)).toBe(3 - direction);
  }
});

it('requires more reverse flick strength as the visible offset grows, symmetrically', () => {
  for (const side of [-1, 1]) {
    const reverse = (outward: number, lastDelta: number) => {
      const stroke = new PageSwipe(3, 3, 400, 0);
      stroke.move(side * outward, 0, 200);
      stroke.move(-side * 8, 0, 1000);
      stroke.move(-side * lastDelta, 0, 1015);
      return stroke.release(1020);
    };
    // The same gentle flick succeeds near the origin, but only returns home from far away.
    expect(reverse(0, 12)).toBe(3 - side);
    expect(reverse(60, 18)).toBe(3 - side);
    expect(reverse(260, 18)).toBe(3);
    expect(reverse(380, 18)).toBe(3);
    expect(reverse(380, 60)).toBe(3 - side);
  }
});
