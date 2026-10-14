// @vitest-environment happy-dom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AISettingsPage } from '../src/renderer/features/AISettings';
import { AIModelCustomization } from '../src/renderer/features/AIModelCustomization';
import { defaultAIConfiguration, defaultCustomization } from '../src/shared/aiConfiguration';
import { defaultAppState } from '../src/shared/appState';
import { WorkflowEditor } from '../src/renderer/features/WorkflowEditor';
import { DangerAction } from '../src/renderer/components/DangerAction';

const fixture = vi.hoisted(() => ({ state: {} as typeof defaultAppState, updateState: vi.fn() }));
vi.mock('../src/renderer/components/AppStateProvider', () => ({ useAppState: () => fixture }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../src/renderer/hooks/useReducedMotionPreference', () => ({
  useReducedMotionPreference: () => true,
}));
vi.mock('../src/renderer/components/Select', () => ({ Select: () => null }));
vi.mock('../src/renderer/components/PreferenceSwitch', () => ({ PreferenceSwitch: () => null }));
vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: unknown }) => children,
  motion: {
    div: ({ children, className }: { children: unknown; className: string }) =>
      createElement('div', { className }, children as never),
  },
}));
let host: HTMLDivElement, root: ReturnType<typeof createRoot>;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  fixture.state = structuredClone(defaultAppState);
  fixture.updateState.mockReset();
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});
async function fill(input: HTMLInputElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
it('steps and bounds numeric parameters, resets to provider default and rejects fractional token limits', async () => {
  const ai = defaultAIConfiguration();
  ai.models.push({
    id: 1,
    endpointId: 1,
    credentialId: null,
    name: 'model',
    label: '',
    customization: defaultCustomization(),
  });
  const mutate = vi.fn().mockResolvedValue(null);
  await act(async () =>
    root.render(
      createElement(AIModelCustomization, {
        id: 1,
        controller: { ai, status: {}, mutate, saveCredential: vi.fn() },
      }),
    ),
  );
  const temperature = host.querySelector<HTMLInputElement>('input[aria-label=modelTemperature]')!;
  const controls = temperature
    .closest('[data-number-field]')!
    .querySelectorAll<HTMLButtonElement>('button');
  await act(async () => controls[0].click());
  expect(mutate).toHaveBeenLastCalledWith({
    kind: 'customize-model',
    id: 1,
    customization: { temperature: 0.1 },
  });
  await fill(temperature, '2');
  expect(controls[0].disabled).toBe(true);
  await act(async () => controls[1].click());
  expect(temperature.value).toBe('1.9');
  await fill(temperature, '');
  expect(mutate).toHaveBeenLastCalledWith({
    kind: 'customize-model',
    id: 1,
    customization: { temperature: null },
  });
  mutate.mockClear();
  const tokens = host.querySelector<HTMLInputElement>('input[aria-label=maxOutputTokens]')!;
  await fill(tokens, '2048.5');
  expect(tokens.getAttribute('aria-invalid')).toBe('true');
  expect(mutate).not.toHaveBeenCalled();
});
it('keeps commas inside a workflow target and saves each added row independently', async () => {
  await act(async () => root.render(createElement(WorkflowEditor)));
  await fill(host.querySelector('input')!, 'Reading');
  await fill(host.querySelectorAll('input')[1], 'https://example.test/a,b');
  expect(fixture.updateState).toHaveBeenLastCalledWith({
    workflows: [{ name: 'Reading', targets: [{ kind: 'url', url: 'https://example.test/a,b' }] }],
  });
  fixture.state.workflows = [
    { name: 'Reading', targets: [{ kind: 'url', url: 'https://example.test/a,b' }] },
  ];
  await act(async () =>
    host.querySelector<HTMLButtonElement>('button[class*=addRowButton]')!.click(),
  );
  await fill(host.querySelectorAll('input')[2], 'docs.google.com');
  expect(fixture.updateState).toHaveBeenLastCalledWith({
    workflows: [
      {
        name: 'Reading',
        targets: [
          { kind: 'url', url: 'https://example.test/a,b' },
          { kind: 'url', url: 'https://docs.google.com' },
        ],
      },
    ],
  });
  expect(host.querySelector('button[type=submit]')).toBeNull();
});

it('executes a dangerous action only after confirmation and allows cancellation', async () => {
  const remove = vi.fn().mockResolvedValue(undefined);
  await act(async () =>
    root.render(createElement(DangerAction, { label: 'Remove model #1', onConfirm: remove })),
  );
  await act(async () => host.querySelector<HTMLButtonElement>('button[aria-label]')!.click());
  expect(remove).not.toHaveBeenCalled();
  const dialog = host.querySelector('dialog')!;
  expect(dialog.open).toBe(true);
  await act(async () => dialog.querySelector<HTMLButtonElement>('button')!.click());
  expect(dialog.open).toBe(false);
  expect(remove).not.toHaveBeenCalled();
  await act(async () => host.querySelector<HTMLButtonElement>('button[aria-label]')!.click());
  await act(async () => dialog.querySelectorAll<HTMLButtonElement>('button')[1].click());
  expect(remove).toHaveBeenCalledOnce();
  expect(dialog.open).toBe(false);
});

it('renders contiguous endpoint numbers and edits the original stable ID', async () => {
  const ai = defaultAIConfiguration();
  ai.endpoints.push({
    id: 4,
    protocol: 'completion',
    label: 'Work',
    baseUrl: 'https://example.com/v1',
  });
  const navigate = vi.fn();
  await act(async () =>
    root.render(
      createElement(AISettingsPage, {
        detail: { page: 'aiEndpoints' },
        navigate,
        controller: { ai, status: {}, mutate: vi.fn(), saveCredential: vi.fn() },
      }),
    ),
  );
  expect(host.textContent).toContain('#2 · Work');
  expect(host.textContent).not.toContain('#4');
  await act(async () =>
    host.querySelector<HTMLButtonElement>('[data-settings-entry=aiEndpoint-4]')!.click(),
  );
  expect(navigate).toHaveBeenCalledWith({ page: 'aiEndpoint', id: 4 });
});
