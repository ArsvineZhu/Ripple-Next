// @vitest-environment happy-dom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { ElectronAPI } from '../src/shared/contracts';
import { NativeColorField } from '../src/renderer/components/NativeColorField';
import { PreferenceSlider } from '../src/renderer/components/PreferenceSlider';
import { PreferenceSwitch } from '../src/renderer/components/PreferenceSwitch';

vi.mock('../src/renderer/components/liquidGlass/GlassSurface', () => ({
  GlassSurface: () => createElement('div', { 'aria-hidden': true, 'data-material': true }),
}));
let root: ReturnType<typeof createRoot>;
let host: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});
it('opens the native picker, preserves alpha on confirmation, and leaves Cancel unchanged', async () => {
  const selected = vi.fn();
  const picker = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce('#112233');
  window.electronAPI = { showColorPicker: picker } as unknown as ElectronAPI;
  await act(async () =>
    root.render(
      createElement(NativeColorField, {
        label: 'Color',
        value: 'rgba(0, 0, 0, 0.64)',
        onValueChange: selected,
      }),
    ),
  );
  const button = host.querySelector('button')!;
  expect(host.querySelector('[data-material]')).toBeNull();
  await act(async () => button.click());
  expect(picker).toHaveBeenLastCalledWith('#000000');
  expect(selected).not.toHaveBeenCalled();
  await act(async () => button.click());
  expect(selected).toHaveBeenLastCalledWith('rgba(17, 34, 51, 0.64)');
});
it('does not open another picker while one is pending, and restores the button on failure', async () => {
  let rejectPicker!: (error: Error) => void;
  const picker = vi.fn(
    () =>
      new Promise<string | null>((_resolve, reject) => {
        rejectPicker = reject;
      }),
  );
  window.electronAPI = { showColorPicker: picker } as unknown as ElectronAPI;
  const selected = vi.fn();
  await act(async () =>
    root.render(
      createElement(NativeColorField, {
        label: 'Color',
        value: '#123456',
        onValueChange: selected,
      }),
    ),
  );
  const button = host.querySelector('button')!;
  await act(async () => {
    button.click();
    button.click();
  });
  expect(picker).toHaveBeenCalledOnce();
  expect(button.disabled).toBe(true);
  await act(async () => rejectPicker(new Error('unavailable')));
  expect(button.disabled).toBe(false);
  expect(selected).not.toHaveBeenCalled();
});
it('keeps switch checked state controlled and exposes native activation and disabled semantics', async () => {
  const changed = vi.fn();
  const renderSwitch = (checked: boolean, disabled = false) =>
    act(async () =>
      root.render(
        createElement(PreferenceSwitch, {
          label: 'Show the Island border',
          checked,
          disabled,
          onCheckedChange: changed,
        }),
      ),
    );
  await renderSwitch(false);
  const input = host.querySelector<HTMLInputElement>('[role=switch]')!;
  expect(input.type).toBe('checkbox');
  expect(input.getAttribute('aria-label')).toBe('Show the Island border');
  await act(async () => input.click());
  expect(changed).toHaveBeenLastCalledWith(true);
  await renderSwitch(true);
  expect(input.checked).toBe(true);
  await act(async () =>
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
  );
  expect(changed).toHaveBeenLastCalledWith(false);
  await renderSwitch(true, true);
  changed.mockClear();
  await act(async () => input.click());
  expect(changed).not.toHaveBeenCalled();
  expect(input.disabled).toBe(true);
});

it('keeps the real range, continuous values, keyboard fine adjustment and pointer stop snapping', async () => {
  const changed = vi.fn();
  await act(async () =>
    root.render(
      createElement(PreferenceSlider, {
        label: 'Position',
        startLabel: 'Left',
        endLabel: 'Right',
        value: 50,
        min: 0,
        max: 100,
        onValueChange: changed,
      }),
    ),
  );
  const input = host.querySelector('input')!;
  expect(input.type).toBe('range');
  expect(input.step).toBe('any');
  expect(host.querySelector('[data-material]')?.getAttribute('aria-hidden')).toBe('true');
  await act(async () =>
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true, bubbles: true }),
    ),
  );
  expect(changed).toHaveBeenLastCalledWith(50.1);
  await act(async () =>
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true })),
  );
  expect(changed).toHaveBeenLastCalledWith(0);
  await act(async () =>
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true })),
  );
  expect(changed).toHaveBeenLastCalledWith(100);
  input.setPointerCapture = vi.fn();
  input.getBoundingClientRect = () => ({ width: 400 }) as DOMRect;
  input.value = '49.5';
  await act(async () =>
    input.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 3, bubbles: true })),
  );
  expect(input.setPointerCapture).toHaveBeenCalledWith(3);
  await act(async () =>
    input.dispatchEvent(new PointerEvent('pointerup', { pointerId: 3, bubbles: true })),
  );
  expect(changed).toHaveBeenLastCalledWith(50);
  changed.mockClear();
  input.value = '47.8';
  await act(async () =>
    input.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 4, bubbles: true })),
  );
  await act(async () =>
    input.dispatchEvent(new PointerEvent('pointerup', { pointerId: 4, bubbles: true })),
  );
  expect(changed).toHaveBeenLastCalledWith(50);
  changed.mockClear();
  input.value = '47';
  await act(async () =>
    input.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 4, bubbles: true })),
  );
  await act(async () =>
    input.dispatchEvent(new PointerEvent('pointerup', { pointerId: 4, bubbles: true })),
  );
  expect(changed).not.toHaveBeenCalled();
});
