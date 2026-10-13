import { z } from 'zod';

export const GlassPreferencesSchema = z.object({
  settingsGlassEnabled: z.boolean().default(true),
  islandGlassEnabled: z.literal(false).default(false),
  glassIor: z.number().min(1).max(2.5).default(1.5),
  glassRefraction: z.number().min(0).max(2).default(1),
  glassDispersion: z.number().min(0).max(0.2).default(0.06),
  glassBlur: z.number().min(0).max(12).default(3),
  glassSaturation: z.number().min(0).max(3).default(1.5),
  glassSpecular: z.number().min(0).max(2).default(1),
  glassElasticity: z.number().min(0).max(0.5).default(0.15),
  glassDragDeformation: z.boolean().default(false),
  glassSnapPixels: z.number().min(4).max(20).default(10),
});
export type GlassPreferences = z.infer<typeof GlassPreferencesSchema>;
export const defaultGlassPreferences = GlassPreferencesSchema.parse({});
