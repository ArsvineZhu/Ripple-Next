import { describe, expect, it, vi } from 'vitest';
import { defaultAppState } from '../src/shared/appState';
import { createAssistantService } from '../src/main/services/assistant';
import { defaultCustomization } from '../src/shared/aiConfiguration';

function configuredState() {
  const state = structuredClone(defaultAppState);
  state.settings.ai.credentials = [{ id: 1, endpointId: 1, label: 'Fixture' }];
  state.settings.ai.models = [
    {
      id: 1,
      endpointId: 1,
      credentialId: 1,
      name: 'test-model',
      label: 'Fixture',
      customization: defaultCustomization(),
    },
  ];
  state.settings.ai.activeModelId = 1;
  state.settings.ai.nextId.credential = state.settings.ai.nextId.model = 2;
  return state;
}

describe('assistant service', () => {
  it('reports a missing key without starting a network request', async () => {
    const stream = vi.fn();
    const send = vi.fn();
    const service = createAssistantService(
      { load: async () => configuredState() },
      { getSecret: async () => null },
      { getAppVersion: () => '4.0.0-beta.1', stream },
    );

    await service.start('request-1', 'Hello', send);

    expect(stream).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledWith({
      requestId: 'request-1',
      kind: 'error',
      code: 'missingApiKey',
    });
  });

  it('relays deltas and a completion event for a successful request', async () => {
    const state = configuredState();
    const stream = vi.fn(async (_request, dependencies) => {
      dependencies.onDelta('answer');
      return 'answer';
    });
    const send = vi.fn();
    const service = createAssistantService(
      { load: async () => state },
      {
        getSecret: async (name) => {
          expect(name).toBe('ai-api-key:1');
          return 'test-key';
        },
      },
      { getAppVersion: () => '4.0.0-beta.1', stream },
    );

    await service.start('request-2', 'Hello', send);

    expect(send.mock.calls.map(([event]) => event)).toEqual([
      { requestId: 'request-2', kind: 'delta', content: 'answer' },
      { requestId: 'request-2', kind: 'done' },
    ]);
  });
});
