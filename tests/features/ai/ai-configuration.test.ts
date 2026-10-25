import { expect, it } from 'vitest';
import {
  AIConfigurationSchema,
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
  await f.service.mutate({
    kind: 'customize-model',
    id: 1,
    customization: { temperature: 0.4 },
  });
  await f.service.mutate({ kind: 'remove-credential', id: 1 });
  expect(f.has(1)).toBe(false);
  expect(f.read().models[0].credentialId).toBeNull();
  expect(f.read().models[0].customization.temperature).toBe(0.4);
});
it('lifts legacy per-model instructions and perception into shared settings', () => {
  const { instruction: _instruction, perception: _perception, ...base } = defaultAIConfiguration();
  const parsed = AIConfigurationSchema.parse({
    ...base,
    nextId: { endpoint: 2, credential: 1, model: 2 },
    models: [
      {
        id: 1,
        endpointId: 1,
        credentialId: null,
        name: 'm',
        label: '',
        customization: {
          injections: [
            { id: 'a', name: 'A', text: 'Hello', enabled: true },
            { id: 'b', name: 'B', text: 'Hidden', enabled: false },
          ],
          perception: { battery: false },
          systemPrompt: 'ignored',
          contextAwareness: false,
        },
      },
    ],
  });
  expect(parsed.instruction).toBe('Hello');
  expect(parsed.perception.battery).toBe(false);
  expect(parsed.perception.clock).toBe(true);
  expect(parsed.models[0].customization.vision).toBe('unknown');
});
it('merges one shared perception channel without changing model parameters', async () => {
  const f = fixture();
  await f.service.mutate({ kind: 'edit-shared', perception: { battery: false, desktop: true } });
  expect(f.read().perception.battery).toBe(false);
  expect(f.read().perception.clock).toBe(true);
  expect(f.read().perception.desktop).toBe(true);
  await f.service.mutate({ kind: 'edit-shared', instruction: 'Stay concise' });
  expect(f.read().instruction).toBe('Stay concise');
  expect(f.read().perception.battery).toBe(false);
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
    f.service.mutate({ kind: 'edit-shared', instruction: 'Hello {{product}}' }),
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
  expect(f.read().instruction).toBe('Hello {{product}}');
});
