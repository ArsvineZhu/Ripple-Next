import { MapCache } from './cache';
export interface Field {
  dist: number;
  nx: number;
  ny: number;
}
interface Segment {
  ax: number;
  ay: number;
  dx: number;
  dy: number;
  length2: number;
}

/** Euclidean nearest point on the CSS superellipse quarter, in CSS px.
 * CSS K maps to exponent 2**K; K=1 delegates to the exact upstream circle field.
 * Distance is to 256 sampled chords; ordinary round corners use the exact upstream field.
 */
export function makeCornerField(radius: number, k: number) {
  const exponent = 2 ** k;
  const points = Array.from({ length: 257 }, (_, i) => {
    const angle = ((i / 256) * Math.PI) / 2;
    return {
      x: radius * Math.cos(angle) ** (2 / exponent),
      y: radius * Math.sin(angle) ** (2 / exponent),
    };
  });
  const segments: Segment[] = points.slice(0, -1).map((p, i) => {
    const dx = points[i + 1].x - p.x,
      dy = points[i + 1].y - p.y;
    return { ax: p.x, ay: p.y, dx, dy, length2: dx * dx + dy * dy };
  });
  return (px: number, py: number, w: number, h: number, r: number, field: Field) => {
    const dx = px - w / 2,
      dy = py - h / 2;
    const sx = dx < 0 ? -1 : 1,
      sy = dy < 0 ? -1 : 1;
    const qx = Math.abs(dx) - (w / 2 - r),
      qy = Math.abs(dy) - (h / 2 - r);
    if (qx <= 0 || qy <= 0 || r === 0) {
      if (qx > qy) {
        field.dist = r - qx;
        field.nx = sx;
        field.ny = 0;
      } else {
        field.dist = r - qy;
        field.nx = 0;
        field.ny = sy;
      }
      return;
    }
    const distance2 = (index: number) => {
      const s = segments[index];
      const t = Math.max(0, Math.min(1, ((qx - s.ax) * s.dx + (qy - s.ay) * s.dy) / s.length2));
      const x = s.ax + t * s.dx,
        y = s.ay + t * s.dy;
      return { d: (qx - x) ** 2 + (qy - y) ** 2, x, y, nx: s.dy, ny: -s.dx };
    };
    // Squared distance to a convex quadrant is unimodal along its parameter.
    let lo = 0,
      hi = segments.length - 1;
    while (hi - lo > 6) {
      const a = Math.floor(lo + (hi - lo) / 3),
        b = Math.ceil(hi - (hi - lo) / 3);
      if (distance2(a).d < distance2(b).d) hi = b;
      else lo = a;
    }
    let nearest = distance2(lo);
    for (const i of [0, segments.length - 1]) {
      const candidate = distance2(i);
      if (candidate.d < nearest.d) nearest = candidate;
    }
    for (let i = lo + 1; i <= hi; i++) {
      const candidate = distance2(i);
      if (candidate.d < nearest.d) nearest = candidate;
    }
    const inside = (qx / r) ** exponent + (qy / r) ** exponent <= 1;
    field.dist = Math.sqrt(nearest.d) * (inside ? 1 : -1);
    // Use the analytic normal at the projected point to avoid chord joins in highlights.
    const nx = (nearest.x / r) ** (exponent - 1),
      ny = (nearest.y / r) ** (exponent - 1);
    const length = Math.hypot(nx, ny);
    field.nx = (sx * nx) / length;
    field.ny = (sy * ny) / length;
  };
}

const fields = new MapCache<ReturnType<typeof makeCornerField>>(16, 24 * 1024 * 1024);
export function clearFields() {
  fields.clear();
}
export function fieldCacheStats() {
  return fields.snapshot();
}
export function cachedCornerField(
  width: number,
  height: number,
  radius: number,
  k: number,
  dpr: number,
) {
  const key = [width, height, radius, k, dpr].join('|');
  const hit = fields.get(key);
  if (hit) return hit;
  const direct = makeCornerField(radius, k);
  const W = Math.round(width * dpr),
    H = Math.round(height * dpr);
  // Fold only when the raster's physical centers are exactly symmetric.
  // Fractional raster steps have asymmetric floating point rounding; keep their exact C pixels.
  const foldX = Number.isInteger(dpr),
    foldY = Number.isInteger(dpr);
  const stride = foldX ? Math.ceil(W / 2) : W;
  const rows = foldY ? Math.ceil(H / 2) : H;
  const values = new Float64Array(stride * rows * 3).fill(NaN);
  const scratch: Field = { dist: 0, nx: 0, ny: 0 };
  const sample = (px: number, py: number, w: number, h: number, r: number, f: Field) => {
    const ix = Math.round(px * dpr - 0.5),
      iy = Math.round(py * dpr - 0.5);
    const x = foldX ? Math.min(ix, W - 1 - ix) : ix;
    const y = foldY ? Math.min(iy, H - 1 - iy) : iy;
    const index = (y * stride + x) * 3;
    if (Number.isNaN(values[index])) {
      direct((x + 0.5) / dpr, (y + 0.5) / dpr, w, h, r, scratch);
      values[index] = scratch.dist;
      values[index + 1] = scratch.nx;
      values[index + 2] = scratch.ny;
    }
    f.dist = values[index];
    f.nx = values[index + 1] * (foldX && ix !== x ? -1 : 1);
    f.ny = values[index + 2] * (foldY && iy !== y ? -1 : 1);
  };
  fields.set(key, sample, values.byteLength);
  return sample;
}
