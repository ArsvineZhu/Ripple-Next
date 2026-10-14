import type { AssistantEvent, AssistantResult } from '../../shared/contracts';
import type { createAIConfigurationService } from './configuration';
import { streamCompatibleChat } from './stream';
import { AIError } from './error';

export function createAssistantService(
  configuration: Pick<ReturnType<typeof createAIConfigurationService>, 'activeModel'>,
  getAppVersion: () => string,
) {
  const requests = new Map<string, AbortController>();
  const cancel = (id: string) => {
    requests.get(id)?.abort();
    requests.delete(id);
  };
  return {
    cancel,
    async start(
      requestId: string,
      prompt: string,
      send: (event: AssistantEvent) => void,
    ): Promise<AssistantResult> {
      cancel(requestId);
      const controller = new AbortController();
      requests.set(requestId, controller);
      let apiKey = '';
      try {
        const model = await configuration.activeModel();
        apiKey = model.apiKey;
        if (controller.signal.aborted) return { status: 'cancelled' };
        const text = await streamCompatibleChat(
          { ...model, version: getAppVersion(), prompt, signal: controller.signal },
          {
            onDelta: (content) => {
              if (!controller.signal.aborted) send({ requestId, content });
            },
          },
        );
        if (controller.signal.aborted) return { status: 'cancelled' };
        return text ? { status: 'complete', text } : { status: 'error', code: 'noAiResponse' };
      } catch (error) {
        if (controller.signal.aborted) return { status: 'cancelled' };
        const message = error instanceof Error ? error.message : String(error);
        const detail = (apiKey ? message.replaceAll(apiKey, '[redacted]') : message).slice(0, 320);
        return {
          status: 'error',
          code: error instanceof AIError ? error.code : 'aiRequestFailed',
          detail,
        };
      } finally {
        if (requests.get(requestId) === controller) requests.delete(requestId);
      }
    },
  };
}
