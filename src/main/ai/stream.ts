import type { createAIConfigurationService } from './configuration';
import { AIError } from './error';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { deflateSync, crc32 } from 'node:zlib';
import { generateText, NoOutputGeneratedError, streamText } from 'ai';
import type { AssistantBattery, Perception } from '../../shared/aiPerception';
import { disabledByUser, maskPerceptionFields } from '../../shared/aiPerception';
import type { WeatherPreferences, WeatherSnapshot } from '../../shared/weather';
import systemPrompt from './system.md?raw';
import userPrompt from './user.md?raw';
import type { PromptInjectionContext } from './prompts';
import { renderPromptTemplate, resolvePromptInjectionContext } from './prompts';

function pngChunk(type: string, data: Buffer) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, checksum]);
}

/** 64×64 so providers that reject tiny images still accept the probe. */
function createVisionProbePng(size = 64) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 2;
  const row = Buffer.alloc(1 + size * 3, 0xff);
  row[0] = 0;
  const raw = Buffer.concat(Array.from({ length: size }, () => row));
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

const visionProbePng = createVisionProbePng();

export interface CompatibleChatRequest extends Awaited<
  ReturnType<ReturnType<typeof createAIConfigurationService>['activeModel']>
> {
  version: string;
  prompt: string;
  locale: string;
  weatherPreferences: WeatherPreferences;
  weatherSnapshot?: WeatherSnapshot | null;
  diagnose?: string;
  battery?: AssistantBattery | null;
  settings?: string;
  instruction: string;
  perception: Perception;
  signal?: AbortSignal;
}
interface StreamDependencies {
  fetchImpl?: typeof fetch;
  captureDesktop?: () => Promise<Uint8Array | null>;
  onDelta(content: string): void;
}
export interface ChatStreamResult {
  text: string;
  desktop: 'off' | 'attached' | 'unavailable';
  protocol: CompatibleChatRequest['endpoint']['protocol'];
  usage?: { inputTokens?: number; outputTokens?: number };
}

async function readUsage(
  usage: PromiseLike<{ inputTokens?: number; outputTokens?: number }>,
): Promise<ChatStreamResult['usage']> {
  try {
    const tokens = await usage;
    const inputTokens = tokens.inputTokens;
    const outputTokens = tokens.outputTokens;
    if (typeof inputTokens !== 'number' && typeof outputTokens !== 'number') return undefined;
    return {
      ...(typeof inputTokens === 'number' ? { inputTokens } : {}),
      ...(typeof outputTokens === 'number' ? { outputTokens } : {}),
    };
  } catch {
    return undefined;
  }
}

function createChatModel(
  request: Pick<CompatibleChatRequest, 'endpoint' | 'apiKey' | 'model'>,
  fetchImpl?: typeof fetch,
) {
  const settings = {
    baseURL: request.endpoint.baseUrl.replace(/\/+$/, ''),
    apiKey: request.apiKey,
    ...(fetchImpl ? { fetch: fetchImpl } : {}),
  };
  const protocol = request.endpoint.protocol;
  return {
    protocol,
    model:
      protocol === 'responses'
        ? createOpenAI(settings).responses(request.model.name)
        : protocol === 'anthropic'
          ? createAnthropic(settings)(request.model.name)
          : createOpenAICompatible({ ...settings, name: 'rippleNext' })(request.model.name),
  };
}

export async function streamCompatibleChat(
  request: CompatibleChatRequest,
  { fetchImpl, captureDesktop, onDelta }: StreamDependencies,
): Promise<ChatStreamResult> {
  const { protocol, model } = createChatModel(request, fetchImpl);
  const customization = request.model.customization;
  let streamError: unknown;
  const context: PromptInjectionContext = await resolvePromptInjectionContext({
    version: request.version,
    timeZone: request.timeZone,
    locale: request.locale,
    user_input: request.prompt,
    weatherPreferences: request.weatherPreferences,
    weatherSnapshot: request.weatherSnapshot,
    diagnose: request.diagnose,
    battery: request.battery,
    settings: request.settings,
  });
  const perception = request.perception;
  const desktopRequested = perception.desktop && customization.vision === 'supported';
  let image: Uint8Array | null = null;
  if (desktopRequested) image = (await captureDesktop?.()) ?? null;
  const desktop = !desktopRequested ? 'off' : image ? 'attached' : 'unavailable';
  const masked = {
    ...context,
    ...maskPerceptionFields(
      perception,
      context,
      perception.desktop ? (image ? 'image' : 'unavailable') : 'disabled',
    ),
  };
  const instruction = renderPromptTemplate(request.instruction, {
    ...masked,
    customizations: disabledByUser,
  }).trim();
  const rendered = { ...masked, customizations: instruction || disabledByUser };
  const system = renderPromptTemplate(systemPrompt, rendered).trim();
  const prompt = renderPromptTemplate(userPrompt, rendered).trim();
  if (
    customization.contextLimitCharacters &&
    system.length + prompt.length > customization.contextLimitCharacters
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
    ...(image
      ? {
          messages: [
            {
              role: 'user' as const,
              content: [
                { type: 'text' as const, text: prompt },
                { type: 'file' as const, data: image, mediaType: 'image/png' },
              ],
            },
          ],
        }
      : { prompt }),
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
  const text = await result.text;
  const usage = await readUsage(result.usage);
  return { text, desktop, protocol, ...(usage ? { usage } : {}) };
}

const capabilityRejection =
  /does not support (images|image input|vision)|image input is not supported|only text|text-only|not a vision|vision is not supported|multimodal is not supported|不支持(?:图片|图像|视觉|多模态)(?:输入|理解)|仅支持文本/i;

export function classifyVisionProbeError(error: unknown): {
  status: 'supported' | 'unsupported' | 'inconclusive';
  detail?: string;
} {
  const cause = error instanceof Error ? error.cause : undefined;
  if (NoOutputGeneratedError.isInstance(error) && !(cause instanceof Error))
    return { status: 'supported' };
  const source = cause instanceof Error ? cause : error;
  const message = source instanceof Error ? source.message : String(source);
  return {
    status: capabilityRejection.test(message) ? 'unsupported' : 'inconclusive',
    detail: message.slice(0, 320),
  };
}

export async function probeVisionModel(
  request: Pick<CompatibleChatRequest, 'endpoint' | 'apiKey' | 'model'>,
  fetchImpl?: typeof fetch,
): Promise<{ status: 'supported' | 'unsupported' | 'inconclusive'; detail?: string }> {
  try {
    const { model } = createChatModel(request, fetchImpl);
    await generateText({
      model,
      maxOutputTokens: 1024,
      maxRetries: 0,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Reply with OK if you can see an image.' },
            { type: 'file', data: visionProbePng, mediaType: 'image/png' },
          ],
        },
      ],
    });
    return { status: 'supported' };
  } catch (error) {
    return classifyVisionProbeError(error);
  }
}
