/** @vitest-environment happy-dom */
import { act, createElement, useState, useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { motionValue } from 'motion/react';
import { MediaSessionCarousel } from '../src/renderer/components/MediaSessionCarousel';
import { MediaArtwork } from '../src/renderer/components/MediaArtwork';
import { TabPanels } from '../src/renderer/components/TabPanels';
import { NowPlayingTab } from '../src/renderer/features/NowPlayingTab';
import type { ScrollGestureStart } from '../src/shared/contracts';
import type { MediaSession, MediaSnapshot } from '../src/shared/media';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../src/renderer/lib/text', () => ({
  measureTextWidth: (text: string) => text.length * 9,
}));
vi.mock('motion/react', async (original) => ({
  ...(await original<typeof import('motion/react')>()),
  useReducedMotion: () => true,
}));
let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
let boundaries: ((event: ScrollGestureStart) => void)[];
const session = (id: string): MediaSession => ({
  id,
  source: id,
  playerName: 'Player ' + id,
  name: 'Same song',
  artist: 'Artist',
  artworkUrl: 'https://example.com/' + id + '.png',
  state: 'playing',
  capabilities: { previous: true, next: true, play: true, pause: true, toggle: true },
});
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.useFakeTimers();
  boundaries = [];
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: {
      onScrollGestureStart: (callback: (event: ScrollGestureStart) => void) => {
        boundaries.push(callback);
        return () => {
          boundaries = boundaries.filter((item) => item !== callback);
        };
      },
    },
  });
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  Reflect.deleteProperty(window, 'electronAPI');
});
async function carousel(initial: string | null = null, nested = false) {
  const onSelect = vi.fn();
  const onTab = vi.fn();
  let setSessions!: (items: MediaSession[]) => void;
  function Harness() {
    const [selected, setSelected] = useState(initial);
    const [sessions, updateSessions] = useState([session('one'), session('two')]);
    const [[tab, direction], setTab] = useState([3, 0]);
    useLayoutEffect(() => {
      setSessions = updateSessions;
    }, []);
    const card = createElement(MediaSessionCarousel, {
      sessions,
      selectedId: selected,
      textColor: '#fff',
      onSelect: (id) => {
        onSelect(id);
        setSelected(id);
      },
      renderPage: (item) =>
        createElement('button', { 'data-session': item?.id ?? 'auto' }, item?.playerName ?? 'auto'),
    });
    return nested
      ? createElement(TabPanels<number>, {
          tabs: [0, 3],
          activeId: tab,
          direction,
          width: motionValue(330),
          disabled: false,
          onSelect: (id, dir = 1) => {
            onTab(id);
            setTab([id, dir]);
          },
          onProgress: vi.fn(),
          renderTab: (id) => (id === 3 ? card : 'overview'),
        })
      : card;
  }
  await act(async () => root.render(createElement(Harness)));
  const viewport = host.querySelector<HTMLElement>('[data-media-carousel]')!;
  const wheel = async (y: number, x = 0, elapsed = 16) => {
    const event = new WheelEvent('wheel', {
      deltaX: x,
      deltaY: y,
      bubbles: true,
      cancelable: true,
    });
    await act(async () => {
      viewport.dispatchEvent(event);
      await vi.advanceTimersByTimeAsync(elapsed);
    });
    return event;
  };
  const key = async (key: string, target: HTMLElement = viewport) =>
    act(async () => {
      target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    });
  return { onSelect, onTab, viewport, wheel, key, setSessions };
}
it('provides A and player dots, keyboard selection, stable ordering and finite boundaries', async () => {
  const x = await carousel();
  expect(host.querySelectorAll('[role="radio"]')).toHaveLength(3);
  expect(host.querySelector('[data-media-indicator="0"]')?.textContent).toBe('A');
  await x.key('ArrowDown');
  expect(x.onSelect).toHaveBeenLastCalledWith('one');
  const page = host.querySelector('[data-session="one"]')!;
  expect(page.parentElement?.hasAttribute('inert')).toBe(false);
  expect(host.querySelector('[data-session="auto"]')?.parentElement?.hasAttribute('inert')).toBe(
    true,
  );
  await act(async () =>
    x.setSessions([session('two'), { ...session('one'), name: 'Changed song' }, session('three')]),
  );
  expect(
    Array.from(host.querySelectorAll('[role="radio"]')).map((item) =>
      item.getAttribute('aria-label'),
    ),
  ).toEqual(['mediaAutomatic', 'Player one', 'Player two', 'Player three']);
  expect(host.querySelector('[data-session="one"]')).toBe(page);
  await x.key('End');
  expect(x.onSelect).toHaveBeenLastCalledWith('three');
  const count = x.onSelect.mock.calls.length;
  await x.key('ArrowDown');
  expect(x.onSelect).toHaveBeenCalledTimes(count);
  await x.key('Home');
  expect(x.onSelect).toHaveBeenLastCalledWith(null);
  await x.key('ArrowDown', host.querySelector<HTMLElement>('[data-media-indicator="0"]')!);
  expect(document.activeElement).toBe(host.querySelector('[data-media-indicator="1"]'));
  await act(async () =>
    host.querySelector<HTMLButtonElement>('[data-media-indicator="0"]')!.click(),
  );
  expect(x.onSelect).toHaveBeenLastCalledWith(null);
});
it('limits a wheel stroke including fluctuations and horizontal tail to one player; accepts fresh boundaries and gaps', async () => {
  const x = await carousel(null, true);
  for (const y of [100, 40, 60, 30, 15, 5]) await x.wheel(y, 2);
  expect(x.onSelect.mock.calls).toEqual([['one']]);
  expect(x.onTab).not.toHaveBeenCalled();
  await x.wheel(0, 30);
  expect(x.onTab).not.toHaveBeenCalled();
  await act(async () => boundaries.forEach((callback) => callback({ at: Date.now() })));
  await x.wheel(80);
  expect(x.onSelect).toHaveBeenLastCalledWith('two');
  await act(async () => vi.advanceTimersByTimeAsync(151));
  await x.wheel(-80);
  expect(x.onSelect).toHaveBeenLastCalledWith('one');
  await act(async () => vi.advanceTimersByTimeAsync(151));
  const count = x.onSelect.mock.calls.length;
  await x.wheel(0, 30);
  expect(x.onTab).toHaveBeenCalledWith(0);
  expect(x.onSelect).toHaveBeenCalledTimes(count);
});
it('recognizes a fresh rising vertical push after a decayed tail without paging from a spike', async () => {
  const x = await carousel();
  for (const y of [300, 150, 200, 400]) await x.wheel(y);
  expect(x.onSelect.mock.calls).toEqual([['one']]);
  for (const y of [80, 20, 5, 2, 3, 9, 18]) await x.wheel(y);
  expect(x.onSelect.mock.calls).toEqual([['one'], ['two']]);
});
it('hides indicators for one automatic player but retains A for a manual player, and removes vanished sessions', async () => {
  const x = await carousel('one');
  await act(async () => x.setSessions([session('one')]));
  expect(host.querySelectorAll('[role="radio"]')).toHaveLength(2);
  await x.key('Home');
  expect(host.querySelector('[role="radiogroup"]')).toBeNull();
  await act(async () => x.setSessions([]));
  expect(host.querySelectorAll('[data-session="one"]')).toHaveLength(0);
  expect(host.querySelector('[role="radiogroup"]')).toBeNull();
});
it('falls back on decoding error and retries when the source or session changes, including reused URLs', async () => {
  const open = vi.fn();
  const render = async (item: MediaSession, compact = false) =>
    act(async () =>
      root.render(
        createElement(MediaArtwork, {
          session: item,
          compact,
          disabled: false,
          textColor: '#fff',
          onOpen: open,
        }),
      ),
    );
  await render(session('one'));
  const oldImage = host.querySelector('img')!;
  await act(async () => oldImage.dispatchEvent(new Event('error')));
  expect(host.querySelector('img')).toBeNull();
  expect(host.querySelector('svg')).not.toBeNull();
  await render({ ...session('one'), artworkUrl: 'new.png' });
  expect(host.querySelector('img')?.getAttribute('src')).toBe('new.png');
  await render({ ...session('two'), artworkUrl: 'new.png' }, true);
  expect(host.querySelector('img')).not.toBeNull();
  await act(async () => host.querySelector('img')!.dispatchEvent(new Event('error')));
  expect(host.querySelector('img')).toBeNull();
  await render(session('one'), true);
  expect(host.querySelector('img')).not.toBeNull();
  await act(async () => host.querySelector('button')!.click());
  expect(open).toHaveBeenCalledWith('one');
});
it('binds controls to the displayed session even for identical titles and disables them while selection is pending', async () => {
  const one = session('one'),
    two = session('two');
  const snapshot: MediaSnapshot = {
    sessions: [one, two],
    activeSessionId: 'one',
    manualSessionId: 'one',
    status: 'ready',
    error: null,
  };
  const control = vi.fn();
  const render = async (id: string, busy = false) =>
    act(async () =>
      root.render(
        createElement(NowPlayingTab, {
          mediaTrack: id === 'one' ? one : two,
          mediaSnapshot: { ...snapshot, activeSessionId: id, manualSessionId: id },
          mediaPageId: id,
          mediaBusy: busy,
          mediaActionError: null,
          textColor: '#fff',
          controlMedia: control,
          selectMediaSession: vi.fn(),
          openMediaSession: vi.fn(),
        }),
      ),
    );
  await render('one');
  await render('two');
  const button = host.querySelector<HTMLButtonElement>(
    '[aria-hidden="false"] [data-media-session="two"] [data-media-command="playpause"]',
  )!;
  await act(async () => button.click());
  expect(control).toHaveBeenCalledWith('playpause', 'two');
  await render('two', true);
  expect(button.disabled).toBe(true);
});
