import { z } from 'zod';

export const UiFontSchema = z.enum(['default', 'system', 'openrunde']);
export const uiFontLabels = {
  default: 'fontDefault',
  system: 'fontSystem',
  openrunde: 'fontOpenRunde',
} as const;

export const uiFontChoices = ['default', 'system', 'openrunde'] as const;
