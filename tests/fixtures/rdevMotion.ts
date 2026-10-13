// Independent transcription of src/index.tsx at ac48eab; original truthiness retained.
// MIT Copyright 2025 MAX ROVENSKY. See LICENSE.
import {
  REST,
  type Anchor,
  type Point,
} from '../../src/renderer/components/liquidGlass/interaction';
export function referenceResponse(
  pointer: Point | null,
  rect: Anchor,
  elasticity = 0.15,
  active = false,
) {
  if (!pointer?.x || !pointer.y)
    return { ...REST, scaleX: active ? 0.96 : 1, scaleY: active ? 0.96 : 1 };
  const cx = rect.left + rect.width / 2,
    cy = rect.top + rect.height / 2;
  const deltaX = pointer.x - cx,
    deltaY = pointer.y - cy;
  const edgeDistanceX = Math.max(0, Math.abs(deltaX) - rect.width / 2);
  const edgeDistanceY = Math.max(0, Math.abs(deltaY) - rect.height / 2);
  const edgeDistance = Math.sqrt(edgeDistanceX * edgeDistanceX + edgeDistanceY * edgeDistanceY);
  const fade = edgeDistance > 200 ? 0 : 1 - edgeDistance / 200;
  const centerDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  const nx = centerDistance ? deltaX / centerDistance : 0;
  const ny = centerDistance ? deltaY / centerDistance : 0;
  const stretchIntensity = Math.min(centerDistance / 300, 1) * elasticity * fade;
  return {
    x: deltaX * elasticity * 0.1 * fade,
    y: deltaY * elasticity * 0.1 * fade,
    scaleX: active
      ? 0.96
      : Math.max(
          0.8,
          1 + Math.abs(nx) * stretchIntensity * 0.3 - Math.abs(ny) * stretchIntensity * 0.15,
        ),
    scaleY: active
      ? 0.96
      : Math.max(
          0.8,
          1 + Math.abs(ny) * stretchIntensity * 0.3 - Math.abs(nx) * stretchIntensity * 0.15,
        ),
    fade,
  };
}
