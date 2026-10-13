import {
  buildDisplacementMap,
  buildSpecularMap,
  buildInteriorMask,
  imageDataToUrl,
  type GlassShape,
  type SurfaceProfile,
} from './vendor/adapted/maps';
import { MapCache } from './cache';
import { clearFields, fieldCacheStats } from './contour';

interface MapRequest {
  width: number;
  height: number;
  radius: number;
  bezel: number;
  thickness: number;
  ior: number;
  profile: SurfaceProfile;
  lightAngle: number;
  dpr: number;
  cornerK?: number;
}
type Encoded = { url: string; scale?: number };
const layers = new MapCache<Encoded>();
export function clearMaps() {
  layers.clear();
  clearFields();
}
export function cacheStats() {
  return { layers: layers.snapshot(), fields: fieldCacheStats() };
}

/** Position, press, refraction strength and tint do not invalidate shape resources. */
export function mapsFor(request: MapRequest) {
  const { width, height, radius, bezel, thickness, ior, profile, lightAngle, dpr, cornerK } =
    request;
  const shape: GlassShape = {
    width,
    height,
    radius: Math.min(radius, width / 2, height / 2),
    cornerK,
    cached: true,
  };
  const shapeKey = [width, height, shape.radius, cornerK ?? 1].join('|');
  const get = (
    kind: string,
    dependencies: unknown[],
    generate: () => { data: Uint8ClampedArray; width: number; height: number; scale?: number },
  ) => {
    const key = [kind, shapeKey, ...dependencies].join('|');
    const hit = layers.get(key);
    if (hit) return hit;
    const pixels = generate();
    const result = {
      url: imageDataToUrl(pixels as Parameters<typeof imageDataToUrl>[0]),
      scale: pixels.scale,
    };
    // Decoded RGBA + conservative UTF-16 data URL estimate; GPU allocation is separate.
    layers.set(key, result, pixels.width * pixels.height * 4 + result.url.length * 2);
    return result;
  };
  const glowWidth = Math.min(20, Math.max(4, bezel * 0.6));
  const displacement = get('displacement', [bezel, thickness, ior, profile], () =>
    buildDisplacementMap(shape, { bezel, thickness, ior, profile }),
  );
  const specular = get('specular', [lightAngle, glowWidth, dpr], () =>
    buildSpecularMap(shape, { angle: lightAngle, rimWidth: 1.2, glowWidth }, dpr),
  );
  const mask = get('mask', [bezel], () => buildInteriorMask(shape, bezel, 1));
  return {
    displacement: displacement.url,
    specular: specular.url,
    mask: mask.url,
    scale: displacement.scale!,
    width,
    height,
  };
}
