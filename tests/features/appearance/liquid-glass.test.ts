import { describe, expect, it, beforeAll, vi } from 'vitest';
import { cacheStats, clearMaps, mapsFor } from '../../../src/renderer/components/liquidGlass/maps';
import { rdevResponse } from '../../../src/renderer/components/liquidGlass/interaction';
import { referenceResponse } from './fixtures/rdevMotion';
import {
  makeCornerField,
  cachedCornerField,
} from '../../../src/renderer/components/liquidGlass/contour';
import { MapCache } from '../../../src/renderer/components/liquidGlass/cache';
import * as original from '../../../src/renderer/components/liquidGlass/vendor/leonard/maps';
import * as adapted from '../../../src/renderer/components/liquidGlass/vendor/adapted/maps';

beforeAll(() => {
  class Pixels {
    width: number;
    height: number;
    data: Uint8ClampedArray;
    constructor(a: number | Uint8ClampedArray, b: number, c?: number) {
      this.width = typeof a === 'number' ? a : b;
      this.height = typeof a === 'number' ? b : c!;
      this.data = typeof a === 'number' ? new Uint8ClampedArray(a * b * 4) : a;
    }
  }
  globalThis.ImageData = Pixels as unknown as typeof ImageData;
});
const optics = { bezel: 12, thickness: 18, ior: 1.5, profile: 'squircle' as const };
const equalPixels = (a: Uint8ClampedArray, b: Uint8ClampedArray) =>
  Buffer.from(a).equals(Buffer.from(b));
describe('Pinned motion and material contracts', () => {
  it('matches the independent rdev equations along approach, edges, centre and release', () => {
    const anchor = { left: 300, top: 280, width: 264, height: 96 };
    for (const elasticity of [0.15, 0.35])
      for (const pressed of [true, false]) {
        for (let i = 0; i < 160; i++) {
          const point = {
            x: 432 + Math.cos((i / 160) * Math.PI * 2) * 350,
            y: 328 + Math.sin((i / 160) * Math.PI * 2) * 230,
          };
          const response = rdevResponse(point, anchor, elasticity, 200, pressed);
          const reference = referenceResponse(point, anchor, elasticity, pressed);
          for (const key of ['x', 'y', 'scaleX', 'scaleY', 'fade'] as const)
            expect(response[key]).toBeCloseTo(reference[key], 12);
        }
      }
    expect(rdevResponse({ x: 432, y: 328 }, anchor).scaleX).toBe(1);
    expect(rdevResponse(null, anchor).x).toBe(0);
  });
  it('distinguishes absent pointer from a valid zero coordinate', () => {
    const anchor = { left: 10, top: 10, width: 40, height: 28 };
    expect(rdevResponse({ x: 0, y: 0 }, anchor).fade).toBeGreaterThan(0);
    expect(rdevResponse(null, anchor).fade).toBe(0);
  });
  it('keeps all upstream profiles, neutral centre, invalid optics and round degeneration', () => {
    for (const profile of ['squircle', 'circle', 'lip'] as const)
      expect(original.refractionProfile({ ...optics, profile }).every(Number.isFinite)).toBe(true);
    for (const ior of [0, -1, NaN, Infinity])
      expect(() => adapted.refractionProfile({ ...optics, ior })).toThrow(RangeError);
    for (const zero of [{ thickness: 0 }, { ior: 1 }])
      expect(
        original.refractionProfile({ ...optics, ...zero }).every((n) => Math.abs(n) < 1e-6),
      ).toBe(true);
    for (const [width, height, radius] of [
      [100, 64, 20],
      [320, 64, 999],
      [80, 300, 999],
    ]) {
      const shape = { width, height, radius };
      const current = adapted.buildDisplacementMap({ ...shape, cornerK: 1 }, optics);
      const baseline = original.buildDisplacementMap(shape, optics);
      expect([current.width, current.height, current.scale]).toEqual([
        baseline.width,
        baseline.height,
        baseline.scale,
      ]);
      expect(equalPixels(current.data, baseline.data)).toBe(true);
      expect(
        equalPixels(
          adapted.buildSpecularMap(
            { ...shape, cornerK: 1 },
            { angle: -135, rimWidth: 1.2, glowWidth: 7 },
            1.5,
          ).data,
          original.buildSpecularMap(shape, { angle: -135, rimWidth: 1.2, glowWidth: 7 }, 1.5).data,
        ),
      ).toBe(true);
      expect(
        equalPixels(
          adapted.buildInteriorMask({ ...shape, cornerK: 1 }, 12).data,
          original.buildInteriorMask(shape, 12).data,
        ),
      ).toBe(true);
    }
  });
  it('uses Euclidean CSS pixel distance, including axis and interior minima', () => {
    for (const k of [1.15, 1.3, 1.62]) {
      const r = 30,
        n = 2 ** k,
        field = makeCornerField(r, k);
      const curve = Array.from({ length: 16385 }, (_, i) => {
        const a = ((i / 16384) * Math.PI) / 2;
        return [r * Math.cos(a) ** (2 / n), r * Math.sin(a) ** (2 / n)];
      });
      for (let x = 1; x <= 38; x += 4)
        for (let y = 1; y <= 38; y += 4) {
          const output = { dist: 0, nx: 0, ny: 0 };
          field(130 + x, 130 + y, 160, 160, r, output);
          const nearest = Math.min(...curve.map(([cx, cy]) => Math.hypot(x - cx, y - cy)));
          expect(Math.abs(Math.abs(output.dist) - nearest)).toBeLessThan(0.01);
          expect(Math.hypot(output.nx, output.ny)).toBeCloseTo(1, 12);
        }
    }
  });
  it('D preserves C displacement, highlight and tint pixels at DPR 1/1.5/2', () => {
    for (const dpr of [1, 1.5, 2])
      for (const [width, height, radius, cornerK] of [
        [40, 28, 14, 1.15],
        [100, 64, 20, 1.15],
        [101, 65, 30, 1.62],
        [170, 40, 20, 1.3],
      ]) {
        const shape = { width, height, radius, cornerK };
        const c = adapted.buildDisplacementMap(shape, optics);
        const d = adapted.buildDisplacementMap({ ...shape, cached: true }, optics);
        expect(d.scale).toBe(c.scale);
        expect(equalPixels(c.data, d.data)).toBe(true);
        expect(
          equalPixels(
            adapted.buildInteriorMask({ ...shape, cached: true }, 12, 1).data,
            adapted.buildInteriorMask(shape, 12, 1).data,
          ),
        ).toBe(true);
        const options = { angle: -135, rimWidth: 1.2, glowWidth: 7 };
        expect(
          equalPixels(
            adapted.buildSpecularMap({ ...shape, cached: true }, options, dpr).data,
            adapted.buildSpecularMap(shape, options, dpr).data,
          ),
        ).toBe(true);
        const sample = cachedCornerField(width, height, radius, cornerK, dpr);
        expect(sample).toBeTypeOf('function');
      }
  });
  it('evicts least recently used entries and refuses oversized cached resources', () => {
    const cache = new MapCache<number>(2, 10);
    cache.set('a', 1, 4);
    cache.set('b', 2, 4);
    cache.get('a');
    cache.set('c', 3, 4);
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe(1);
    cache.set('large', 4, 11);
    expect(cache.get('large')).toBeUndefined();
    expect(cache.snapshot().estimatedBytes).toBe(8);
  });
  it("reuses geometry and invalidates only each layer's actual dependencies", () => {
    let encoded = 0;
    const encode = vi
      .spyOn(adapted, 'imageDataToUrl')
      .mockImplementation(() => `data:image/png;base64,${++encoded}`);
    const request = {
      width: 40,
      height: 28,
      radius: 14,
      bezel: 7,
      thickness: 10.5,
      ior: 1.5,
      profile: 'squircle' as const,
      lightAngle: -135,
      dpr: 1.5,
      cornerK: 1.15,
    };
    clearMaps();
    const first = mapsFor(request);
    expect(encoded).toBe(3);
    expect(mapsFor({ ...request, radius: 999 })).toEqual(first);
    expect(encoded).toBe(3);
    const illuminated = mapsFor({ ...request, lightAngle: 90 });
    expect(encoded).toBe(4);
    expect(illuminated.displacement).toBe(first.displacement);
    expect(illuminated.mask).toBe(first.mask);
    mapsFor({ ...request, thickness: 14 });
    expect(encoded).toBe(5);
    mapsFor({ ...request, dpr: 2 });
    expect(encoded).toBe(6);
    expect(cacheStats().layers.entries).toBe(6);
    clearMaps();
    expect(cacheStats().layers.entries).toBe(0);
    encode.mockRestore();
  });
});
