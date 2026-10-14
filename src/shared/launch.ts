import { z } from 'zod';

const ApplicationSchema = z
  .object({
    kind: z.literal('application'),
    name: z.string().min(1),
    native: z
      .object({ platform: z.enum(['win32', 'darwin', 'linux']), identifier: z.string().min(1) })
      .strict()
      .optional(),
  })
  .strict();
export type Application = z.infer<typeof ApplicationSchema>;
const LaunchTargetSchema = z.discriminatedUnion('kind', [
  ApplicationSchema,
  z
    .object({
      kind: z.literal('command'),
      executable: z.string().min(1),
      args: z.array(z.string()).max(128),
      workingDirectory: z.string().min(1).optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('url'),
      url: z
        .url()
        .refine((value) => ['http:', 'https:', 'file:'].includes(new URL(value).protocol)),
    })
    .strict(),
]);
export type LaunchTarget = z.infer<typeof LaunchTargetSchema>;
export const LaunchTargetsSchema = z.array(LaunchTargetSchema);
export interface LaunchResult {
  failures: { index: number; detail: string }[];
}
export const QuickAppSchema = z
  .object({ id: z.string().min(1), name: z.string().min(1), target: LaunchTargetSchema })
  .strict();
export type QuickApp = z.infer<typeof QuickAppSchema>;
export const WorkflowSchema = z
  .object({ name: z.string().min(1), targets: LaunchTargetsSchema })
  .strict();
export type Workflow = z.infer<typeof WorkflowSchema>;

/** Free-form editing resolves the target kind once, before it is persisted. */
export function parseLaunchTarget(input: string): LaunchTarget | null {
  const value = input.trim();
  if (!value) return null;
  let url = value;
  if (/^(localhost|(?:\d{1,3}\.){3}\d{1,3})(:\d+)?([/?#].*)?$/i.test(value))
    url = `http://${value}`;
  else if (/^[a-z0-9.-]+\.[a-z]{2,}([/?#].*)?$/i.test(value) && !/\.exe$/i.test(value))
    url = `https://${value}`;
  if (/^(https?|file):\/\//i.test(url)) {
    const parsed = LaunchTargetSchema.safeParse({ kind: 'url', url });
    return parsed.success ? parsed.data : null;
  }
  return { kind: 'application', name: value };
}

export function launchTargetText(target: LaunchTarget): string {
  switch (target.kind) {
    case 'url':
      return target.url;
    case 'application':
      return target.name;
    case 'command':
      return target.executable;
  }
}
