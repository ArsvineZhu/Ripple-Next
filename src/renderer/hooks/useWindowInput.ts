import { islandInputRectangle } from '../../shared/inputGeometry';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { cancelFrame, frame } from 'motion/react';

import type { InputRect } from '../../shared/contracts';

interface Point {
  x: number;
  y: number;
}

function contains(rect: DOMRect, point: Point) {
  return (
    point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom
  );
}

export function useWindowInput(onGeometryExit: () => void) {
  const islandElementRef = useRef<HTMLDivElement | null>(null);
  const lastWindowShapeRef = useRef<InputRect | null>(null);
  const lastBoundsRef = useRef<DOMRect | null>(null);
  const pointerPositionRef = useRef<Point | null>(null);
  const onGeometryExitRef = useRef(onGeometryExit);
  useLayoutEffect(() => {
    onGeometryExitRef.current = onGeometryExit;
  }, [onGeometryExit]);
  const trackPointerPosition = useCallback((event: { clientX: number; clientY: number }) => {
    pointerPositionRef.current = { x: event.clientX, y: event.clientY };
  }, []);
  const measureInputRegion = useCallback(() => {
    const element = islandElementRef.current;
    if (!element) return;

    const bounds = element.getBoundingClientRect();
    const previousBounds = lastBoundsRef.current;
    const pointerPosition = pointerPositionRef.current;
    if (
      previousBounds &&
      pointerPosition &&
      contains(previousBounds, pointerPosition) &&
      !contains(bounds, pointerPosition)
    ) {
      onGeometryExitRef.current();
    }
    lastBoundsRef.current = bounds;
    const platform = window.electronAPI?.platform;
    if (platform !== 'linux' && platform !== 'win32') return;

    const rect =
      platform === 'win32'
        ? {
            x: bounds.left,
            y: bounds.top,
            width: bounds.width,
            height: bounds.height,
            scaleFactor: window.devicePixelRatio || 1,
          }
        : islandInputRectangle(
            bounds,
            { width: window.innerWidth, height: window.innerHeight },
            window.devicePixelRatio || 1,
          );

    if (rect.width <= 0 || rect.height <= 0) return;
    const previous = lastWindowShapeRef.current;
    if (
      previous &&
      previous.x === rect.x &&
      previous.y === rect.y &&
      previous.width === rect.width &&
      previous.height === rect.height &&
      previous.scaleFactor === rect.scaleFactor
    )
      return;

    lastWindowShapeRef.current = rect;
    window.electronAPI.setWindowInputShape(rect);
  }, []);
  // Motion deduplicates the stable callback and runs it after this frame's DOM writes.
  // Page progress, geometry and shell transforms can all request the same measurement.
  const syncWindowInputRegion = useCallback(() => {
    frame.postRender(measureInputRegion);
  }, [measureInputRegion]);
  useEffect(() => {
    measureInputRegion();
    window.addEventListener('resize', syncWindowInputRegion);
    return () => {
      window.removeEventListener('resize', syncWindowInputRegion);
      cancelFrame(measureInputRegion);
    };
  }, [measureInputRegion, syncWindowInputRegion]);
  return { islandElementRef, syncWindowInputRegion, trackPointerPosition };
}
