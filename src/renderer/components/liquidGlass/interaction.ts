// Motion equations extracted from rdev ac48eab (MIT, see vendor/rdev/LICENSE).
// Positioning translate(-50%, -50%) is deliberately owned by layout, not motion.
export interface Point {
  x: number;
  y: number;
}
export interface Anchor {
  left: number;
  top: number;
  width: number;
  height: number;
}
export interface Response {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  fade: number;
}
export const REST: Response = { x: 0, y: 0, scaleX: 1, scaleY: 1, fade: 0 };

export function rdevResponse(
  pointer: Point | null,
  anchor: Anchor,
  elasticity = 0.15,
  zone = 200,
  pressed = false,
): Response {
  if (!pointer || anchor.width <= 0 || anchor.height <= 0)
    return { ...REST, scaleX: pressed ? 0.96 : 1, scaleY: pressed ? 0.96 : 1 };
  const dx = pointer.x - anchor.left - anchor.width / 2;
  const dy = pointer.y - anchor.top - anchor.height / 2;
  const edge = Math.hypot(
    Math.max(0, Math.abs(dx) - anchor.width / 2),
    Math.max(0, Math.abs(dy) - anchor.height / 2),
  );
  const fade = zone > 0 ? Math.max(0, 1 - edge / zone) : 0;
  const distance = Math.hypot(dx, dy);
  const nx = distance ? Math.abs(dx / distance) : 0;
  const ny = distance ? Math.abs(dy / distance) : 0;
  const intensity = Math.min(distance / 300, 1) * elasticity * fade;
  return {
    x: dx * elasticity * 0.1 * fade,
    y: dy * elasticity * 0.1 * fade,
    scaleX: pressed ? 0.96 : Math.max(0.8, 1 + nx * intensity * 0.3 - ny * intensity * 0.15),
    scaleY: pressed ? 0.96 : Math.max(0.8, 1 + ny * intensity * 0.3 - nx * intensity * 0.15),
    fade,
  };
}
