import { z } from 'zod';
import {
  defaultPerception,
  PerceptionPatchSchema,
  PerceptionSchema,
  VisionSchema,
} from './aiPerception';

const AIProtocolSchema = z.enum(['completion', 'responses', 'anthropic']);
export type AIProtocol = z.infer<typeof AIProtocolSchema>;
const Id = z.number().int().positive().max(2_147_483_647);
const ModelCustomizationObject = z
  .object({
    vision: VisionSchema.default('unknown'),
    temperature: z.number().finite().min(0).max(2).nullable().default(null),
    reasoningEffort: z
      .enum(['default', 'none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'])
      .default('default'),
    thinkingMode: z.enum(['default', 'adaptive', 'budget', 'disabled']).default('default'),
    thinkingBudget: z.number().int().min(1024).max(200_000).nullable().default(null),
    maxOutputTokens: z.number().int().positive().max(1_000_000).nullable().default(null),
    contextLimitCharacters: z.number().int().min(100).max(4_000_000).nullable().default(null),
  })
  .strict();

const ModelCustomizationSchema = ModelCustomizationObject;
export type ModelCustomization = z.infer<typeof ModelCustomizationSchema>;
const ModelCustomizationPatchSchema = z
  .object({
    vision: ModelCustomizationObject.shape.vision.removeDefault().optional(),
    temperature: ModelCustomizationObject.shape.temperature.removeDefault().optional(),
    reasoningEffort: ModelCustomizationObject.shape.reasoningEffort.removeDefault().optional(),
    thinkingMode: ModelCustomizationObject.shape.thinkingMode.removeDefault().optional(),
    thinkingBudget: ModelCustomizationObject.shape.thinkingBudget.removeDefault().optional(),
    maxOutputTokens: ModelCustomizationObject.shape.maxOutputTokens.removeDefault().optional(),
    contextLimitCharacters: ModelCustomizationObject.shape.contextLimitCharacters
      .removeDefault()
      .optional(),
  })
  .strict();
export type ModelCustomizationPatch = z.infer<typeof ModelCustomizationPatchSchema>;
const AIEndpointSchema = z
  .object({
    id: Id,
    protocol: AIProtocolSchema,
    label: z.string().max(128),
    baseUrl: z
      .url()
      .max(2048)
      .refine((value) => {
        const url = new URL(value);
        return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
      }, 'Base URL must be HTTP(S) without embedded credentials'),
  })
  .strict();
const AICredentialSchema = z
  .object({ id: Id, endpointId: Id, label: z.string().max(128) })
  .strict();
const AIModelSchema = z
  .object({
    id: Id,
    endpointId: Id,
    credentialId: Id.nullable(),
    name: z.string().trim().max(256),
    label: z.string().max(128),
    customization: ModelCustomizationSchema,
  })
  .strict();

const AIConfigurationObject = z
  .object({
    endpoints: z.array(AIEndpointSchema).max(128),
    credentials: z.array(AICredentialSchema).max(256),
    models: z.array(AIModelSchema).max(256),
    activeModelId: Id.nullable(),
    instruction: z.string().max(65_536).default(''),
    perception: PerceptionSchema.default(() => ({ ...defaultPerception })),
    nextId: z.object({ endpoint: Id, credential: Id, model: Id }).strict(),
  })
  .strict()
  .superRefine((value, context) => {
    for (const [name, entries, next] of [
      ['endpoints', value.endpoints, value.nextId.endpoint],
      ['credentials', value.credentials, value.nextId.credential],
      ['models', value.models, value.nextId.model],
    ] as const) {
      if (
        new Set(entries.map((item) => item.id)).size !== entries.length ||
        entries.some((item) => item.id >= next)
      )
        context.addIssue({
          code: 'custom',
          message: 'IDs must be unique and monotonic',
          path: [name],
        });
    }
    const endpoints = new Set(value.endpoints.map((item) => item.id));
    for (const key of value.credentials)
      if (!endpoints.has(key.endpointId))
        context.addIssue({
          code: 'custom',
          message: 'Credential endpoint is missing',
          path: ['credentials'],
        });
    for (const model of value.models) {
      const key = value.credentials.find((item) => item.id === model.credentialId);
      if (
        !endpoints.has(model.endpointId) ||
        (model.credentialId !== null && key?.endpointId !== model.endpointId)
      )
        context.addIssue({ code: 'custom', message: 'Model binding is invalid', path: ['models'] });
      const { thinkingBudget, maxOutputTokens } = model.customization;
      if (thinkingBudget && maxOutputTokens && thinkingBudget >= maxOutputTokens)
        context.addIssue({
          code: 'custom',
          message: 'Thinking budget must leave output room',
          path: ['models'],
        });
    }
    if (
      value.activeModelId !== null &&
      !value.models.some((item) => item.id === value.activeModelId)
    )
      context.addIssue({
        code: 'custom',
        message: 'Selected model is missing',
        path: ['activeModelId'],
      });
  });

export const AIConfigurationSchema = AIConfigurationObject;
export type AIConfiguration = z.infer<typeof AIConfigurationSchema>;

export function defaultAIConfiguration(): AIConfiguration {
  return {
    endpoints: [
      { id: 1, protocol: 'completion', label: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
    ],
    credentials: [],
    models: [],
    activeModelId: null,
    instruction: '',
    perception: { ...defaultPerception },
    nextId: { endpoint: 2, credential: 1, model: 1 },
  };
}
export function defaultCustomization(): ModelCustomization {
  return ModelCustomizationSchema.parse({});
}
export const defaultBaseUrls: Record<AIProtocol, string> = {
  completion: 'https://api.openai.com/v1',
  responses: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
};
export function aiSecretName(id: number) {
  return `ai-api-key:${Id.parse(id)}`;
}

export const AIMutationSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('add-endpoint'), protocol: AIProtocolSchema }).strict(),
  z
    .object({
      kind: z.literal('edit-endpoint'),
      id: Id,
      baseUrl: AIEndpointSchema.shape.baseUrl.optional(),
      label: z.string().max(128).optional(),
    })
    .strict(),
  z.object({ kind: z.literal('remove-endpoint'), id: Id }).strict(),
  z.object({ kind: z.literal('add-credential'), endpointId: Id }).strict(),
  z.object({ kind: z.literal('edit-credential'), id: Id, label: z.string().max(128) }).strict(),
  z.object({ kind: z.literal('remove-credential'), id: Id }).strict(),
  z.object({ kind: z.literal('add-model'), endpointId: Id, credentialId: Id }).strict(),
  z
    .object({
      kind: z.literal('edit-model'),
      id: Id,
      endpointId: Id,
      credentialId: Id,
      name: AIModelSchema.shape.name.optional(),
      label: z.string().max(128).optional(),
    })
    .strict(),
  z.object({ kind: z.literal('remove-model'), id: Id }).strict(),
  z
    .object({
      kind: z.literal('customize-model'),
      id: Id,
      customization: ModelCustomizationPatchSchema,
    })
    .strict(),
  z.object({ kind: z.literal('select-model'), id: Id.nullable() }).strict(),
  z
    .object({
      kind: z.literal('edit-shared'),
      instruction: z.string().max(65_536).optional(),
      perception: PerceptionPatchSchema.optional(),
    })
    .strict(),
]);
export type AIMutation = z.infer<typeof AIMutationSchema>;
