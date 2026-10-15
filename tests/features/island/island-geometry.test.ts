// @vitest-environment happy-dom
import { act, createElement, useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import type { MotionValue } from 'motion/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useIslandGeometry } from '../../../src/renderer/hooks/useIslandGeometry';
import { expandedTabSize } from '../../../src/renderer/lib/tabGeometry';
import { islandPages } from '../../../src/renderer/lib/tabs';

const motion = vi.hoisted(() => ({
  reduced: false,
  mediaListeners: new Set<() => void>(),
  animations: [] as {
    value: MotionValue<number>;
    target: number;
    stop: ReturnType<typeof vi.fn>;
  }[],
}));
vi.mock('motion/react', async (original) => ({
  ...(await original<typeof import('motion/react')>()),
  animate: (value: MotionValue<number>, target: number) => {
    const animation = { value, target, stop: vi.fn() };
    motion.animations.push(animation);
    return animation;
  },
}));

let root: Root;
let host: HTMLDivElement;
let geometry: ReturnType<typeof useIslandGeometry>;
type Options = Parameters<typeof useIslandGeometry>[0];
const collapsed: Options = {
  width: 170,
  height: 40,
  getTabSize: expandedTabSize,
  getTabRadius: islandPages.radius,
  expanded: false,
  tab: 'search',
};
const search: Options = {
  ...collapsed,
  ...expandedTabSize('search'),
  expanded: true,
  tab: 'search',
};
function Harness(props: Options) {
  const currentGeometry = useIslandGeometry(props);
  useLayoutEffect(() => {
    geometry = currentGeometry;
  });
  return null;
}
async function render(props: Options) {
  await act(async () => root.render(createElement(Harness, props)));
}
function dimensions() {
  return [geometry.width.get(), geometry.height.get()];
}
async function settle() {
  for (const animation of motion.animations.splice(0))
    if (!animation.stop.mock.calls.length) animation.value.set(animation.target);
  await new Promise((resolve) => requestAnimationFrame(resolve));
}
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  motion.reduced = false;
  motion.mediaListeners.clear();
  vi.spyOn(window, 'matchMedia').mockImplementation(
    () =>
      ({
        get matches() {
          return motion.reduced;
        },
        addEventListener: (_event: string, listener: () => void) =>
          motion.mediaListeners.add(listener),
        removeEventListener: (_event: string, listener: () => void) =>
          motion.mediaListeners.delete(listener),
      }) as unknown as MediaQueryList,
  );
  motion.animations = [];
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Island geometry ownership', () => {
  it('updates configured corners while keeping collapsed capsules and limiting small pages', async () => {
    motion.reduced = true;
    await render({ ...search, cornerRadius: 0 });
    expect(geometry.radius.get()).toBe(0);
    expect(geometry.fallbackRadius.get()).toBe(0);
    await render({ ...search, cornerRadius: 60 });
    expect(geometry.radius.get()).toBe(60);
    await render({ ...collapsed, cornerRadius: 0 });
    expect(geometry.radius.get()).toBe(20);
    await render({ ...search, width: 60, height: 40, cornerRadius: 60 });
    expect(geometry.radius.get()).toBe(20);
  });
  it('uses the actual collapsed height and preserves the round-corner fallback', async () => {
    await render(collapsed);
    expect(geometry.radius.get()).toBe(20);
    expect(geometry.cornerK.get()).toBeCloseTo(1.3);
    expect(geometry.fallbackRadius.get()).toBe(14);
    await render({ ...collapsed, width: 260, height: 52 });
    await settle();
    expect(geometry.radius.get()).toBe(26);
  });

  it('retargets opening and closing from the currently visible size and curvature', async () => {
    await render(collapsed);
    await render(search);
    for (const animation of motion.animations.filter((item) => !item.stop.mock.calls.length))
      animation.value.set((animation.value.get() + animation.target) / 2);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const before = dimensions();
    const corner = geometry.cornerK.get();
    expect(before[0]).toBeGreaterThan(collapsed.width);
    expect(before[0]).toBeLessThan(search.width);
    expect(corner).toBeGreaterThan(1.3);
    expect(corner).toBeLessThan(1.62);
    await render(collapsed);
    expect(dimensions()).toEqual(before);
    expect(geometry.cornerK.get()).toBe(corner);
    await settle();
    expect(dimensions()).toEqual([170, 40]);
    expect(geometry.cornerK.get()).toBeCloseTo(1.3);
  });

  it('hands an unfinished opening to tab navigation without snapping to an expanded endpoint', async () => {
    await render(collapsed);
    await render(search);
    for (const animation of motion.animations.filter((item) => !item.stop.mock.calls.length))
      animation.value.set((animation.value.get() + animation.target) / 2);
    const before = dimensions();
    geometry.followTabs('search', 'workflows', 0, true);
    expect(dimensions()).toEqual(before);
    await settle();
    geometry.followTabs('search', 'workflows', 0.5, true);
    expect(dimensions()).toEqual([442.5, 165]);
    geometry.followTabs('search', 'workflows', 0.25, true);
    expect(dimensions()).toEqual([423.75, 142.5]);
    const interrupted = dimensions();
    await render(collapsed);
    expect(dimensions()).toEqual(interrupted);
    await settle();
    expect(dimensions()).toEqual([170, 40]);
  });

  it('follows tab and answer sizes while keeping expanded curvature and respecting reduced motion', async () => {
    motion.reduced = true;
    await render(collapsed);
    await render(search);
    expect(dimensions()).toEqual([405, 120]);
    expect(geometry.radius.get()).toBe(30);
    expect(geometry.cornerK.get()).toBeCloseTo(1.62);
    expect(motion.animations).toHaveLength(0);
    geometry.followTabs('overview', 'tasks', 0.5, true);
    expect(dimensions()).toEqual([380, 220]);
    geometry.followTabs('tasks', 'tasks', 0, false);
    await render({ ...collapsed, width: 380, height: 600, expanded: true, tab: 'assistant' });
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(dimensions()).toEqual([380, 600]);
    expect(geometry.radius.get()).toBe(30);
    expect(geometry.cornerK.get()).toBeCloseTo(1.62);
  });

  it('finishes an in-flight transition when the OS enables reduced motion', async () => {
    await render(collapsed);
    await render(search);
    for (const animation of motion.animations.filter((item) => !item.stop.mock.calls.length))
      animation.value.set(0.5);
    expect(dimensions()[0]).toBeLessThan(405);
    await act(async () => {
      motion.reduced = true;
      motion.mediaListeners.forEach((listener) => listener());
    });
    expect(dimensions()).toEqual([405, 120]);
  });
});
