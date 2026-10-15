/** Percent controls the available horizontal travel; vertical position is in CSS pixels. */
export function freeIslandPosition(
  x: number,
  y: number,
  size: { width: number; height: number },
  viewport: { width: number; height: number },
) {
  return {
    left:
      size.width / 2 + Math.max(0, viewport.width - size.width) * Math.max(0, Math.min(1, x / 100)),
    top: Math.max(0, Math.min(y, viewport.height - size.height)),
    bottom: 'auto',
    x: '-50%',
  };
}
