type SwipeAxis = 'pending' | 'horizontal' | 'vertical';

/** Ambiguous diagonals belong to scrollable content; ownership never changes mid-contact. */
export function pageSwipeAxis(x: number, y: number, verticalContent: boolean): SwipeAxis {
  if (Math.max(x, y) < 8) return 'pending';
  const horizontalRatio = verticalContent ? 3 : 1.5;
  if (x > y * horizontalRatio) return 'horizontal';
  if (verticalContent || y > x * 1.2 || x + y >= 24) return 'vertical';
  return 'pending';
}

/** One physical stroke owns one neighbor. Selection changes only on release. */
export class PageSwipe {
  axis: SwipeAxis = 'pending';
  private distance = 0;
  private travelX = 0;
  private travelY = 0;
  private samples: { at: number; distance: number }[];

  constructor(
    readonly anchor: number,
    public origin: number,
    readonly width: number,
    at: number,
    readonly verticalContent = false,
  ) {
    this.samples = [{ at, distance: 0 }];
  }

  move(x: number, y: number, at: number, livePosition = this.origin) {
    const pending = this.axis === 'pending';
    this.travelX += Math.abs(x);
    this.travelY += Math.abs(y);
    this.distance += x;
    this.samples.push({ at, distance: this.distance });
    if (this.samples.length > 32) this.samples.shift();
    while (this.samples.length > 2 && this.samples[1].at < at - 80) this.samples.shift();
    if (this.axis === 'pending')
      this.axis = pageSwipeAxis(this.travelX, this.travelY, this.verticalContent);
    if (pending && this.axis === 'horizontal') this.origin = livePosition;
    return this.axis === 'horizontal'
      ? Math.max(
          this.anchor - 1,
          Math.min(this.anchor + 1, this.origin + this.distance / this.width),
        )
      : null;
  }

  /** Use the final directional run, not velocity averaged across a reversal. */
  private releaseMotion(at: number) {
    let first = -1;
    let last = -1;
    let direction = 0;
    let distance = 0;
    let movements = 0;
    for (let index = this.samples.length - 1; index > 0; index--) {
      const sample = this.samples[index];
      if (at - sample.at > 80) break;
      const delta = sample.distance - this.samples[index - 1].distance;
      if (Math.abs(delta) < 0.5) continue;
      if (direction && Math.sign(delta) !== direction) break;
      direction = Math.sign(delta);
      if (last === -1) last = index;
      first = index;
      distance += delta;
      movements++;
    }
    // Two actual movement samples establish speed after a stationary pause.
    const elapsed = first >= 0 ? this.samples[last].at - this.samples[first].at : 0;
    const velocity =
      movements >= 2 && elapsed > 0
        ? ((this.samples[last].distance - this.samples[first].distance) / elapsed) *
          Math.max(0, 1 - (at - this.samples[last].at) / 80)
        : 0;
    return { distance, velocity };
  }

  release(at: number, cancelled = false): number {
    if (cancelled || this.axis !== 'horizontal') return this.anchor;
    const motion = this.releaseMotion(at);
    const flick =
      Math.abs(motion.distance) >= Math.max(12, Math.min(20, this.width * 0.03)) &&
      Math.abs(motion.velocity) >= 0.45;
    if (flick) {
      const direction = Math.sign(motion.velocity);
      const displacement = Math.max(
        -1,
        Math.min(1, this.origin - this.anchor + this.distance / this.width),
      );
      // An opposite flick must first overcome the visible offset. A weak pullback
      // returns to the origin; only sufficient projected travel reaches its other neighbor.
      const reverseDistance = Math.max(0, -displacement * direction) * this.width;
      const requiredSpeed = 0.45 + reverseDistance / 220;
      return Math.abs(motion.velocity) >= requiredSpeed ? this.anchor + direction : this.anchor;
    }
    const direction = Math.sign(this.distance);
    const progress = (this.origin - this.anchor + this.distance / this.width) * direction;
    return progress > 0.5 ? this.anchor + direction : this.anchor;
  }
}

/** Released pages share a fixed travel rate and curve, independent of finger speed. */
export function pageSwipeSettlement(from: number, to: number) {
  return {
    // 300 ms per page, with enough time for a short return to remain visible.
    duration: Math.max(0.18, Math.abs(to - from) * 0.3),
    ease: (t: number) => {
      const progress = Math.max(0, Math.min(1, t));
      return progress * progress * (3 - 2 * progress);
    },
  };
}
