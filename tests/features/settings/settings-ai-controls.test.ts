// @vitest-environment happy-dom
import { act, createElement } from 'react';
import { createReactFixture, fillInput as fill } from '../../shared/fixtures/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AISettingsPage } from '../../../src/renderer/features/AISettings';
import { AIModelCustomization } from '../../../src/renderer/features/AIModelCustomization';
import { SettingsAbout } from '../../../src/renderer/features/SettingsAbout';
import { NotificationProvider } from '../../../src/renderer/components/NotificationProvider';
import { defaultAIConfiguration, defaultCustomization } from '../../../src/shared/aiConfiguration';
import { defaultAppState } from '../../../src/shared/appState';

const fixture = vi.hoisted(() => ({ state: {} as typeof defaultAppState, updateState: vi.fn() }));
vi.mock('../../../src/renderer/components/AppStateProvider', () => ({
  useAppState: () => fixture,
}));
vi.mock('../../../src/renderer/hooks/useAIConfiguration', () => ({
  useAIConfiguration: () => ({
    ai: fixture.state.settings.ai,
    status: {},
    mutate: vi.fn(),
    saveCredential: vi.fn(),
  }),
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../../src/renderer/hooks/useReducedMotionPreference', () => ({
  useReducedMotionPreference: () => true,
}));
vi.mock('../../../src/renderer/components/Select', () => ({ Select: () => null }));
vi.mock('../../../src/renderer/components/PreferenceSwitch', () => ({
  PreferenceSwitch: () => null,
}));
vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: unknown }) => children,
  motion: {
    div: ({ children, className }: { children: unknown; className: string }) =>
      createElement('div', { className }, children as never),
  },
}));
let mounted: ReturnType<typeof createReactFixture>;
let host: HTMLDivElement, root: ReturnType<typeof createReactFixture>['root'];
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  mounted = createReactFixture();
  ({ host, root } = mounted);
  fixture.state = structuredClone(defaultAppState);
  fixture.updateState.mockReset();
});
afterEach(async () => {
  await mounted.close();
  vi.unstubAllGlobals();
});
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
  expect(host.textContent).toContain('visionCapability');
  expect(host.textContent).toContain('probeVision');
  expect(host.textContent).not.toContain('customInstruction');
  expect(host.textContent).not.toContain('perceptionBattery');
  expect(host.textContent).not.toContain('contextAwarenessReserved');
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
it('lists developers with avatars and the product website', async () => {
  await act(async () =>
    root.render(
      createElement(
        NotificationProvider,
        null,
        createElement(SettingsAbout, { onOpenDetail: vi.fn() }),
      ),
    ),
  );
  expect(host.textContent).toContain('Arsvine');
  expect(host.textContent).toContain('TopMyster');
  expect(host.textContent).toContain('Thomas Boom');
  expect(host.textContent).toContain('Hackintosh_HD');
  expect(host.textContent).toContain('Kandarp Gajjar');
  expect(host.textContent).toContain('ripple.arsvine.com');
  expect(host.querySelector('img[src*="github.com/ArsvineZhu.png"]')).toBeTruthy();
  expect(host.textContent).toContain('developerWebsite');
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
  fixture.state.settings.ai = ai;
  await act(async () =>
    root.render(
      createElement(AISettingsPage, {
        detail: { page: 'aiEndpoints' },
        navigate,
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
