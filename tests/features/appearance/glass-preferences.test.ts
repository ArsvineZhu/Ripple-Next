import { expect, it } from 'vitest';
import {
  GlassPreferencesSchema,
  defaultGlassPreferences,
} from '../../../src/shared/glassPreferences';
import { defaultAppState, isAppStatePatch } from '../../../src/shared/appState';

it('shares the selected defaults and expanded parameter bounds with persistence', () => {
  expect(defaultGlassPreferences).toEqual({
    settingsGlassEnabled: true,
    islandGlassEnabled: false,
    glassIor: 2,
    glassRefraction: 1.5,
    glassDispersion: 0.08,
    glassBlur: 3,
    glassSaturation: 1.5,
    glassSpecular: 1,
    glassElasticity: 0.5,
    glassDragDeformation: true,
    glassSnapPixels: 20,
  });
  expect(defaultAppState.settings).toMatchObject(defaultGlassPreferences);
  expect(isAppStatePatch({ settings: { glassElasticity: 1, glassSnapPixels: 40 } })).toBe(true);
  expect(GlassPreferencesSchema.safeParse({ glassElasticity: 1.01 }).success).toBe(false);
  expect(GlassPreferencesSchema.safeParse({ glassSnapPixels: 41 }).success).toBe(false);
});
