// @vitest-environment happy-dom
import { act, createElement, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { motionValue } from 'motion/react';
import { TabPanels } from '../../../src/renderer/components/TabPanels';
import { ElasticScrollArea } from '../../../src/renderer/components/ElasticScrollArea';
import type { NativeScroll, ScrollGestureStart } from '../../../src/shared/contracts';

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.useFakeTimers();
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
async function harness(native = true) {
  const cleanup = vi.fn();
  const nativeSubscribe = vi.fn((_callback: (event: NativeScroll) => void) => cleanup);
  const begin = vi.fn((_callback: (event: ScrollGestureStart) => void) => cleanup);
  const end = vi.fn((_callback: (event: ScrollGestureStart) => void) => cleanup);
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: {
      getNativeScrollAvailable: async () => native,
      onNativeScroll: nativeSubscribe,
      onScrollGestureStart: begin,
      onScrollGestureEnd: end,
    },
  });
  const onSelect = vi.fn();
  const onProgress = vi.fn();
  const width = motionValue(400);
  const tabs = [0, 1, 2, 3];
  let disabled = false;
  function Harness() {
    const [[activeId, direction], setSelection] = useState([0, 0]);
    return createElement(TabPanels<number>, {
      tabs,
      activeId,
      direction,
      width,
      disabled,
      onSelect(id, dir = 1) {
        onSelect(id, dir);
        setSelection([id, dir]);
      },
      onProgress,
      renderTab: (id) =>
        createElement('input', {
          id: `draft-${id}`,
          defaultValue: `draft ${id}`,
        }),
    });
  }
  await act(async () => root.render(createElement(Harness)));
  const viewport = host.querySelector<HTMLElement>('[data-tab-viewport]')!;
  vi.spyOn(document, 'elementFromPoint').mockReturnValue(viewport);
  let at = 1000;
  const send = async (phase: NativeScroll['phase'], deltaX = 0, deltaY = 0, elapsed = 16) => {
    at += elapsed;
    await act(async () => {
      nativeSubscribe.mock.calls[0][0]({
        phase,
        deltaX,
        deltaY,
        at,
        x: 10,
        y: 10,
        control: false,
      });
      await vi.advanceTimersByTimeAsync(elapsed);
    });
  };
  const wheel = async (deltaX: number, deltaY = 0, deltaMode = 0, target: Element = viewport) => {
    const event = new WheelEvent('wheel', {
      deltaX,
      deltaY,
      deltaMode,
      bubbles: true,
      cancelable: true,
    });
    await act(async () => {
      target.dispatchEvent(event);
      await vi.advanceTimersByTimeAsync(16);
    });
    return event;
  };
  const boundary = async (phase: 'begin' | 'end', time = Date.now()) => {
    await act(async () => (phase === 'begin' ? begin : end).mock.calls[0][0]({ at: time }));
  };
  const idle = async (ms = 500) => {
    at += ms;
    await act(async () => vi.advanceTimersByTimeAsync(ms));
  };
  const disable = async () => {
    disabled = true;
    await act(async () => root.render(createElement(Harness)));
  };
  return {
    viewport,
    onSelect,
    onProgress,
    send,
    wheel,
    boundary,
    idle,
    disable,
    cleanup,
    width,
  };
}
it('moves with the finger, returns a short swipe, and commits only on release', async () => {
  const h = await harness();
  await h.send('begin');
  await h.send('update', 20);
  expect(Number(h.viewport.dataset.tabPosition)).toBeCloseTo(0.05);
  expect(h.onSelect).not.toHaveBeenCalled();
  await h.send('end');
  await h.idle();
  expect(Number(h.viewport.dataset.tabPosition)).toBeCloseTo(0);
  await h.send('begin');
  await h.send('update', 240, 3);
  expect(Number(h.viewport.dataset.tabPosition)).toBeCloseTo(0.6);
  expect(h.onSelect).not.toHaveBeenCalled();
  await h.send('end');
  await h.idle();
  expect(h.onSelect.mock.calls).toEqual([[1, 1]]);
  expect(Number(h.viewport.dataset.tabPosition)).toBeCloseTo(1);
});
it('accepts every rapid native stroke in both directions while consuming all inertia', async () => {
  const h = await harness();
  const original = host.querySelector('#draft-0');
  for (const sign of [1, 1, 1, 1, -1, -1, -1, -1]) {
    await h.send('begin');
    await h.send('update', sign * 120, 3);
    await h.send('update', sign * 120, 3);
    await h.send('end');
    for (const x of [300, 150, 200, 400, -1]) await h.send('momentum', x * sign, 0, 1);
  }
  expect(h.onSelect.mock.calls.map(([id]) => id)).toEqual([1, 2, 3, 0, 3, 2, 1, 0]);
  await h.idle();
  expect(Number(h.viewport.dataset.tabPosition)).toBeCloseTo(0);
  expect(host.querySelector('#draft-0')).toBe(original);
});
it('limits a long stroke to one page and never double-counts the DOM copy', async () => {
  const h = await harness();
  await h.send('begin');
  for (const x of [300, 150, 200, 400, 3000]) {
    await h.send('update', x);
    await h.wheel(x);
  }
  expect(Number(h.viewport.dataset.tabPosition)).toBeLessThanOrEqual(1);
  expect(h.onSelect).not.toHaveBeenCalled();
  await h.send('end');
  await h.send('end');
  await h.idle();
  expect(h.onSelect.mock.calls).toEqual([[1, 1]]);
});
it('locks vertical strokes, preserves horizontal drift, and supports deliberate reversal', async () => {
  const h = await harness();
  await h.send('begin');
  await h.send('update', 2, 80);
  await h.send('update', 500);
  await h.send('end');
  expect(h.onSelect).not.toHaveBeenCalled();
  await h.send('begin');
  await h.send('update', 80, 4);
  await h.send('update', 160, 80);
  await h.send('end');
  expect(h.onSelect.mock.calls).toEqual([[1, 1]]);
  await h.idle();
  await h.send('begin');
  await h.send('update', 200);
  await h.send('update', -100);
  await h.send('update', -80);
  await h.send('end');
  await h.idle();
  expect(h.onSelect.mock.calls).toEqual([
    [1, 1],
    [0, -1],
  ]);
  expect(Number(h.viewport.dataset.tabPosition)).toBeCloseTo(0);
});
it('cancels on blur or disable and ignores remaining events until another begin', async () => {
  const h = await harness();
  await h.send('begin');
  await h.send('update', 240);
  await act(async () => window.dispatchEvent(new Event('blur')));
  await h.send('update', 200);
  await h.send('end');
  await h.idle();
  expect(h.onSelect).not.toHaveBeenCalled();
  expect(Number(h.viewport.dataset.tabPosition)).toBeCloseTo(0);
  await h.send('begin');
  await h.send('update', 240);
  await h.disable();
  await h.send('end');
  await h.idle();
  expect(h.onSelect).not.toHaveBeenCalled();
});
it('preserves nested horizontal scrolling for the whole native stroke', async () => {
  const h = await harness();
  const nested = document.createElement('div');
  nested.style.overflowX = 'auto';
  h.viewport.append(nested);
  Object.defineProperties(nested, {
    scrollWidth: { value: 500 },
    clientWidth: { value: 100 },
  });
  vi.mocked(document.elementFromPoint).mockReturnValue(nested);
  await h.send('begin', 10);
  nested.scrollLeft = 400;
  await h.send('update', 300);
  await h.send('end');
  expect(h.onSelect).not.toHaveBeenCalled();
});
it('retains fractional positions during interruption and freezes the input width', async () => {
  const h = await harness();
  await h.send('begin');
  await h.send('update', 240);
  await h.send('end');
  await h.send('begin');
  const before = Number(h.viewport.dataset.tabPosition);
  h.width.set(800);
  await h.send('update', 40);
  expect(Number(h.viewport.dataset.tabPosition)).toBeCloseTo(before + 0.1);
  await h.send('cancel');
  await h.idle();
  expect(h.onSelect).toHaveBeenCalledTimes(1);
  expect(Number(h.viewport.dataset.tabPosition)).toBeCloseTo(1);
});
it('handles Windows/Linux phase boundaries and fresh repeated gestures without waiting for silence', async () => {
  const h = await harness(false);
  for (let index = 0; index < 4; index++) {
    await h.boundary('begin');
    await h.wheel(80);
    await h.wheel(80);
    await h.boundary('end');
    await h.wheel(200);
    await h.wheel(100);
  }
  expect(h.onSelect.mock.calls.map(([id]) => id)).toEqual([1, 2, 3, 0]);
});
it('normalizes mouse line/page deltas and gives vertical and pinch input back to the browser', async () => {
  const h = await harness(false);
  expect((await h.wheel(0, 120)).defaultPrevented).toBe(false);
  await h.wheel(200);
  await h.idle();
  expect(h.onSelect).not.toHaveBeenCalled();
  await h.wheel(6, 0, 1);
  await h.idle();
  expect(h.onSelect.mock.calls).toEqual([[1, 1]]);
  await h.wheel(-1, 0, 2);
  await h.idle();
  expect(h.onSelect.mock.calls).toEqual([
    [1, 1],
    [0, -1],
  ]);
  const pinch = new WheelEvent('wheel', {
    deltaX: 300,
    ctrlKey: true,
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(pinch, 'ctrlKey', { value: true });
  await act(async () => h.viewport.dispatchEvent(pinch));
  await h.idle();
  expect(pinch.defaultPrevented).toBe(false);
  expect(h.onSelect).toHaveBeenCalledTimes(2);
});
it('keeps tiny fallback movements below the threshold and counts an unphased burst once', async () => {
  const h = await harness(false);
  for (const x of [1, 2, 3, 2]) await h.wheel(x);
  await h.idle();
  expect(h.onSelect).not.toHaveBeenCalled();
  for (const x of [80, 100, 200, 400, 200]) await h.wheel(x);
  await h.idle();
  expect(h.onSelect.mock.calls).toEqual([[1, 1]]);
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
  const vertical = new WheelEvent('wheel', {
    deltaY: 120,
    bubbles: true,
    cancelable: true,
  });
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
  const horizontal = new WheelEvent('wheel', {
    deltaX: 100,
    bubbles: true,
    cancelable: true,
  });
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

it('handles late generic boundaries without selecting twice from the same samples', async () => {
  const h = await harness(false);
  const beginAt = Date.now();
  await h.wheel(80);
  await h.boundary('begin', beginAt);
  await h.wheel(80);
  const endAt = Date.now();
  await h.wheel(600);
  await h.boundary('end', endAt);
  await h.boundary('end', endAt);
  await h.idle();
  expect(h.onSelect.mock.calls).toEqual([[1, 1]]);
});
it('cleans every input subscription and timer on unmount', async () => {
  const h = await harness(false);
  await h.wheel(60);
  await act(async () => root.unmount());
  expect(h.cleanup).toHaveBeenCalledTimes(3);
  await act(async () => vi.advanceTimersByTimeAsync(1000));
  expect(h.onSelect).not.toHaveBeenCalled();
  root = createRoot(host);
});
it('reverses keyboard navigation without replacing draft nodes or leaving geometry moving', async () => {
  const width = motionValue(400);
  const onProgress = vi.fn();
  const tabs = [0, 1, 2];
  const render = (activeId: number, direction: number) =>
    root.render(
      createElement(TabPanels<number>, {
        tabs,
        activeId,
        direction,
        width,
        disabled: false,
        onSelect: vi.fn(),
        onProgress,
        renderTab: (id) =>
          createElement('input', {
            id: `keyboard-${id}`,
            defaultValue: 'draft',
          }),
      }),
    );
  await act(async () => render(0, 0));
  const node = host.querySelector('#keyboard-0');
  await act(async () => render(1, 1));
  await act(async () => vi.advanceTimersByTimeAsync(80));
  await act(async () => render(0, -1));
  await act(async () => vi.advanceTimersByTimeAsync(600));
  expect(onProgress).toHaveBeenLastCalledWith(0, 0, 0, false);
  expect(host.querySelector('#keyboard-0')).toBe(node);
  expect(host.querySelectorAll('#keyboard-0')).toHaveLength(1);
});

it('waits for direction before routing a zero-delta native begin at a nested scroll edge', async () => {
  const h = await harness();
  const nested = document.createElement('div');
  nested.style.overflowX = 'auto';
  h.viewport.append(nested);
  Object.defineProperties(nested, {
    scrollWidth: { value: 500 },
    clientWidth: { value: 100 },
  });
  vi.mocked(document.elementFromPoint).mockReturnValue(nested);
  await h.send('begin');
  await h.send('update', -240);
  await h.send('end');
  await h.idle();
  expect(h.onSelect.mock.calls).toEqual([[3, -1]]);
});
it('honors reduced motion without removing the release threshold', async () => {
  vi.spyOn(window, 'matchMedia').mockReturnValue({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as unknown as MediaQueryList);
  const h = await harness();
  await h.send('begin');
  await h.send('update', 20);
  await h.send('end');
  expect(h.onSelect).not.toHaveBeenCalled();
  await h.send('begin');
  await h.send('update', 240);
  expect(Number(h.viewport.dataset.tabPosition)).toBe(0);
  await h.send('end');
  expect(Number(h.viewport.dataset.tabPosition)).toBe(1);
  expect(h.onProgress).toHaveBeenLastCalledWith(1, 1, 0, false);
});

it('keeps a phased finger contact alive through pauses and repeated reversals', async () => {
  for (const native of [true, false]) {
    const h = await harness(native);
    const move = (x: number) => (native ? h.send('update', x) : h.wheel(x));
    if (native) await h.send('begin');
    else await h.boundary('begin');
    for (let cycle = 0; cycle < 5; cycle++) {
      await move(180);
      await h.idle(1200);
      expect(h.onSelect).not.toHaveBeenCalled();
      expect(Number(h.viewport.dataset.tabPosition)).toBeCloseTo(0.45);
      await move(-180);
      await h.idle(800);
      expect(h.onSelect).not.toHaveBeenCalled();
      expect(Number(h.viewport.dataset.tabPosition)).toBeCloseTo(0);
    }
    await move(240);
    if (native) await h.send('end');
    else await h.boundary('end');
    await h.idle();
    expect(h.onSelect.mock.calls).toEqual([[1, 1]]);
    await act(async () => root.unmount());
    root = createRoot(host);
  }
});
it('does not split an active native contact on an unphased packet or duplicate begin', async () => {
  const h = await harness();
  await h.send('begin');
  await h.send('update', 180);
  await h.send('wheel', -40);
  await h.idle(1000);
  expect(h.onSelect).not.toHaveBeenCalled();
  await h.send('begin');
  await h.send('update', -140);
  expect(Number(h.viewport.dataset.tabPosition)).toBeCloseTo(0);
  await h.send('end');
  await h.idle();
  expect(h.onSelect).not.toHaveBeenCalled();
});
it('keeps a late Chromium begin authoritative throughout a long stationary contact', async () => {
  const h = await harness(false);
  const at = Date.now();
  await h.wheel(160);
  await h.boundary('begin', at);
  await h.idle(1500);
  expect(h.onSelect).not.toHaveBeenCalled();
  await h.wheel(-160);
  await h.boundary('end');
  await h.idle();
  expect(h.onSelect).not.toHaveBeenCalled();
});

it('does not restart a released phased stream from a delayed inertia tail', async () => {
  const h = await harness(false);
  await h.boundary('begin');
  await h.wheel(120);
  await h.wheel(120);
  await h.boundary('end');
  for (let repeat = 0; repeat < 5; repeat++) {
    await h.idle(700);
    await h.wheel(repeat % 2 ? -400 : 400);
  }
  expect(h.onSelect.mock.calls).toEqual([[1, 1]]);
  await h.wheel(-6, 0, 1);
  await h.idle();
  expect(h.onSelect.mock.calls).toEqual([
    [1, 1],
    [0, -1],
  ]);
});
it('never lets repeated native excursions change the anchor before lift-off', async () => {
  const h = await harness();
  await h.send('begin');
  for (let repeat = 0; repeat < 4; repeat++) {
    for (const [delta, expected] of [
      [900, 1],
      [-900, 0],
      [-900, -1],
      [900, 0],
    ]) {
      await h.send('update', delta);
      await h.idle(500);
      expect(Number(h.viewport.dataset.tabPosition)).toBeCloseTo(expected);
      expect(h.onSelect).not.toHaveBeenCalled();
    }
  }
  await h.send('end');
  await h.idle();
  expect(h.onSelect).not.toHaveBeenCalled();
  expect(Number(h.viewport.dataset.tabPosition)).toBeCloseTo(0);
});

it('can drag right and flick left, or drag left and flick right, within one contact', async () => {
  const h = await harness();
  for (const direction of [1, -1]) {
    const anchor = Number(h.viewport.dataset.tabPosition);
    await h.send('begin');
    await h.send('update', direction * 260);
    await h.idle(600);
    await h.send('update', -direction * 60);
    await h.send('update', -direction * 80);
    expect(Number(h.viewport.dataset.tabPosition)).toBeCloseTo(anchor + direction * 0.3);
    await h.send('end');
    await h.idle();
    expect(Number(h.viewport.dataset.tabPosition)).toBeCloseTo(anchor - direction);
  }
  expect(h.onSelect.mock.calls).toEqual([
    [3, -1],
    [0, 1],
  ]);
});

it('keeps a diagonal stroke owned by vertical content through pauses and sideways reversals', async () => {
  for (const native of [true, false]) {
    const h = await harness(native);
    const content = document.createElement('div');
    content.style.overflowY = 'auto';
    Object.defineProperties(content, {
      scrollHeight: { value: 900 },
      clientHeight: { value: 200 },
    });
    h.viewport.append(content);
    vi.mocked(document.elementFromPoint).mockReturnValue(content);
    // A descendant may stop bubbling; the page must still observe initial vertical ownership.
    content.addEventListener('wheel', (event) => event.stopPropagation());
    if (native) await h.send('begin');
    else await h.boundary('begin');
    const move = async (x: number, y: number) => {
      if (native) await h.send('update', x, y);
      return h.wheel(x, y, 0, content);
    };
    expect((await move(40, 20)).defaultPrevented).toBe(false);
    content.scrollTop = 700;
    for (let turn = 0; turn < 4; turn++) {
      await h.idle(500);
      expect((await move(turn % 2 ? -400 : 400, 0)).defaultPrevented).toBe(false);
      expect(h.onSelect).not.toHaveBeenCalled();
      expect(Number(h.viewport.dataset.tabPosition)).toBe(0);
    }
    if (native) await h.send('end');
    else await h.boundary('end');
    await h.idle();
    expect(h.onSelect).not.toHaveBeenCalled();
    await act(async () => root.unmount());
    root = createRoot(host);
  }
});
it('blocks vertical default scrolling and child handlers once a page gesture owns horizontal input', async () => {
  for (const native of [true, false]) {
    const h = await harness(native);
    const content = document.createElement('div');
    content.style.overflowY = 'auto';
    Object.defineProperties(content, {
      scrollHeight: { value: 900 },
      clientHeight: { value: 200 },
    });
    h.viewport.append(content);
    vi.mocked(document.elementFromPoint).mockReturnValue(content);
    const childWheel = vi.fn();
    content.addEventListener('wheel', childWheel);
    if (native) await h.send('begin');
    else await h.boundary('begin');
    for (const [x, y] of [
      [80, 2],
      [10, 120],
      [-20, -200],
      [150, 90],
    ]) {
      if (native) await h.send('update', x, y);
      expect((await h.wheel(x, y, 0, content)).defaultPrevented).toBe(true);
    }
    expect(childWheel).not.toHaveBeenCalled();
    expect(h.onSelect).not.toHaveBeenCalled();
    if (native) await h.send('end');
    else await h.boundary('end');
    await h.idle();
    expect(h.onSelect.mock.calls.length).toBeLessThanOrEqual(1);
    await act(async () => root.unmount());
    root = createRoot(host);
  }
});

it('keeps native ownership when DOM events arrive first or the child under the pointer changes', async () => {
  const h = await harness();
  const content = document.createElement('div');
  content.style.overflowY = 'auto';
  Object.defineProperties(content, { scrollHeight: { value: 900 }, clientHeight: { value: 200 } });
  h.viewport.append(content);
  vi.mocked(document.elementFromPoint).mockReturnValue(content);
  await h.send('begin');
  expect((await h.wheel(40, 20, 0, content)).defaultPrevented).toBe(false);
  await h.send('update', 40, 20);
  await h.wheel(400, 0, 0, content);
  await h.send('update', 400, 0);
  await h.send('end');
  expect(h.onSelect).not.toHaveBeenCalled();
  await h.send('begin');
  expect((await h.wheel(80, 2, 0, content)).defaultPrevented).toBe(true);
  await h.send('update', 80, 2);
  content.style.overflowX = 'auto';
  Object.defineProperties(content, { scrollWidth: { value: 900 }, clientWidth: { value: 200 } });
  expect((await h.wheel(10, 120, 0, content)).defaultPrevented).toBe(true);
  await h.send('update', 10, 120);
  await h.idle(200);
  await h.send('end');
  await h.idle();
  expect(h.onSelect).not.toHaveBeenCalled();
});
