// @vitest-environment happy-dom
import { act, createElement, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { TabPanels } from '../../../src/renderer/components/TabPanels';
import { motionValue } from 'motion/react';
import { ElasticScrollArea } from '../../../src/renderer/components/ElasticScrollArea';
import type { ScrollGestureStart } from '../../../src/shared/contracts';

let host: HTMLDivElement;
let root: Root;
async function gestureHarness() {
  vi.useFakeTimers();
  const onSelect = vi.fn();
  function Harness() {
    const [[activeId, direction], setSelection] = useState([0, 0]);
    return createElement(TabPanels<number>, {
      tabs: [0, 1, 2, 3],
      activeId,
      direction,
      width: motionValue(400),
      disabled: false,
      onSelect: (id, dir = 1) => {
        onSelect(id, dir);
        setSelection([id, dir]);
      },
      onProgress: vi.fn(),
      renderTab: (id) => String(id),
    });
  }
  await act(async () => root.render(createElement(Harness)));
  const viewport = host.querySelector<HTMLElement>('[data-tab-viewport]')!;
  const send = async (deltaX: number, deltaY = 0, elapsed = 16) => {
    const event = new WheelEvent('wheel', { deltaX, deltaY, bubbles: true, cancelable: true });
    await act(async () => {
      viewport.dispatchEvent(event);
      await vi.advanceTimersByTimeAsync(elapsed);
    });
    return event;
  };
  return { onSelect, send, viewport };
}
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(window, 'electronAPI');
});
it('does not interpret a single-stroke magnitude fluctuation as a second page', async () => {
  const x = await gestureHarness();
  for (const delta of [100, 40, 60, 30, 15, 5]) await x.send(delta);
  expect(x.onSelect).toHaveBeenCalledTimes(1);
});
it('ignores a tiny opposite-sign tick instead of oscillating between pages', async () => {
  const x = await gestureHarness();
  for (const delta of [100, -0.1, 80, 40]) await x.send(delta);
  expect(x.onSelect).toHaveBeenCalledTimes(1);
});
it('keeps a vertical stroke vertical through a horizontal-only momentum tail', async () => {
  const x = await gestureHarness();
  await x.send(2, 120);
  expect((await x.send(10)).defaultPrevented).toBe(false);
  expect(x.onSelect).not.toHaveBeenCalled();
});
it('accepts tiny vertical noise in a horizontal stroke, then gives a diagonal to vertical content', async () => {
  const x = await gestureHarness();
  expect((await x.send(40, 1)).defaultPrevented).toBe(true);
  expect(x.onSelect).toHaveBeenLastCalledWith(1, 1);
  expect((await x.send(30, 32)).defaultPrevented).toBe(false);
  expect(x.onSelect).toHaveBeenLastCalledWith(0, -1);
  expect((await x.send(40)).defaultPrevented).toBe(false);
  expect(x.onSelect).toHaveBeenCalledTimes(2);
});
it('accepts a fresh rising push after a sustained tail before the previous animation ends', async () => {
  const x = await gestureHarness();
  for (const delta of [200, 60, 30, 12, 5, 4, 2, 3, 9, 18]) await x.send(delta);
  expect(x.onSelect.mock.calls).toEqual([
    [1, 1],
    [2, 1],
  ]);
  expect(Number(x.viewport.dataset.tabPosition)).toBeLessThan(2);
});
it('keeps paging in either direction through long runs and circular boundaries', async () => {
  const x = await gestureHarness();
  const swipe = [3, 9, 18, 30, 38, 40, 36, 30, 22, 15, 9, 5, 2];
  for (let i = 0; i < 4; i++) for (const delta of swipe) await x.send(delta);
  expect(x.onSelect.mock.calls).toEqual([
    [1, 1],
    [2, 1],
    [3, 1],
    [0, 1],
  ]);
  for (let i = 0; i < 4; i++) for (const delta of swipe) await x.send(-delta);
  expect(x.onSelect.mock.calls.slice(4)).toEqual([
    [3, -1],
    [2, -1],
    [1, -1],
    [0, -1],
  ]);
});
it('does not turn a second page from a spike inside one swipe', async () => {
  const x = await gestureHarness();
  // A single swipe whose samples dip and then spike back up. The tail never decayed deeply, so this
  // is still one page: a fresh push needs the tail down at a quarter of the peak or less.
  for (const delta of [300, 150, 200, 400]) await x.send(delta);
  expect(x.onSelect.mock.calls).toEqual([[1, 1]]);
});
it('keeps a sideways swipe on the rail through its own cross-axis drift', async () => {
  const x = await gestureHarness();
  // A real trackpad swipe carries a few pixels of vertical drift per sample; only a real
  // diagonal may take the stroke over.
  const samples: [number, number][] = [
    [3, 1],
    [9, 2],
    [18, 3],
    [30, 5],
    [38, 4],
    [40, 6],
    [30, 3],
    [18, 2],
    [9, 1],
    [4, 1],
  ];
  for (const [deltaX, deltaY] of samples) {
    const event = await x.send(deltaX, deltaY);
    expect(event.defaultPrevented).toBe(true);
  }
  expect(x.onSelect.mock.calls).toEqual([[1, 1]]);
});
it('turns a page for every quick swipe instead of every other one', async () => {
  const x = await gestureHarness();
  // Four swipes in a row, each starting while the previous momentum tail is still strong, so the
  // input never goes quiet between them.
  const swipes = [
    [4, 10, 20, 32, 40],
    [5, 12, 22, 34, 42],
    [5, 12, 22, 34, 42],
    [5, 12, 22, 34, 42],
  ];
  for (const swipe of swipes) for (const delta of swipe) await x.send(delta);
  expect(x.onSelect.mock.calls).toEqual([
    [1, 1],
    [2, 1],
    [3, 1],
    [0, 1],
  ]);
});
it('keeps fast swipes with drift on the rail instead of locking them away', async () => {
  const x = await gestureHarness();
  // A fast swipe whose early samples carry a few pixels of drift, four times in a row. A stroke
  // that latches on the first sample leaves every one of these events to the content.
  const swipe: [number, number][] = [
    [9, 3],
    [21, 4],
    [33, 5],
    [45, 4],
    [30, 3],
    [16, 2],
    [8, 1],
  ];
  for (let index = 0; index < 4; index += 1)
    for (const [deltaX, deltaY] of swipe) await x.send(deltaX, deltaY);
  expect(x.onSelect.mock.calls).toEqual([
    [1, 1],
    [2, 1],
    [3, 1],
    [0, 1],
  ]);
});

it('keeps short quick flicks paging instead of swallowing all but the first', async () => {
  const x = await gestureHarness();
  // A quick flick leaves no room for the tail to decay twice, so the resumed push has to be read
  // from the tail it follows rather than from the previous sample.
  const flick: [number, number][] = [
    [30, 4],
    [80, 5],
    [120, 4],
    [88, 3],
  ];
  for (let index = 0; index < 6; index += 1)
    for (const [deltaX, deltaY] of flick) await x.send(deltaX, deltaY);
  expect(x.onSelect.mock.calls).toEqual([
    [1, 1],
    [2, 1],
    [3, 1],
    [0, 1],
    [1, 1],
    [2, 1],
  ]);
});

it('triggers on tiny directional input and bounds a long gesture with elastic return', async () => {
  vi.useFakeTimers();
  const onSelect = vi.fn();
  const tabs = [0, 1, 2, 3];
  const width = motionValue(400);
  const onProgress = vi.fn();
  function Harness() {
    const [[activeId, direction], setSelection] = useState([0, 0]);
    return createElement(TabPanels<number>, {
      tabs,
      activeId,
      direction,
      width,
      disabled: false,
      onSelect: (id, direction = 1) => {
        onSelect(id, direction);
        setSelection([id, direction]);
      },
      onProgress,
      renderTab: (id) => createElement('input', { id: `page-${id}` }),
    });
  }
  await act(async () => root.render(createElement(Harness)));
  const viewport = host.querySelector<HTMLElement>('[data-tab-viewport]')!;
  const originalPage = host.querySelector('#page-0');
  await act(async () => {
    viewport.dispatchEvent(new WheelEvent('wheel', { deltaX: 1, bubbles: true, cancelable: true }));
  });
  expect(onSelect).toHaveBeenLastCalledWith(1, 1);
  for (let index = 0; index < 20; index++) {
    await act(async () => {
      viewport.dispatchEvent(
        new WheelEvent('wheel', { deltaX: 100, bubbles: true, cancelable: true }),
      );
      await vi.advanceTimersByTimeAsync(50);
    });
  }
  expect(onSelect).toHaveBeenCalledTimes(1);
  expect(Number(viewport.dataset.tabElastic)).toBeGreaterThan(0);
  expect(Number(viewport.dataset.tabElastic)).toBeLessThanOrEqual(28);
  expect(host.querySelector('[data-tab-page="2"]')?.getAttribute('style')).toContain(
    'display: none',
  );
  await act(async () => vi.advanceTimersByTimeAsync(1000));
  expect(Math.abs(Number(viewport.dataset.tabElastic))).toBeLessThan(0.1);
  expect(host.querySelector('#page-0')).toBe(originalPage);
  expect(host.querySelectorAll('[data-tab-page]')).toHaveLength(4);
  expect(host.querySelector('[data-tab-page="1"]')?.getAttribute('aria-hidden')).toBe('false');
  expect(host.querySelector('[data-tab-page="0"]')?.hasAttribute('inert')).toBe(true);
  vi.useRealTimers();
});

it('wraps in the requested direction and reverses a transition without waiting', async () => {
  vi.useFakeTimers();
  const width = motionValue(400);
  const onSelect = vi.fn();
  function Harness() {
    const [[activeId, direction], setSelection] = useState([2, 0]);
    return createElement(TabPanels<number>, {
      tabs: [0, 1, 2],
      activeId,
      direction,
      width,
      disabled: false,
      onSelect: (id, direction = 1) => {
        onSelect(id, direction);
        setSelection([id, direction]);
      },
      onProgress: vi.fn(),
      renderTab: (id) => String(id),
    });
  }
  await act(async () => root.render(createElement(Harness)));
  const viewport = host.querySelector<HTMLElement>('[data-tab-viewport]')!;
  await act(async () =>
    viewport.dispatchEvent(new WheelEvent('wheel', { deltaX: 1, bubbles: true })),
  );
  expect(onSelect).toHaveBeenLastCalledWith(0, 1);
  await act(async () => vi.advanceTimersByTimeAsync(80));
  await act(async () =>
    viewport.dispatchEvent(new WheelEvent('wheel', { deltaX: -1, bubbles: true })),
  );
  expect(onSelect).toHaveBeenLastCalledWith(2, -1);
  await act(async () => vi.advanceTimersByTimeAsync(1000));
  expect(host.querySelector('[data-tab-page="2"]')?.getAttribute('aria-hidden')).toBe('false');
});

it('continues a returning rebound from its current position when fresh input arrives', async () => {
  vi.useFakeTimers();
  const width = motionValue(400);
  function Harness() {
    const [[activeId, direction], setSelection] = useState([0, 0]);
    return createElement(TabPanels<number>, {
      tabs: [0, 1, 2],
      activeId,
      direction,
      width,
      disabled: false,
      onSelect: (id, direction = 1) => setSelection([id, direction]),
      onProgress: vi.fn(),
      renderTab: (id) => String(id),
    });
  }
  await act(async () => root.render(createElement(Harness)));
  const viewport = host.querySelector<HTMLElement>('[data-tab-viewport]')!;
  await act(async () =>
    viewport.dispatchEvent(new WheelEvent('wheel', { deltaX: 4000, bubbles: true })),
  );
  await act(async () => vi.advanceTimersByTimeAsync(210));
  const before = Number(viewport.dataset.tabElastic);
  expect(before).toBeGreaterThan(1);
  await act(async () =>
    viewport.dispatchEvent(new WheelEvent('wheel', { deltaX: -1, bubbles: true })),
  );
  // New intent may reverse page selection immediately, but the elastic surface
  // must keep its existing position and velocity instead of teleporting to zero.
  expect(Number(viewport.dataset.tabElastic)).toBeCloseTo(before, 6);
  await act(async () => vi.advanceTimersByTimeAsync(16));
  expect(Number(viewport.dataset.tabElastic)).toBeGreaterThan(0);
  expect(Math.abs(Number(viewport.dataset.tabElastic) - before)).toBeLessThan(8);
  await act(async () => vi.advanceTimersByTimeAsync(1000));
  expect(Math.abs(Number(viewport.dataset.tabElastic))).toBeLessThan(0.1);
});

it('returns from the edge while a low-energy trackpad tail is still delivering events', async () => {
  vi.useFakeTimers();
  const onSelect = vi.fn();
  function Harness() {
    const [[activeId, direction], setSelection] = useState([0, 0]);
    return createElement(TabPanels<number>, {
      tabs: [0, 1, 2],
      activeId,
      direction,
      width: motionValue(400),
      disabled: false,
      onSelect: (id, direction = 1) => {
        onSelect(id);
        setSelection([id, direction]);
      },
      onProgress: vi.fn(),
      renderTab: (id) => String(id),
    });
  }
  await act(async () => root.render(createElement(Harness)));
  const viewport = host.querySelector<HTMLElement>('[data-tab-viewport]')!;
  await act(async () =>
    viewport.dispatchEvent(new WheelEvent('wheel', { deltaX: 4000, bubbles: true })),
  );
  for (let index = 0; index < 65; index++) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(16);
      viewport.dispatchEvent(new WheelEvent('wheel', { deltaX: 1, bubbles: true }));
    });
  }
  expect(onSelect).toHaveBeenCalledTimes(1);
  expect(Math.abs(Number(viewport.dataset.tabElastic))).toBeLessThan(0.1);
});

it('continues through the entering page when a fresh native gesture requests another neighbor', async () => {
  vi.useFakeTimers();
  const subscribe = vi.fn((_callback: (event: ScrollGestureStart) => void) => vi.fn());
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: { onScrollGestureStart: subscribe },
  });
  const width = motionValue(400);
  const onSelect = vi.fn();
  function Harness() {
    const [[activeId, direction], setSelection] = useState([0, 0]);
    return createElement(TabPanels<number>, {
      tabs: [0, 1, 2, 3],
      activeId,
      direction,
      width,
      disabled: false,
      onSelect: (id, direction = 1) => {
        onSelect(id);
        setSelection([id, direction]);
      },
      onProgress: vi.fn(),
      renderTab: (id) => String(id),
    });
  }
  await act(async () => root.render(createElement(Harness)));
  const viewport = host.querySelector<HTMLElement>('[data-tab-viewport]')!;
  await act(async () =>
    viewport.dispatchEvent(new WheelEvent('wheel', { deltaX: 1, bubbles: true })),
  );
  await act(async () => vi.advanceTimersByTimeAsync(100));
  const before = Number(viewport.dataset.tabPosition);
  expect(before).toBeGreaterThan(0);
  expect(before).toBeLessThan(1);
  const entering = host.querySelector('[data-tab-page="1"]')!;
  await act(async () => {
    subscribe.mock.calls[0][0]({ at: Date.now() });
    viewport.dispatchEvent(new WheelEvent('wheel', { deltaX: 1, bubbles: true }));
  });
  expect(onSelect).toHaveBeenLastCalledWith(2);
  expect(Number(viewport.dataset.tabPosition)).toBeCloseTo(before, 6);
  expect(host.querySelector('[data-tab-page="1"]')).toBe(entering);
  expect(entering.getAttribute('style')).toContain('display: flex');
  expect(host.querySelector('[data-tab-page="2"]')?.getAttribute('style')).toContain(
    'display: none',
  );
  await act(async () => vi.advanceTimersByTimeAsync(1000));
  expect(Number(viewport.dataset.tabPosition)).toBeCloseTo(2, 6);
  expect(host.querySelector('[data-tab-page="2"]')?.getAttribute('aria-hidden')).toBe('false');
});

it('does not advance twice when a native boundary arrives after the first reversed wheel tick', async () => {
  vi.useFakeTimers();
  const subscribe = vi.fn((_callback: (event: ScrollGestureStart) => void) => vi.fn());
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: { onScrollGestureStart: subscribe },
  });
  const width = motionValue(400);
  const onSelect = vi.fn();
  function Harness() {
    const [[activeId, direction], setSelection] = useState([0, 0]);
    return createElement(TabPanels<number>, {
      tabs: [0, 1, 2],
      activeId,
      direction,
      width,
      disabled: false,
      onSelect: (id, direction = 1) => {
        onSelect(id);
        setSelection([id, direction]);
      },
      onProgress: vi.fn(),
      renderTab: (id) => String(id),
    });
  }
  await act(async () => root.render(createElement(Harness)));
  const viewport = host.querySelector<HTMLElement>('[data-tab-viewport]')!;
  await act(async () =>
    viewport.dispatchEvent(new WheelEvent('wheel', { deltaX: 1, bubbles: true })),
  );
  await act(async () => vi.advanceTimersByTimeAsync(50));
  const boundary = Date.now();
  await act(async () =>
    viewport.dispatchEvent(new WheelEvent('wheel', { deltaX: -1, bubbles: true })),
  );
  await act(async () => subscribe.mock.calls[0][0]({ at: boundary }));
  await act(async () =>
    viewport.dispatchEvent(new WheelEvent('wheel', { deltaX: -1, bubbles: true })),
  );
  expect(onSelect.mock.calls.map(([id]) => id)).toEqual([1, 0]);
});

it('reverses a keyboard transition before completion without duplicating page nodes', async () => {
  vi.useFakeTimers();
  const tabs = [0, 1, 2];
  const onSelect = vi.fn();
  const onProgress = vi.fn();
  const width = motionValue(400);
  const render = (activeId: number, direction: number) =>
    root.render(
      createElement(TabPanels<number>, {
        tabs,
        activeId,
        direction,
        width,
        disabled: false,
        onSelect,
        onProgress,
        renderTab: (id) => createElement('input', { id: `page-${id}` }),
      }),
    );
  await act(async () => render(0, 0));
  const original = host.querySelector('#page-0');
  await act(async () => render(1, 1));
  await act(async () => vi.advanceTimersByTimeAsync(100));
  expect(
    onProgress.mock.calls.some(
      ([from, to, progress]) => from === 0 && to === 1 && progress > 0 && progress < 1,
    ),
  ).toBe(true);
  await act(async () => render(0, -1));
  await act(async () => vi.advanceTimersByTimeAsync(1000));
  expect(onProgress).toHaveBeenLastCalledWith(0, 0, 0, false);
  expect(host.querySelector('#page-0')).toBe(original);
  expect(host.querySelectorAll('#page-0')).toHaveLength(1);
  expect(host.querySelector('[data-tab-page="0"]')?.getAttribute('aria-hidden')).toBe('false');
});

it('keeps vertical wheel input native and routes horizontal input at nested scroll boundaries', async () => {
  const parentWheel = vi.fn();
  await act(async () =>
    root.render(
      createElement(
        'div',
        { onWheel: parentWheel },
        createElement(
          ElasticScrollArea,
          null,
          createElement('div', { id: 'nested', style: { overflowX: 'auto' } }, 'content'),
        ),
      ),
    ),
  );
  const nested = host.querySelector<HTMLElement>('#nested')!;
  Object.defineProperties(nested, {
    scrollWidth: { value: 500 },
    clientWidth: { value: 100 },
  });
  const vertical = new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true });
  nested.dispatchEvent(vertical);
  expect(vertical.defaultPrevented).toBe(false);
  expect(parentWheel).not.toHaveBeenCalled();
  const diagonal = new WheelEvent('wheel', {
    deltaX: 200,
    deltaY: 60,
    bubbles: true,
    cancelable: true,
  });
  nested.dispatchEvent(diagonal);
  expect(diagonal.defaultPrevented).toBe(false);
  expect(parentWheel).not.toHaveBeenCalled();
  nested.dispatchEvent(new WheelEvent('wheel', { deltaX: 100, bubbles: true }));
  expect(parentWheel).not.toHaveBeenCalled();
  nested.scrollLeft = 400;
  const horizontal = new WheelEvent('wheel', { deltaX: 100, bubbles: true, cancelable: true });
  nested.dispatchEvent(horizontal);
  expect(parentWheel).toHaveBeenCalledTimes(1);
  expect(horizontal.defaultPrevented).toBe(false);
  const viewport = nested.parentElement!.parentElement!;
  viewport.scrollTop = 50;
  await act(async () =>
    root.render(
      createElement(
        'div',
        { onWheel: parentWheel },
        createElement(ElasticScrollArea, null, createElement('div', { id: 'nested' }, 'updated')),
      ),
    ),
  );
  expect(host.querySelector('#nested')?.parentElement?.parentElement).toBe(viewport);
  expect(viewport.scrollTop).toBe(50);
});

it('prioritizes vertical input even when X is larger and ignores its horizontal tail', async () => {
  vi.useFakeTimers();
  const subscribe = vi.fn((_callback: (event: ScrollGestureStart) => void) => vi.fn());
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: { onScrollGestureStart: subscribe },
  });
  const onSelect = vi.fn();
  const width = motionValue(400);
  await act(async () =>
    root.render(
      createElement(TabPanels<number>, {
        tabs: [0, 1, 2],
        activeId: 0,
        direction: 0,
        width,
        disabled: false,
        onSelect,
        onProgress: vi.fn(),
        renderTab: (id) => String(id),
      }),
    ),
  );
  const viewport = host.querySelector<HTMLElement>('[data-tab-viewport]')!;
  const diagonal = new WheelEvent('wheel', {
    deltaX: 200,
    deltaY: 60,
    bubbles: true,
    cancelable: true,
  });
  await act(async () => viewport.dispatchEvent(diagonal));
  expect(diagonal.defaultPrevented).toBe(false);
  await act(async () => vi.advanceTimersByTimeAsync(30));
  await act(async () =>
    viewport.dispatchEvent(new WheelEvent('wheel', { deltaX: 80, deltaY: 0, bubbles: true })),
  );
  expect(onSelect).not.toHaveBeenCalled();
  await act(async () => vi.advanceTimersByTimeAsync(10));
  await act(async () => subscribe.mock.calls[0][0]({ at: Date.now() }));
  await act(async () =>
    viewport.dispatchEvent(new WheelEvent('wheel', { deltaX: 1, deltaY: 0, bubbles: true })),
  );
  expect(onSelect).toHaveBeenLastCalledWith(1, 1);
});
