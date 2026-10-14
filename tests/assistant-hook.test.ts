/** @vitest-environment happy-dom */
import { act, createElement, useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import type { AssistantEvent, AssistantResult, ElectronAPI } from '../src/shared/contracts';
import { useAssistant } from '../src/renderer/hooks/useAssistant';

vi.mock('../src/renderer/lib/diagnostics', () => ({
  recordRendererError: vi.fn(),
  recordRendererAnswerCharacters: vi.fn(),
}));
it('keeps partial text on failure and ignores stale deltas/results after reset', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  let listener: (event: AssistantEvent) => void = () => {};
  const pending: ((result: AssistantResult) => void)[] = [];
  const ids: string[] = [];
  const cancel = vi.fn().mockResolvedValue(undefined);
  window.electronAPI = {
    onAssistantEvent: (callback: (event: AssistantEvent) => void) => {
      listener = callback;
      return () => {};
    },
    startAssistant: (id: string) => {
      ids.push(id);
      return new Promise((resolve) => pending.push(resolve));
    },
    cancelAssistant: cancel,
  } as unknown as ElectronAPI;
  let assistant!: ReturnType<typeof useAssistant>;
  function View() {
    const value = useAssistant();
    useLayoutEffect(() => {
      assistant = value;
    });
    return null;
  }
  const host = document.createElement('div'),
    root = createRoot(host);
  try {
    await act(async () => root.render(createElement(View)));
    await act(async () => assistant.setUserText('Question'));
    let first!: Promise<void>;
    await act(async () => {
      first = assistant.askAI();
    });
    await act(async () => listener({ requestId: ids[0], content: 'Partial answer' }));
    await act(async () => {
      pending[0]({ status: 'error', code: 'aiRequestFailed' });
      await first;
    });
    expect(assistant.aiAnswer).toBe('Partial answer');
    expect(assistant.assistantError?.kind).toBe('aiRequestFailed');
    let second!: Promise<void>;
    await act(async () => {
      second = assistant.askAI();
    });
    await act(async () => assistant.resetAssistant());
    await act(async () => {
      listener({ requestId: ids[1], content: 'Stale' });
      pending[1]({ status: 'complete', text: 'Stale' });
      await second;
    });
    expect(cancel).toHaveBeenCalledWith(ids[1]);
    expect(assistant.asked).toBe(false);
    expect(assistant.aiAnswer).toBeNull();
  } finally {
    await act(async () => root.unmount());
    vi.unstubAllGlobals();
  }
});
