import {
  BookOpen,
  Settings2,
  Palette,
  MousePointer2,
  LayoutGrid,
  Workflow,
  Plug,
  Info,
} from 'lucide-react';

export const SETTINGS_CATEGORIES = [
  { id: 'guide', labelKey: 'settingsNavGuide', icon: BookOpen },
  { id: 'general', labelKey: 'settingsNavGeneral', icon: Settings2 },
  { id: 'appearance', labelKey: 'settingsNavAppearance', icon: Palette },
  { id: 'behavior', labelKey: 'settingsNavBehavior', icon: MousePointer2 },
  { id: 'pages', labelKey: 'settingsNavPages', icon: LayoutGrid },
  { id: 'shortcuts', labelKey: 'settingsNavShortcuts', icon: Workflow },
  { id: 'integrations', labelKey: 'settingsNavIntegrations', icon: Plug },
  { id: 'about', labelKey: 'settingsNavAbout', icon: Info },
] as const;

export type SettingsCategoryId = (typeof SETTINGS_CATEGORIES)[number]['id'];
