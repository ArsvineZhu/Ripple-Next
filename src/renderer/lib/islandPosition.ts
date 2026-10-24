/** Percent controls the available horizontal travel; vertical position is in CSS pixels. */
export function freeIslandPosition(
  x: number,
  y: number,
  size: { width: number; height: number },
  viewport: { width: number; height: number },
) {
  return {
    left: `${Math.max(0, Math.min(100, x))}%`,
    top: Math.max(0, Math.min(y, viewport.height - size.height)),
    bottom: 'auto',
    x: `${-Math.max(0, Math.min(100, x))}%`,
  };
}
