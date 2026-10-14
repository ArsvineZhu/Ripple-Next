import { z } from 'zod';

export const UiFontSchema = z.enum(['default', 'system', 'alibaba-puhuiti', 'openrunde']);
export type UiFont = z.infer<typeof UiFontSchema>;
export const uiFontLabels = {
  default: 'fontDefault',
  system: 'fontSystem',
  'alibaba-puhuiti': 'fontDefault',
  openrunde: 'fontOpenRunde',
} as const;

export const uiFontChoices = ['default', 'system', 'openrunde'] as const;
