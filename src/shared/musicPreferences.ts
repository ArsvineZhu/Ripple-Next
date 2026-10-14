import { z } from 'zod';
export const MusicPreferencesSchema = z
  .object({
    artwork3D: z.boolean().default(true),
    artworkStrength: z.number().finite().min(0).max(2).default(1),
    marquee: z.boolean().default(true),
    idleArtist: z.boolean().default(true),
  })
  .strict();
export type MusicPreferences = z.infer<typeof MusicPreferencesSchema>;
export const defaultMusicPreferences: MusicPreferences = MusicPreferencesSchema.parse({});
