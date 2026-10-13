import { createContext, useContext } from 'react';
import { defaultGlassPreferences } from '../../../shared/glassPreferences';
import type { GlassPreferences } from '../../../shared/glassPreferences';

// The experimental Island material stays unavailable; Settings provides its own preferences.
export const GlassPreferencesContext = createContext<GlassPreferences>({
  ...defaultGlassPreferences,
  settingsGlassEnabled: false,
});
export function useGlassPreferences() {
  return useContext(GlassPreferencesContext);
}
