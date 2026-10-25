import type { AssistantEvent, AssistantResult, NoticeCode } from '../../shared/contracts';
import type { AppSettings } from '../../shared/appState';
import type { WeatherSnapshot } from '../../shared/weather';
import type { MediaSnapshot } from '../../shared/media';
import { emptyMediaSnapshot, formatMediaPrompt } from '../../shared/media';
import type { AssistantBattery, AssistantContextPreview } from '../../shared/aiPerception';
import { formatSettingsPrompt } from '../../shared/aiPerception';
import { fontFamily } from '../../shared/fonts';
import { resolveLocale } from '../../shared/i18n';
import type { createAIConfigurationService } from './configuration';
import { captureIslandDisplay } from './desktopCapture';
import { probeVisionModel, streamCompatibleChat } from './stream';
import { AIError } from './error';
import { resolvePromptInjectionContext } from './prompts';
import { DiagnosticError, serializeDiagnosticError } from '../../shared/diagnosticError';
import type { SerializedDiagnosticError } from '../../shared/diagnosticError';
import {
  describeAssistantRun,
  type AssistantRunFacts,
  type AssistantRunLog,
} from '../../shared/diagnosticFacts';
import type { ChatStreamResult } from './stream';

interface AssistantDependencies {
  loadSettings(): Promise<AppSettings>;
  getWeather(preferences: AppSettings['weather']): Promise<WeatherSnapshot>;
  getDiagnoseSnapshot(): string;
  getSystemLocale(): string;
  getAppVersion(): string;
}

type Configuration = Pick<
  ReturnType<typeof createAIConfigurationService>,
  'activeModel' | 'modelBinding' | 'mutate'
>;

function settingsSummary(settings: AppSettings) {
  const hidden = new Set(settings.hiddenTabs);
  const model = settings.ai.models.find((item) => item.id === settings.ai.activeModelId);
  return formatSettingsPrompt({
    language: settings.language,
    theme: settings.theme,
    hourFormat: settings.hourFormat,
    showAmPm: settings.showAmPm,
    timeZone: settings.timeZone,
    weatherUnit: settings.weather.unit,
    weatherLocationMode: settings.weather.location.mode,
    visiblePages: settings.tabOrder.filter((id) => !hidden.has(id)),
    fonts: settings.uiFont.map((font) => fontFamily(font)),
    activeModel: model?.label || model?.name || 'none',
  });
}

function redact(detail: string | undefined, apiKey: string) {
  if (!detail) return undefined;
  return (apiKey ? detail.replaceAll(apiKey, '[redacted]') : detail).slice(0, 320);
}

function assistantError(code: NoticeCode, error?: unknown): SerializedDiagnosticError {
  const summary = serializeDiagnosticError(error ?? new DiagnosticError(code));
  const reason = summary.message;
  summary.message = reason && reason !== code ? `${code}; ${reason}` : code;
  return summary;
}

export function createAssistantService(
  configuration: Configuration,
  dependencies: AssistantDependencies,
) {
  const requests = new Map<string, AbortController>();
  let readMedia: () => Promise<MediaSnapshot> = async () => emptyMediaSnapshot;
  const cancel = (id: string) => {
    requests.get(id)?.abort();
    requests.delete(id);
  };
  const contextInput = async (battery: AssistantBattery, userInput = '') => {
    const settings = await dependencies.loadSettings();
    const weatherSnapshot = await dependencies.getWeather(settings.weather).catch(() => null);
    const media = await readMedia().catch(() => emptyMediaSnapshot);
    return {
      settings,
      weatherSnapshot,
      summary: settingsSummary(settings),
      resolved: await resolvePromptInjectionContext({
        version: dependencies.getAppVersion(),
        timeZone: settings.timeZone,
        locale: resolveLocale(settings.language, dependencies.getSystemLocale()),
        user_input: userInput,
        weatherPreferences: settings.weather,
        weatherSnapshot,
        diagnose: dependencies.getDiagnoseSnapshot(),
        battery,
        music: formatMediaPrompt(media),
        settings: settingsSummary(settings),
      }),
    };
  };
  return {
    cancel,
    useMedia(read: () => Promise<MediaSnapshot>) {
      readMedia = read;
    },
    async preview(battery: AssistantBattery): Promise<AssistantContextPreview> {
      const { resolved, summary } = await contextInput(battery);
      return {
        settings: summary,
        values: {
          timezone: resolved.timezone,
          current_time: resolved.current_time,
          locale: resolved.locale,
          location: resolved.location,
          os: resolved.os,
          arch: resolved.arch,
          memory: resolved.memory,
          storage: resolved.storage,
          network: resolved.network,
          battery: resolved.battery,
          music: resolved.music,
          weather: resolved.weather,
          temperature: resolved.temperature,
          diagnose: resolved.diagnose,
          settings: resolved.settings,
        },
      };
    },
    async probeVision(modelId: number) {
      const binding = await configuration.modelBinding(modelId);
      const result = await probeVisionModel(binding);
      const detail = redact(result.detail, binding.apiKey);
      if (result.status === 'inconclusive') return { status: result.status, detail };
      const saved = await configuration.mutate({
        kind: 'customize-model',
        id: modelId,
        customization: { vision: result.status },
      });
      return { status: result.status, detail, state: saved.state };
    },
    async start(
      requestId: string,
      prompt: string,
      battery: AssistantBattery,
      send: (event: AssistantEvent) => void,
    ): Promise<AssistantRunLog> {
      cancel(requestId);
      const controller = new AbortController();
      requests.set(requestId, controller);
      let apiKey = '';
      const known: Omit<AssistantRunFacts, 'status'> = { promptCharacters: prompt.length };
      const finish = (
        status: AssistantRunFacts['status'],
        extra?: {
          result: AssistantResult;
          error?: SerializedDiagnosticError;
          outputCharacters?: number;
          usage?: ChatStreamResult['usage'];
        },
      ): AssistantRunLog => {
        const outcome = describeAssistantRun({
          status,
          ...known,
          ...(extra?.outputCharacters !== undefined
            ? { outputCharacters: extra.outputCharacters }
            : {}),
          ...(typeof extra?.usage?.inputTokens === 'number'
            ? { inputTokens: extra.usage.inputTokens }
            : {}),
          ...(typeof extra?.usage?.outputTokens === 'number'
            ? { outputTokens: extra.usage.outputTokens }
            : {}),
        });
        const result = extra?.result ?? { status: 'cancelled' as const };
        return extra?.error ? { result, outcome, error: extra.error } : { result, outcome };
      };
      try {
        const model = await configuration.activeModel();
        apiKey = model.apiKey;
        known.modelId = model.model.id;
        known.protocol = model.endpoint.protocol;
        known.vision = model.model.customization.vision;
        const prepared = await contextInput(battery, prompt);
        if (controller.signal.aborted) return finish('cancelled');
        if (!(
          prepared.settings.ai.perception.desktop &&
          model.model.customization.vision === 'supported'
        ))
          known.desktop = 'off';
        const streamed = await streamCompatibleChat(
          {
            ...model,
            version: dependencies.getAppVersion(),
            prompt,
            locale: prepared.resolved.locale,
            weatherPreferences: prepared.settings.weather,
            weatherSnapshot: prepared.weatherSnapshot,
            diagnose: prepared.resolved.diagnose,
            battery,
            settings: prepared.summary,
            instruction: prepared.settings.ai.instruction,
            perception: prepared.settings.ai.perception,
            signal: controller.signal,
          },
          {
            captureDesktop: captureIslandDisplay,
            onDelta: (content) => {
              if (!controller.signal.aborted) send({ requestId, content });
            },
          },
        );
        known.desktop = streamed.desktop;
        if (controller.signal.aborted)
          return finish('cancelled', {
            result: { status: 'cancelled' },
            outputCharacters: streamed.text.length,
            usage: streamed.usage,
          });
        if (!streamed.text)
          return finish('error', {
            result: { status: 'error', code: 'noAiResponse' },
            error: assistantError('noAiResponse'),
            usage: streamed.usage,
          });
        return finish('complete', {
          result: { status: 'complete', text: streamed.text },
          outputCharacters: streamed.text.length,
          usage: streamed.usage,
        });
      } catch (error) {
        if (controller.signal.aborted) return finish('cancelled');
        const code = error instanceof AIError ? error.code : 'aiRequestFailed';
        const message = error instanceof Error ? error.message : String(error);
        return finish('error', {
          result: { status: 'error', code, detail: redact(message, apiKey) },
          error: assistantError(code, error),
        });
      } finally {
        if (requests.get(requestId) === controller) requests.delete(requestId);
      }
    },
  };
}
