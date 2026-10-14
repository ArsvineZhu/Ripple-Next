import { z } from 'zod';

export const UiFontSchema = z.enum(['default', 'system', 'alibaba-puhuiti']);
export type UiFont = z.infer<typeof UiFontSchema>;
export const uiFontLabels = {
  default: 'fontDefault',
  system: 'fontSystem',
  'alibaba-puhuiti': 'fontAlibaba',
} as const;
