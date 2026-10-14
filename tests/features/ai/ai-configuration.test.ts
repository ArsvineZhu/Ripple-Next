import { expect, it } from 'vitest';
import {
  AIConfigurationSchema,
  ModelCustomizationSchema,
  aiSecretName,
  defaultAIConfiguration,
} from '../../../src/shared/aiConfiguration';
import { defaultAppState } from '../../../src/shared/appState';
import type { AppStatePatch } from '../../../src/shared/appState';
import { createAIConfigurationService } from '../../../src/main/ai/configuration';

function fixture() {
  let state = structuredClone(defaultAppState);
  const ciphertext = new Map<string, string>();
  const service = createAIConfigurationService(
    {
      load: async () => structuredClone(state),
      update: async (patch: AppStatePatch, removed: readonly string[] = []) => {
        for (const name of removed) ciphertext.delete(name);
        state = { ...state, settings: { ...state.settings, ...patch.settings } };
        return structuredClone(state);
      },
    },
    {
      setSecret: async (name, value) => {
        if (value) ciphertext.set(name, value);
        else ciphertext.delete(name);
      },
      hasSecret: async (name) => ciphertext.has(name),
      getSecret: async (name) => ciphertext.get(name) ?? null,
    },
  );
  return {
    service,
    read: () => state.settings.ai,
    has: (id: number) => ciphertext.has(aiSecretName(id)),
  };
}
it('allocates stable monotonic endpoint IDs even with concurrent additions and deletion', async () => {
  const f = fixture();
  await Promise.all([
    f.service.mutate({ kind: 'add-endpoint', protocol: 'responses' }),
    f.service.mutate({ kind: 'add-endpoint', protocol: 'anthropic' }),
  ]);
  expect(f.read().endpoints.map((item) => item.id)).toEqual([1, 2, 3]);
  await f.service.mutate({ kind: 'remove-endpoint', id: 2 });
  await f.service.mutate({ kind: 'add-endpoint', protocol: 'completion' });
  expect(f.read().endpoints.map((item) => item.id)).toEqual([1, 3, 4]);
  expect(f.read().endpoints.at(-1)?.label).toBe('');
});
it('requires a bound, explicitly saved credential before a model is created', async () => {
  const f = fixture();
  await f.service.mutate({ kind: 'add-credential', endpointId: 1 });
  await expect(
    f.service.mutate({ kind: 'add-model', endpointId: 1, credentialId: 1 }),
  ).rejects.toThrow('Save the credential');
  expect(f.has(1)).toBe(false);
  expect(f.read().credentials[0].label).toBe('');
  await f.service.saveCredential(1, 'fixture-credential');
  await f.service.mutate({ kind: 'add-model', endpointId: 1, credentialId: 1 });
  await f.service.mutate({
    kind: 'edit-model',
    id: 1,
    endpointId: 1,
    credentialId: 1,
    name: 'my-model',
    label: 'Personal',
  });
  expect(f.read().activeModelId).toBe(1);
  expect(JSON.stringify(f.read())).not.toContain('fixture-credential');
});
it('rejects cross-endpoint keys and preserves model customization when its credential is removed', async () => {
  const f = fixture();
  await f.service.mutate({ kind: 'add-endpoint', protocol: 'responses' });
  await f.service.mutate({ kind: 'add-credential', endpointId: 1 });
  await f.service.saveCredential(1, 'fixture');
  await expect(
    f.service.mutate({ kind: 'add-model', endpointId: 2, credentialId: 1 }),
  ).rejects.toThrow('Select an endpoint');
  await f.service.mutate({ kind: 'add-model', endpointId: 1, credentialId: 1 });
  const customization = { ...f.read().models[0].customization, systemPrompt: 'My prompt' };
  await f.service.mutate({ kind: 'customize-model', id: 1, customization });
  await f.service.mutate({ kind: 'remove-credential', id: 1 });
  expect(f.has(1)).toBe(false);
  expect(f.read().models[0].credentialId).toBeNull();
  expect(f.read().models[0].customization.systemPrompt).toBe('My prompt');
});
it('validates graph counters and forbids screenshot awareness in the reserved capability', () => {
  const config = defaultAIConfiguration();
  config.nextId.endpoint = 1;
  expect(AIConfigurationSchema.safeParse(config).success).toBe(false);
  expect(ModelCustomizationSchema.safeParse({ contextAwareness: true }).success).toBe(false);
});

it('merges concurrent field and injection edits against the current graph', async () => {
  const f = fixture();
  await f.service.mutate({ kind: 'add-credential', endpointId: 1 });
  await f.service.saveCredential(1, 'fixture');
  await f.service.mutate({ kind: 'add-model', endpointId: 1, credentialId: 1 });
  await Promise.all([
    f.service.mutate({ kind: 'edit-endpoint', id: 1, label: 'Local' }),
    f.service.mutate({ kind: 'edit-endpoint', id: 1, baseUrl: 'http://localhost:8000/v1' }),
    f.service.mutate({
      kind: 'edit-model',
      id: 1,
      endpointId: 1,
      credentialId: 1,
      name: 'model-a',
    }),
    f.service.mutate({
      kind: 'edit-model',
      id: 1,
      endpointId: 1,
      credentialId: 1,
      label: 'Personal',
    }),
    f.service.mutate({ kind: 'customize-model', id: 1, customization: { temperature: 0.3 } }),
    f.service.mutate({
      kind: 'customize-model',
      id: 1,
      customization: { reasoningEffort: 'high' },
    }),
    f.service.mutate({ kind: 'add-injection', id: 1 }),
    f.service.mutate({ kind: 'add-injection', id: 1 }),
  ]);
  const [first, second] = f.read().models[0].customization.injections;
  await Promise.all([
    f.service.mutate({ kind: 'edit-injection', id: 1, injectionId: first.id, name: 'Context' }),
    f.service.mutate({ kind: 'edit-injection', id: 1, injectionId: first.id, text: '{{product}}' }),
    f.service.mutate({ kind: 'edit-injection', id: 1, injectionId: second.id, enabled: false }),
    f.service.mutate({ kind: 'move-injection', id: 1, injectionId: second.id, direction: -1 }),
  ]);
  expect(f.read().endpoints[0]).toMatchObject({
    label: 'Local',
    baseUrl: 'http://localhost:8000/v1',
  });
  expect(f.read().models[0]).toMatchObject({
    name: 'model-a',
    label: 'Personal',
    customization: { temperature: 0.3, reasoningEffort: 'high' },
  });
  expect(f.read().models[0].customization.injections).toEqual([
    { ...second, enabled: false },
    { ...first, name: 'Context', text: '{{product}}' },
  ]);
});
