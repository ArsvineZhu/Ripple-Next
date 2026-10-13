import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { defaultCustomization } from '../../shared/aiConfiguration';
import type { AIProtocol, ModelCustomization } from '../../shared/aiConfiguration';
import { streamText } from 'ai';
import { author, bugs, license, productName, repository } from '../../../package.json';
import defaultAssistantPrompt from '../prompts/default-assistant.md?raw';
import type { PromptInjectionContext } from '../prompts/injections';
import { renderPromptTemplate, resolvePromptTimeContext } from '../prompts/injections';

const promptMetadata: Omit<PromptInjectionContext, 'version' | 'timezone' | 'current_time'> = {
  product: productName,
  developer: author.name,
  license,
  repository: repository.url.replace(/\.git$/, ''),
  issues: bugs.url,
};

export interface CompatibleChatRequest
  extends
    Pick<PromptInjectionContext, 'version'>,
    Partial<Pick<PromptInjectionContext, 'timezone' | 'current_time'>> {
  baseUrl: string;
  apiKey: string;
  model: string;
  prompt: string;
  signal?: AbortSignal;
  protocol?: AIProtocol;
  customization?: ModelCustomization;
}

interface StreamDependencies {
  fetchImpl?: typeof fetch;
  onDelta(content: string): void;
}

export async function streamCompatibleChat(
  request: CompatibleChatRequest,
  { fetchImpl, onDelta }: StreamDependencies,
): Promise<string> {
  let baseURL: URL;
  try {
    baseURL = new URL(request.baseUrl);
  } catch {
    throw new TypeError('Base URL is invalid');
  }
  if (!['http:', 'https:'].includes(baseURL.protocol)) {
    throw new TypeError('Base URL must use HTTP or HTTPS');
  }
  if (!request.model.trim()) throw new TypeError('Model is required');
  if (!request.apiKey.trim()) throw new TypeError('API key is required');

  const settings = {
    baseURL: request.baseUrl.replace(/\/+$/, ''),
    apiKey: request.apiKey,
    ...(fetchImpl ? { fetch: fetchImpl } : {}),
  };
  const protocol = request.protocol ?? 'completion';
  const model =
    protocol === 'responses'
      ? createOpenAI(settings).responses(request.model.trim())
      : protocol === 'anthropic'
        ? createAnthropic(settings)(request.model.trim())
        : createOpenAICompatible({ ...settings, name: 'rippleNext' })(request.model.trim());
  const customization = request.customization ?? defaultCustomization();
  const timeContext =
    request.timezone && request.current_time
      ? { timezone: request.timezone, current_time: request.current_time }
      : resolvePromptTimeContext(request.timezone ?? 'system');
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
    throw new TypeError('Configured context limit exceeded');
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

  let answer = '';
  for await (const text of result.textStream) {
    answer += text;
    onDelta(text);
  }
  if (streamError) throw streamError;
  return answer;
}
