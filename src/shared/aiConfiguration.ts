import { z } from 'zod';

const AIProtocolSchema = z.enum(['completion', 'responses', 'anthropic']);
export type AIProtocol = z.infer<typeof AIProtocolSchema>;
const Id = z.number().int().positive().max(2_147_483_647);
const InjectionSchema = z
  .object({
    id: z.string().min(1).max(128),
    name: z.string().max(128),
    text: z.string().max(65_536),
    enabled: z.boolean(),
  })
  .strict();
export const ModelCustomizationSchema = z
  .object({
    systemPrompt: z.string().max(65_536).nullable().default(null),
    injections: z.array(InjectionSchema).max(128).default([]),
    contextAwareness: z.literal(false).default(false),
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
export type ModelCustomization = z.infer<typeof ModelCustomizationSchema>;
const ModelCustomizationPatchSchema = z
  .object({
    systemPrompt: ModelCustomizationSchema.shape.systemPrompt.removeDefault().optional(),
    injections: ModelCustomizationSchema.shape.injections.removeDefault().optional(),
    contextAwareness: ModelCustomizationSchema.shape.contextAwareness.removeDefault().optional(),
    temperature: ModelCustomizationSchema.shape.temperature.removeDefault().optional(),
    reasoningEffort: ModelCustomizationSchema.shape.reasoningEffort.removeDefault().optional(),
    thinkingMode: ModelCustomizationSchema.shape.thinkingMode.removeDefault().optional(),
    thinkingBudget: ModelCustomizationSchema.shape.thinkingBudget.removeDefault().optional(),
    maxOutputTokens: ModelCustomizationSchema.shape.maxOutputTokens.removeDefault().optional(),
    contextLimitCharacters: ModelCustomizationSchema.shape.contextLimitCharacters
      .removeDefault()
      .optional(),
  })
  .strict();
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

export const AIConfigurationSchema = z
  .object({
    endpoints: z.array(AIEndpointSchema).max(128),
    credentials: z.array(AICredentialSchema).max(256),
    models: z.array(AIModelSchema).max(256),
    activeModelId: Id.nullable(),
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
      if (
        new Set(model.customization.injections.map((item) => item.id)).size !==
        model.customization.injections.length
      )
        context.addIssue({
          code: 'custom',
          message: 'Injection IDs must be unique',
          path: ['models'],
        });
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
export type AIConfiguration = z.infer<typeof AIConfigurationSchema>;

export function defaultAIConfiguration(): AIConfiguration {
  return {
    endpoints: [
      { id: 1, protocol: 'completion', label: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
    ],
    credentials: [],
    models: [],
    activeModelId: null,
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
  z.object({ kind: z.literal('add-injection'), id: Id }).strict(),
  z
    .object({
      kind: z.literal('edit-injection'),
      id: Id,
      injectionId: z.string().min(1).max(128),
      name: z.string().max(128).optional(),
      text: z.string().max(65536).optional(),
      enabled: z.boolean().optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('remove-injection'),
      id: Id,
      injectionId: z.string().min(1).max(128),
    })
    .strict(),
  z
    .object({
      kind: z.literal('move-injection'),
      id: Id,
      injectionId: z.string().min(1).max(128),
      direction: z.union([z.literal(-1), z.literal(1)]),
    })
    .strict(),
]);
export type AIMutation = z.infer<typeof AIMutationSchema>;
