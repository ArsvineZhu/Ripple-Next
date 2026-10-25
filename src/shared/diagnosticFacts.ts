import type { AIMutation, AIProtocol, ModelCustomizationPatch } from './aiConfiguration';
import type { AssistantResult } from './contracts';
import type { SerializedDiagnosticError } from './diagnosticError';
import { perceptionChannelIds } from './aiPerception';

export type DiagnosticSignificance = 'structural' | 'discrete' | 'continuous';
export interface OperationFacts {
  significance: DiagnosticSignificance;
  facts: string[];
}
export interface AssistantRunLog {
  result: AssistantResult;
  outcome: string;
  error?: SerializedDiagnosticError;
}
export interface AssistantRunFacts {
  status: 'complete' | 'cancelled' | 'error';
  modelId?: number;
  protocol?: AIProtocol;
  promptCharacters?: number;
  outputCharacters?: number;
  desktop?: 'off' | 'attached' | 'unavailable';
  vision?: 'unknown' | 'supported' | 'unsupported';
  inputTokens?: number;
  outputTokens?: number;
}

const discreteCustomization = ['vision', 'reasoningEffort', 'thinkingMode'] as const;
const continuousCustomization = [
  'temperature',
  'thinkingBudget',
  'maxOutputTokens',
  'contextLimitCharacters',
] as const;

function names(fields: Array<string | undefined>) {
  return fields.filter((field): field is string => field !== undefined);
}

function describeCustomization(id: number, patch: ModelCustomizationPatch): OperationFacts {
  const discrete = discreteCustomization.filter((key) => patch[key] !== undefined);
  if (discrete.length)
    return {
      significance: 'discrete',
      facts: discrete.map((key) => `${key}=${String(patch[key])}`),
    };
  const continuous = continuousCustomization.filter((key) => patch[key] !== undefined);
  return {
    significance: 'continuous',
    facts: [`customize-model id=${id}${continuous.length ? ' ' + continuous.join(',') : ''}`],
  };
}

/** Safe names, ids, enums and booleans. Text, labels, URLs and numbers stay out. */
export function describeAIMutation(mutation: AIMutation): OperationFacts {
  switch (mutation.kind) {
    case 'add-endpoint':
      return { significance: 'structural', facts: [`add-endpoint protocol=${mutation.protocol}`] };
    case 'edit-endpoint': {
      const fields = names([
        mutation.baseUrl !== undefined ? 'baseUrl' : undefined,
        mutation.label !== undefined ? 'label' : undefined,
      ]);
      return {
        significance: 'continuous',
        facts: [`edit-endpoint id=${mutation.id}${fields.length ? ' ' + fields.join(',') : ''}`],
      };
    }
    case 'remove-endpoint':
      return { significance: 'structural', facts: [`remove-endpoint id=${mutation.id}`] };
    case 'add-credential':
      return {
        significance: 'structural',
        facts: [`add-credential endpoint=${mutation.endpointId}`],
      };
    case 'edit-credential':
      return { significance: 'continuous', facts: [`edit-credential id=${mutation.id} label`] };
    case 'remove-credential':
      return { significance: 'structural', facts: [`remove-credential id=${mutation.id}`] };
    case 'add-model':
      return {
        significance: 'structural',
        facts: [`add-model endpoint=${mutation.endpointId} credential=${mutation.credentialId}`],
      };
    case 'edit-model': {
      const fields = names([
        mutation.name !== undefined ? 'name' : undefined,
        mutation.label !== undefined ? 'label' : undefined,
      ]);
      return fields.length
        ? {
            significance: 'continuous',
            facts: [`edit-model id=${mutation.id} ${fields.join(',')}`],
          }
        : {
            significance: 'structural',
            facts: [
              `edit-model id=${mutation.id} endpoint=${mutation.endpointId} credential=${mutation.credentialId}`,
            ],
          };
    }
    case 'remove-model':
      return { significance: 'structural', facts: [`remove-model id=${mutation.id}`] };
    case 'customize-model':
      return describeCustomization(mutation.id, mutation.customization);
    case 'select-model':
      return { significance: 'structural', facts: [`select-model id=${mutation.id ?? 'none'}`] };
    case 'edit-shared': {
      const channels = perceptionChannelIds.flatMap((channel) => {
        const enabled = mutation.perception?.[channel];
        return typeof enabled === 'boolean'
          ? [`perception.${channel}=${enabled ? 'on' : 'off'}`]
          : [];
      });
      if (channels.length) return { significance: 'discrete', facts: channels };
      if (mutation.instruction !== undefined)
        return { significance: 'continuous', facts: ['edit-shared instruction'] };
      return { significance: 'continuous', facts: ['edit-shared'] };
    }
    default: {
      const unreachable: never = mutation;
      return { significance: 'continuous', facts: [String(unreachable)] };
    }
  }
}

export function describeVisionProbe(
  status: 'supported' | 'unsupported' | 'inconclusive',
): OperationFacts {
  return { significance: 'discrete', facts: [status] };
}

export function describeAssistantRun(facts: AssistantRunFacts) {
  const parts: string[] = [facts.status];
  if (facts.modelId !== undefined) parts.push(`model=${facts.modelId}`);
  if (facts.protocol) parts.push(`protocol=${facts.protocol}`);
  if (facts.promptCharacters !== undefined) parts.push(`prompt=${facts.promptCharacters}`);
  if (facts.outputCharacters !== undefined) parts.push(`chars=${facts.outputCharacters}`);
  if (facts.desktop) parts.push(`desktop=${facts.desktop}`);
  if (facts.vision) parts.push(`vision=${facts.vision}`);
  if (facts.inputTokens !== undefined) parts.push(`in=${facts.inputTokens}`);
  if (facts.outputTokens !== undefined) parts.push(`out=${facts.outputTokens}`);
  return parts.join(' ');
}
