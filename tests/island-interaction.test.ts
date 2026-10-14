import { useNavigation } from '../src/renderer/hooks/useNavigation';
// @vitest-environment happy-dom
import { act, createElement, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/renderer/i18n', () => ({ changeLanguagePreference: vi.fn() }));
import { OverlayProvider, useOverlay } from '../src/renderer/components/OverlayProvider';
import { useIslandInteraction } from '../src/renderer/hooks/useIslandInteraction';
import { AppStateProvider } from '../src/renderer/components/AppStateProvider';
import { NotificationProvider } from '../src/renderer/components/NotificationProvider';
import { defaultAppState } from '../src/shared/appState';
let root: Root;
let host: HTMLDivElement;
let interaction: ReturnType<typeof useIslandInteraction>;
let overlay: ReturnType<typeof useOverlay>;
const setMode = vi.fn();
const ignoreMouse = vi.fn(async () => {});
function Harness() {
  const currentInteraction = useIslandInteraction({
    setMode,
    standby: false,
    largeStandby: false,
    leaveDelayMs: 400,
  });
  const currentOverlay = useOverlay();
  useEffect(() => {
    interaction = currentInteraction;
    overlay = currentOverlay;
  });
  return createElement('div', { id: 'Island' });
}
beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.useFakeTimers();
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  setMode.mockClear();
  ignoreMouse.mockClear();
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: { setIgnoreMouseEvents: ignoreMouse },
  });
  await act(async () => root.render(createElement(OverlayProvider, null, createElement(Harness))));
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  Reflect.deleteProperty(window, 'electronAPI');
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe('Island position and overlay lifecycle', () => {
  it('consumes a menu dismissal click once and clears it for the next pointer gesture', () => {
    overlay.beginPointerGesture();
    overlay.suppressShellClick();
    expect(overlay.consumeShellClick()).toBe(true);
    expect(overlay.consumeShellClick()).toBe(false);
    overlay.suppressShellClick();
    overlay.beginPointerGesture();
    expect(overlay.consumeShellClick()).toBe(false);
  });
  it('retains expansion through movement-generated leave/focus events and resumes normal leave after animation', async () => {
    await act(async () => {
      interaction.setIsHovered(true);
      interaction.beginPositionChange();
      interaction.geometryExited();
      interaction.leave();
      window.dispatchEvent(new FocusEvent('focusout'));
    });
    expect(setMode.mock.calls).toEqual([['large']]);
    expect(ignoreMouse).toHaveBeenCalledWith(true, true);
    await act(async () => interaction.finishPositionChange());
    expect(setMode.mock.calls).toEqual([['large']]);
    await act(async () => interaction.leave());
    expect(setMode.mock.calls).toEqual([['large']]);
    await act(async () => {
      interaction.setIsHovered(true);
      interaction.leave();
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(setMode).toHaveBeenLastCalledWith('still');
    setMode.mockClear();
    await act(async () => {
      interaction.setIsHovered(true);
      window.dispatchEvent(new FocusEvent('focusout'));
    });
    expect(setMode).not.toHaveBeenCalled();
    await act(async () => {
      interaction.setIsHovered(false);
      window.dispatchEvent(new FocusEvent('focusout'));
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(setMode).toHaveBeenLastCalledWith('still');
  });
  it('keeps an open menu expanded and allows subsequent collapse after closing it', async () => {
    await act(async () => {
      interaction.setIsHovered(true);
      overlay.setOpenId('menu');
    });
    await act(async () => {
      interaction.leave();
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(setMode).not.toHaveBeenCalled();
    expect(ignoreMouse).toHaveBeenCalledWith(true, true);
    await act(async () => overlay.setOpenId(null));
    const trigger = document.createElement('button');
    host.append(trigger);
    await act(async () => {
      trigger.focus();
      interaction.leave();
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(setMode).toHaveBeenLastCalledWith('still');
  });
  it('leaves keyboard events with form controls and open menus, then resumes tab shortcuts outside them', async () => {
    let navigation: ReturnType<typeof useNavigation>;
    function NavigationHarness() {
      const current = useNavigation({
        mode: 'large',
        isDragging: false,
        setMode,
        mediaTrack: { name: 'Fixture', artist: 'Fixture', state: 'playing', source: 'fixture' },
      });
      useEffect(() => {
        navigation = current;
      });
      return createElement('input', { id: 'editor' });
    }
    const app = createElement(
      NotificationProvider,
      null,
      createElement(
        AppStateProvider,
        { initialState: defaultAppState },
        createElement(NavigationHarness),
      ),
    );
    await act(async () => root.render(app));
    const editor = document.getElementById('editor')!;
    await act(async () =>
      editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })),
    );
    expect(navigation!.currentTabId).toBe('overview');
    await act(async () =>
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
      ),
    );
    expect(navigation!.currentTabId).toBe('playing');
    // Batched repeats must each use the latest tab, and reversal must not wait
    // for a timer or an outgoing animation to finish.
    await act(async () => {
      for (let index = 0; index < 2; index++) {
        document.body.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ArrowRight', repeat: true, bubbles: true }),
        );
      }
    });
    expect(navigation!.currentTabId).toBe('clipboard');
    await act(async () => {
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }),
      );
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }),
      );
    });
    expect(navigation!.currentTabId).toBe('playing');
    const overlay = document.createElement('div');
    overlay.setAttribute('data-island-overlay', '');
    overlay.innerHTML = '<div role="menu"></div>';
    host.append(overlay);
    await act(async () =>
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: '7', ctrlKey: true, bubbles: true }),
      ),
    );
    expect(navigation!.currentTabId).toBe('playing');
    overlay.remove();
    await act(async () =>
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: '7', ctrlKey: true, bubbles: true }),
      ),
    );
    expect(navigation!.currentTabId).toBe('tasks');
    expect(setMode).toHaveBeenLastCalledWith('large');
  });
});
