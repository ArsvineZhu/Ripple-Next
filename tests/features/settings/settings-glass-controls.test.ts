// @vitest-environment happy-dom
import { act, createElement, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { ElectronAPI } from '../../../src/shared/contracts';
import { NativeColorField } from '../../../src/renderer/components/NativeColorField';
import { PreferenceSlider } from '../../../src/renderer/components/PreferenceSlider';
import { PreferenceSwitch } from '../../../src/renderer/components/PreferenceSwitch';

vi.mock('../../../src/renderer/components/liquidGlass/GlassSurface', () => ({
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

it('changes a switch during a captured drag and suppresses the release click', async () => {
  const changed = vi.fn();
  function ControlledSwitch() {
    const [checked, setChecked] = useState(false);
    return createElement(PreferenceSwitch, {
      label: 'Drag switch',
      checked,
      onCheckedChange(value) {
        changed(value);
        setChecked(value);
      },
    });
  }
  await act(async () => root.render(createElement(ControlledSwitch)));
  const input = host.querySelector('input')!;
  const track = input.nextElementSibling as HTMLElement,
    thumb = track.firstElementChild as HTMLElement;
  Object.defineProperty(track, 'clientWidth', { value: 52 });
  Object.defineProperty(thumb, 'offsetWidth', { value: 30 });
  track.style.padding = '3px';
  input.setPointerCapture = vi.fn();
  const pointer = (type: string, x: number) =>
    act(async () =>
      input.dispatchEvent(
        new PointerEvent(type, {
          pointerId: 1,
          isPrimary: true,
          pointerType: 'mouse',
          button: 0,
          clientX: x,
          clientY: 10,
          bubbles: true,
        }),
      ),
    );
  await pointer('pointerdown', 10);
  await pointer('pointermove', 30);
  expect(input.checked).toBe(true);
  expect(changed).toHaveBeenLastCalledWith(true);
  expect(input.setPointerCapture).toHaveBeenCalledWith(1);
  await pointer('pointermove', 10);
  expect(input.checked).toBe(false);
  expect(changed).toHaveBeenLastCalledWith(false);
  await pointer('pointermove', 30);
  await pointer('pointerup', 30);
  const count = changed.mock.calls.length;
  await act(async () =>
    input.dispatchEvent(new MouseEvent('click', { detail: 1, bubbles: true, cancelable: true })),
  );
  expect(changed).toHaveBeenCalledTimes(count);
  expect(input.checked).toBe(true);
  expect(input.parentElement?.hasAttribute('data-switch-dragging')).toBe(false);
  await act(async () =>
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
  );
  expect(input.checked).toBe(false);
});

it('attracts the native value while held, allows leaving a stop and keeps keyboard precision', async () => {
  const changed = vi.fn();
  function ControlledSlider() {
    const [value, setValue] = useState(50);
    return createElement(PreferenceSlider, {
      label: 'Magnetic slider',
      startLabel: 'Left',
      endLabel: 'Right',
      value,
      min: 0,
      max: 100,
      onValueChange(next) {
        changed(next);
        setValue(next);
      },
    });
  }
  await act(async () => root.render(createElement(ControlledSlider)));
  const input = host.querySelector('input')!;
  input.getBoundingClientRect = () => ({ left: 0, width: 400 }) as DOMRect;
  input.setPointerCapture = vi.fn();
  await act(async () =>
    input.dispatchEvent(
      new PointerEvent('pointerdown', { clientX: 200, pointerId: 1, bubbles: true }),
    ),
  );
  const moveValue = (value: number) =>
    act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
        input,
        String(value),
      );
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  await moveValue(49.5);
  expect(changed).toHaveBeenLastCalledWith(50);
  await moveValue(48.5);
  expect(Number(input.value)).toBeGreaterThan(49.8);
  expect(Number(input.value)).toBeLessThan(50);
  const attracted = Number(input.value);
  await act(async () =>
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })),
  );
  expect(changed).toHaveBeenLastCalledWith(Number((attracted + 1).toFixed(6)));
  await moveValue(44);
  expect(changed).toHaveBeenLastCalledWith(44);
  await act(async () => input.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true })));
  await moveValue(49);
  expect(changed).toHaveBeenLastCalledWith(49);
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
  input.value = '44';
  await act(async () =>
    input.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 4, bubbles: true })),
  );
  await act(async () =>
    input.dispatchEvent(new PointerEvent('pointerup', { pointerId: 4, bubbles: true })),
  );
  expect(changed).not.toHaveBeenCalled();
});
