import type { DisplacementMap, GlassShape } from './vendor/adapted/maps';
import { cachedCornerField } from './contour';

/** A clear control lens compresses the value beneath it and bends light at its rim. */
export function handleLensMap(source: DisplacementMap, shape: GlassShape): DisplacementMap {
  const { width, height } = source;
  const radius = Math.min(shape.radius, width / 2, height / 2);
  const field = cachedCornerField(width, height, radius, shape.cornerK ?? 1, 1);
  const point = { dist: 0, nx: 0, ny: 0 };
  const vectors = new Float32Array(width * height * 2);
  let maximum = 0.01;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = (y * width + x) * 4;
      const index = (y * width + x) * 2;
      field(x + 0.5, y + 0.5, width, height, radius, point);
      const depth = Math.max(0, Math.min(1, point.dist / 3));
      const interior = depth * depth * (3 - 2 * depth);
      const dx =
        (source.data[pixel] / 255 - 0.5) * source.scale * 1.5 +
        (x + 0.5 - width / 2) * (1 / 0.93 - 1) * interior;
      const dy =
        (source.data[pixel + 1] / 255 - 0.5) * source.scale * 1.5 +
        (y + 0.5 - height / 2) * (1 / 0.72 - 1) * interior;
      vectors[index] = dx;
      vectors[index + 1] = dy;
      maximum = Math.max(maximum, Math.abs(dx), Math.abs(dy));
    }
  }
  const data = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < vectors.length / 2; index++) {
    data[index * 4] = 255 * (0.5 + vectors[index * 2] / (2 * maximum));
    data[index * 4 + 1] = 255 * (0.5 + vectors[index * 2 + 1] / (2 * maximum));
    data[index * 4 + 2] = 128;
    data[index * 4 + 3] = 255;
  }
  return { width, height, data, scale: (2 * maximum) / 1.5 };
}
