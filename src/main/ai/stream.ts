import type { createAIConfigurationService } from './configuration';
import { AIError } from './error';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
import { author, bugs, license, productName, repository } from '../../../package.json';
import defaultAssistantPrompt from './default-assistant.md?raw';
import type { PromptInjectionContext } from './prompts';
import { renderPromptTemplate, resolvePromptTimeContext } from './prompts';

const promptMetadata: Omit<PromptInjectionContext, 'version' | 'timezone' | 'current_time'> = {
  product: productName,
  developer: author.name,
  license,
  repository: repository.url.replace(/\.git$/, ''),
  issues: bugs.url,
};

export interface CompatibleChatRequest extends Awaited<
  ReturnType<ReturnType<typeof createAIConfigurationService>['activeModel']>
> {
  version: string;
  prompt: string;
  signal?: AbortSignal;
}
interface StreamDependencies {
  fetchImpl?: typeof fetch;
  onDelta(content: string): void;
}

export async function streamCompatibleChat(
  request: CompatibleChatRequest,
  { fetchImpl, onDelta }: StreamDependencies,
): Promise<string> {
  const settings = {
    baseURL: request.endpoint.baseUrl.replace(/\/+$/, ''),
    apiKey: request.apiKey,
    ...(fetchImpl ? { fetch: fetchImpl } : {}),
  };
  const protocol = request.endpoint.protocol;
  const model =
    protocol === 'responses'
      ? createOpenAI(settings).responses(request.model.name)
      : protocol === 'anthropic'
        ? createAnthropic(settings)(request.model.name)
        : createOpenAICompatible({ ...settings, name: 'rippleNext' })(request.model.name);
  const customization = request.model.customization;
  const timeContext = resolvePromptTimeContext(request.timeZone);
  let streamError: unknown;
  const context = { ...promptMetadata, version: request.version, ...timeContext };
  const system = [
    renderPromptTemplate(customization.systemPrompt ?? defaultAssistantPrompt, context).trim(),
    ...customization.injections
      .filter((item) => item.enabled)
      .map((item) => renderPromptTemplate(item.text, context).trim()),
  ]
    .filter(Boolean)
    .join('\n\n');
  if (
    customization.contextLimitCharacters &&
    system.length + request.prompt.length > customization.contextLimitCharacters
  )
    throw new AIError('invalidAISettings', 'Configured context limit exceeded');
  const effort = customization.reasoningEffort;
  const providerOptions: NonNullable<Parameters<typeof streamText>[0]['providerOptions']> =
    protocol === 'responses'
      ? { openai: { store: false, ...(effort === 'default' ? {} : { reasoningEffort: effort }) } }
      : protocol === 'completion'
        ? { rippleNext: effort === 'default' ? {} : { reasoningEffort: effort } }
        : {
            anthropic: {
              ...(effort === 'default' ? {} : { effort }),
              ...(customization.thinkingMode === 'default'
                ? {}
                : {
                    thinking:
                      customization.thinkingMode === 'budget'
                        ? { type: 'enabled', budgetTokens: customization.thinkingBudget ?? 1024 }
                        : { type: customization.thinkingMode },
                  }),
            },
          };
  const budgetThinking = protocol === 'anthropic' && customization.thinkingMode === 'budget';
  const result = streamText({
    model,
    system,
    providerOptions,
    ...(customization.temperature === null ||
    (protocol === 'anthropic' && ['adaptive', 'budget'].includes(customization.thinkingMode))
      ? {}
      : { temperature: customization.temperature }),
    maxOutputTokens:
      customization.maxOutputTokens ??
      (budgetThinking ? (customization.thinkingBudget ?? 1024) + 4096 : undefined),
    prompt: request.prompt,
    abortSignal: request.signal,
    maxRetries: 0,
    onError({ error }) {
      streamError = error;
    },
  });

  for await (const text of result.textStream) {
    onDelta(text);
  }
  if (streamError) throw streamError;
  return result.text;
}
