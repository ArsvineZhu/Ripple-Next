import { z } from 'zod';

export const uiFontLabels = {
  default: 'fontDefault',
  system: 'fontSystem',
  openrunde: 'fontOpenRunde',
} as const;
export const uiFontChoices = ['default', 'system', 'openrunde'] as const;
const familyName = z
  .string()
  .trim()
  .min(1)
  .max(256)
  .refine((name) => [...name].every((character) => character.charCodeAt(0) >= 32));
const FileFontFaceSchema = z
  .object({
    id: z.string().regex(/^[a-f0-9]{64}$/),
    weight: z
      .tuple([z.number().min(1).max(1000), z.number().min(1).max(1000)])
      .refine(([min, max]) => min <= max),
    style: z.enum(['normal', 'italic', 'oblique']),
  })
  .strict();
export const FontChoiceSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('builtin'), id: z.enum(uiFontChoices) }).strict(),
  z.object({ kind: z.literal('system'), family: familyName }).strict(),
  z
    .object({
      kind: z.literal('file'),
      family: familyName,
      faces: z.array(FileFontFaceSchema).min(1).max(32),
    })
    .strict(),
]);
export type FontChoice = z.infer<typeof FontChoiceSchema>;
export type FileFontChoice = Extract<FontChoice, { kind: 'file' }>;
export const defaultUIFont: FontChoice[] = [{ kind: 'builtin', id: 'default' }];
export const UiFontSchema = z.preprocess(
  (value) => (typeof value === 'string' ? [{ kind: 'builtin', id: value }] : value),
  z
    .array(FontChoiceSchema)
    .min(1)
    .max(32)
    .refine((fonts) => new Set(fonts.map(fontChoiceKey)).size === fonts.length),
);
export interface FontImportResult {
  fonts: FileFontChoice[];
  errors: { file: string; message: string }[];
}
export function fontChoiceKey(font: FontChoice): string {
  return font.kind === 'builtin' ? `builtin:${font.id}` : `${font.kind}:${font.family}`;
}
export function fontFamily(font: FontChoice): string {
  if (font.kind === 'builtin')
    return { default: 'Alibaba PuHuiTi 3', system: 'system-ui', openrunde: 'OpenRunde' }[font.id];
  return font.kind === 'file' ? `RippleFont_${font.faces[0].id}` : font.family;
}
export function fontStack(fonts: readonly FontChoice[]): string {
  return fonts
    .map((font) =>
      font.kind === 'builtin' && font.id === 'system'
        ? 'system-ui'
        : JSON.stringify(fontFamily(font)),
    )
    .join(', ');
}
export function fontFileUrl(id: string): string {
  return `ripple-font://font/${id}`;
}
export function appendFonts(
  current: readonly FontChoice[],
  additions: readonly FontChoice[],
): FontChoice[] {
  const result = [...current];
  for (const font of additions) {
    const index = result.findIndex((existing) => fontChoiceKey(existing) === fontChoiceKey(font));
    if (index < 0) result.push(font);
    else if (font.kind === 'file') {
      const previous = result[index];
      if (previous.kind === 'file')
        result[index] = {
          ...previous,
          faces: [
            ...previous.faces,
            ...font.faces.filter((face) => !previous.faces.some((old) => old.id === face.id)),
          ],
        };
    }
  }
  return result;
}
