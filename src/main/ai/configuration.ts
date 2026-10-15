import { DiagnosticError } from '../../shared/diagnosticError';
import {
  AIConfigurationSchema,
  AIMutationSchema,
  aiSecretName,
  defaultBaseUrls,
  defaultCustomization,
} from '../../shared/aiConfiguration';
import type { AIConfiguration, AIMutation } from '../../shared/aiConfiguration';
import type { AppState, AppStatePatch } from '../../shared/appState';
import { randomUUID } from 'node:crypto';
import { AIError } from './error';

interface StateStore {
  load(): Promise<AppState>;
  update(patch: AppStatePatch, removedSecrets?: readonly string[]): Promise<AppState>;
}
interface Secrets {
  setSecret(name: string, value: string): Promise<void>;
  hasSecret(name: string): Promise<boolean>;
  getSecret(name: string): Promise<string | null>;
}

/** Main allocates IDs and owns graph edits and encrypted credential writes. */
export function createAIConfigurationService(stateStore: StateStore, secrets: Secrets) {
  let queue: Promise<unknown> = Promise.resolve();
  const schedule = <T>(action: () => Promise<T>) => {
    const result = queue.then(action);
    queue = result.catch(() => {});
    return result;
  };
  const metadata = async (config: AIConfiguration) => {
    const pairs = await Promise.all(
      config.credentials.map(
        async (item) => [item.id, await secrets.hasSecret(aiSecretName(item.id))] as const,
      ),
    );
    return Object.fromEntries(pairs) as Record<number, boolean>;
  };
  const verifyBinding = async (
    config: AIConfiguration,
    endpointId: number,
    credentialId: number,
  ) => {
    if (
      !config.endpoints.some((item) => item.id === endpointId) ||
      !config.credentials.some((item) => item.id === credentialId && item.endpointId === endpointId)
    )
      throw new DiagnosticError('Select an endpoint and its credential first');
    if (!(await secrets.hasSecret(aiSecretName(credentialId))))
      throw new DiagnosticError('Save the credential first');
  };
  return {
    async activeModel() {
      const { settings } = await stateStore.load();
      const model = settings.ai.models.find((item) => item.id === settings.ai.activeModelId);
      const endpoint = settings.ai.endpoints.find((item) => item.id === model?.endpointId);
      if (!model?.name || !endpoint)
        throw new AIError('invalidAISettings', 'Select a configured model');
      const apiKey =
        model.credentialId === null
          ? null
          : await secrets.getSecret(aiSecretName(model.credentialId));
      if (!apiKey) throw new AIError('missingApiKey', 'Save the selected model credential');
      return { model, endpoint, apiKey, timeZone: settings.timeZone };
    },
    async status() {
      return metadata((await stateStore.load()).settings.ai);
    },
    mutate(input: AIMutation) {
      return schedule(async () => {
        const command = AIMutationSchema.parse(input);
        const config = structuredClone((await stateStore.load()).settings.ai);
        const removed: number[] = [];
        const endpoint = (id: number) => {
          const item = config.endpoints.find((value) => value.id === id);
          if (!item) throw new DiagnosticError('Endpoint is missing');
          return item;
        };
        const credential = (id: number) => {
          const item = config.credentials.find((value) => value.id === id);
          if (!item) throw new DiagnosticError('Credential is missing');
          return item;
        };
        const model = (id: number) => {
          const item = config.models.find((value) => value.id === id);
          if (!item) throw new DiagnosticError('Model is missing');
          return item;
        };
        switch (command.kind) {
          case 'add-endpoint': {
            const id = config.nextId.endpoint++;
            config.endpoints.push({
              id,
              protocol: command.protocol,
              baseUrl: defaultBaseUrls[command.protocol],
              label: '',
            });
            break;
          }
          case 'edit-endpoint': {
            const item = endpoint(command.id);
            const baseUrl = command.baseUrl ?? item.baseUrl;
            Object.assign(item, {
              baseUrl: baseUrl.trim().replace(/\/+$/, ''),
              label: command.label ?? item.label,
            });
            break;
          }
          case 'remove-endpoint':
            endpoint(command.id);
            removed.push(
              ...config.credentials
                .filter((item) => item.endpointId === command.id)
                .map((item) => item.id),
            );
            config.endpoints = config.endpoints.filter((item) => item.id !== command.id);
            config.credentials = config.credentials.filter(
              (item) => item.endpointId !== command.id,
            );
            config.models = config.models.filter((item) => item.endpointId !== command.id);
            break;
          case 'add-credential': {
            endpoint(command.endpointId);
            const id = config.nextId.credential++;
            config.credentials.push({
              id,
              endpointId: command.endpointId,
              label: '',
            });
            break;
          }
          case 'edit-credential':
            credential(command.id).label = command.label;
            break;
          case 'remove-credential':
            credential(command.id);
            removed.push(command.id);
            config.credentials = config.credentials.filter((item) => item.id !== command.id);
            config.models.forEach((item) => {
              if (item.credentialId === command.id) item.credentialId = null;
            });
            break;
          case 'add-model': {
            await verifyBinding(config, command.endpointId, command.credentialId);
            const id = config.nextId.model++;
            config.models.push({
              id,
              endpointId: command.endpointId,
              credentialId: command.credentialId,
              name: '',
              label: '',
              customization: defaultCustomization(),
            });
            break;
          }
          case 'edit-model': {
            await verifyBinding(config, command.endpointId, command.credentialId);
            const item = model(command.id);
            Object.assign(item, {
              endpointId: command.endpointId,
              credentialId: command.credentialId,
              name: command.name?.trim() ?? item.name,
              label: command.label ?? item.label,
            });
            if (config.activeModelId === null && item.name.trim())
              config.activeModelId = command.id;
            break;
          }
          case 'customize-model':
            Object.assign(model(command.id).customization, command.customization);
            break;
          case 'add-injection':
            model(command.id).customization.injections.push({
              id: randomUUID(),
              name: '',
              text: '',
              enabled: true,
            });
            break;
          case 'edit-injection': {
            const item = model(command.id).customization.injections.find(
              (value) => value.id === command.injectionId,
            );
            if (!item) throw new DiagnosticError('Injection is missing');
            if (command.name !== undefined) item.name = command.name;
            if (command.text !== undefined) item.text = command.text;
            if (command.enabled !== undefined) item.enabled = command.enabled;
            break;
          }
          case 'remove-injection': {
            const profile = model(command.id).customization;
            profile.injections = profile.injections.filter(
              (item) => item.id !== command.injectionId,
            );
            break;
          }
          case 'move-injection': {
            const list = model(command.id).customization.injections;
            const index = list.findIndex((item) => item.id === command.injectionId),
              next = index + command.direction;
            if (index < 0) throw new DiagnosticError('Injection is missing');
            if (next >= 0 && next < list.length)
              [list[index], list[next]] = [list[next], list[index]];
            break;
          }
          case 'remove-model':
            model(command.id);
            config.models = config.models.filter((item) => item.id !== command.id);
            break;
          case 'select-model':
            if (command.id !== null) {
              const selected = model(command.id);
              if (!selected.name.trim() || selected.credentialId === null)
                throw new DiagnosticError('Model is not configured');
              await verifyBinding(config, selected.endpointId, selected.credentialId);
            }
            config.activeModelId = command.id;
            break;
        }
        if (!config.models.some((item) => item.id === config.activeModelId))
          config.activeModelId = null;
        const state = await stateStore.update(
          {
            settings: { ai: AIConfigurationSchema.parse(config) },
          },
          removed.map(aiSecretName),
        );
        return { state, credentialStatus: await metadata(config) };
      });
    },
    saveCredential(id: number, value: string) {
      return schedule(async () => {
        const previous = await stateStore.load();
        if (!previous.settings.ai.credentials.some((item) => item.id === id))
          throw new DiagnosticError('Credential is missing');
        try {
          await secrets.setSecret(aiSecretName(id), value);
        } catch {
          throw new DiagnosticError('OS-backed secure storage is unavailable');
        }
        const state = await stateStore.update({
          settings: { secretRevision: previous.settings.secretRevision + 1 },
        });
        return { state, credentialStatus: await metadata(state.settings.ai) };
      });
    },
  };
}
