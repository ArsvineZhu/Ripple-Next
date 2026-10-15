// @vitest-environment happy-dom
import { Activity, act, createElement, type ComponentProps } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MediaMarquee } from '../../../src/renderer/components/MediaMarquee';
import { MediaTransition } from '../../../src/renderer/components/MediaTransition';
import { QuickView } from '../../../src/renderer/components/QuickView';
import { compactMediaWidth } from '../../../src/renderer/lib/compactMediaLayout';
import { defaultMusicPreferences } from '../../../src/shared/musicPreferences';
import type { MediaSession } from '../../../src/shared/media';
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));
vi.mock('../../../src/renderer/hooks/useReducedMotionPreference', () => ({
  useReducedMotionPreference: () => false,
}));
vi.mock('motion/react', async (original) => ({
  ...(await original<typeof import('motion/react')>()),
  motion: {
    div: ({
      children,
      className,
      style,
    }: {
      children?: import('react').ReactNode;
      className?: string;
      style?: import('react').CSSProperties;
    }) => createElement('div', { className, style }, children),
  },
  AnimatePresence: ({ children }: { children?: import('react').ReactNode }) => children,
  useReducedMotion: () => true,
}));
let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
let observers: { callback: () => void; disconnect: ReturnType<typeof vi.fn> }[];
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  observers = [];
  vi.stubGlobal(
    'ResizeObserver',
    class {
      disconnect = vi.fn();
      constructor(callback: () => void) {
        observers.push({ callback, disconnect: this.disconnect });
      }
      observe() {}
    },
  );
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(120);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    return { width: (this.textContent?.length ?? 0) * 10, height: 20 } as DOMRect;
  });
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it('remeasures and resumes long text after Activity hide/show and preference changes', async () => {
  const render = (visible: boolean, enabled = true) =>
    act(async () =>
      root.render(
        <Activity mode={visible ? 'visible' : 'hidden'}>
          <MediaMarquee enabled={enabled}>A very long track title</MediaMarquee>
        </Activity>,
      ),
    );
  await render(true);
  expect(host.querySelector('[data-marquee="true"]')).not.toBeNull();
  await render(false);
  expect(observers.every((observer) => observer.disconnect.mock.calls.length)).toBe(true);
  await render(true);
  expect(host.querySelector('[data-marquee="true"]')).not.toBeNull();
  await render(true, false);
  expect(host.querySelector('[data-marquee="true"]')).toBeNull();
  await render(true);
  expect(host.querySelector('[data-marquee="true"]')).not.toBeNull();
});
it('never retains an outgoing media layer after rapid changes or hidden updates', async () => {
  const render = (identity: string, visible = true) =>
    act(async () =>
      root.render(
        <Activity mode={visible ? 'visible' : 'hidden'}>
          <MediaTransition identity={identity}>{identity}</MediaTransition>
        </Activity>,
      ),
    );
  for (const title of ['A', 'B', 'A', 'C']) await render(title);
  expect(host.querySelectorAll('[data-media-layer]')).toHaveLength(1);
  await render('D', false);
  await render('E', false);
  await render('E');
  expect(host.querySelectorAll('[data-media-layer]')).toHaveLength(1);
  expect(host.textContent).toBe('E');
});
it('shows artist and playback controls only in quick view when idle artist is disabled', async () => {
  const session: MediaSession = {
    id: 'fixture',
    source: 'fixture',
    playerName: 'Fixture',
    name: 'Title',
    artist: 'Artist',
    state: 'playing',
    capabilities: { previous: true, next: true, play: true, pause: true, toggle: false },
  };
  const props: ComponentProps<typeof QuickView> = {
    mode: 'still',
    music: { ...defaultMusicPreferences, idleArtist: false },
    showInfoWhenIdleEnabled: true,
    isPlaying: true,
    showPausedQuickView: false,
    alert: false,
    chargingAlert: false,
    bluetoothAlert: false,
    cameraAlert: false,
    microphoneAlert: false,
    mediaTrack: session,
    mediaSnapshot: {
      sessions: [session],
      activeSessionId: session.id,
      manualSessionId: null,
      status: 'ready',
      error: null,
    },
    mediaActionError: null,
    mediaBusy: false,
    controlMedia: vi.fn(),
    openMediaSession: vi.fn(),
    trackTitle: 'Title',
    trackArtist: 'Artist',
    hideNotActiveIslandEnabled: false,
    textColor: '#fff',
    time: '12:00',
    percent: 80,
    standbyBorderEnabled: false,
    weather: null,
  };
  await act(async () => root.render(createElement(QuickView, props)));
  expect(host.textContent).not.toContain('Artist');
  expect(host.querySelector('[data-media-command]')).toBeNull();
  await act(async () => root.render(createElement(QuickView, { ...props, mode: 'quick' })));
  expect(host.textContent).toContain('Artist');
  expect(host.querySelector('[data-media-command="playpause"]')).not.toBeNull();
  expect(compactMediaWidth(50, true)).toBeGreaterThan(compactMediaWidth(50, false));
  expect(compactMediaWidth(1000, true)).toBe(337);
  expect(compactMediaWidth(1000, false)).toBe(300);
});
