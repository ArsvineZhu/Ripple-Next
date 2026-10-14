import { z } from 'zod';
import { QuickAppSchema, WorkflowSchema } from './launch';
import type { QuickApp, Workflow } from './launch';
import type { LanguagePreference } from './i18n';
import { DEFAULT_PAGE_ID, DEFAULT_PAGE_IDS, PageIdSchema } from './pages';
import { AIConfigurationSchema, defaultAIConfiguration } from './aiConfiguration';
import { GlassPreferencesSchema, defaultGlassPreferences } from './glassPreferences';
import { UiFontSchema } from './fonts';

const HourFormatSchema = z.enum(['12-hr', '24-hr']);
const WeatherUnitSchema = z.enum(['f', 'c']);
const IslandThemeSchema = z.enum(['default', 'sleek-black', 'win95']);
const PositionModeSchema = z.enum([
  'top-left',
  'top-center',
  'top-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
  'free',
]);
export type PositionMode = z.infer<typeof PositionModeSchema>;

function isValidTimeZone(value: string) {
  if (value === 'system') return true;
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

const AppSettingsSchema = z
  .object({
    ...GlassPreferencesSchema.shape,
    language: z.enum(['system', 'en', 'zh-CN', 'zh-TW', 'ja', 'zh-ms', 'zh-apple']),
    uiFont: UiFontSchema.default('default'),
    searchUrlTemplate: z.string().max(2048).default('https://www.google.com/search?q={query}'),
    ai: AIConfigurationSchema.default(defaultAIConfiguration),
    autoLaunch: z.boolean(),
    showTray: z.boolean(),
    batteryAlerts: z.boolean(),
    islandBorder: z.boolean(),
    islandCornerRadius: z.number().finite().min(0).max(60).default(30),
    standbyMode: z.boolean(),
    largeStandbyMode: z.boolean(),
    hideIslandWhenInactive: z.boolean(),
    showInfoWhenIdle: z.boolean(),
    hourFormat: HourFormatSchema,
    showAmPm: z.boolean().default(false),
    timeZone: z.string().min(1).max(128).refine(isValidTimeZone).default('system'),
    weatherUnit: WeatherUnitSchema,
    theme: IslandThemeSchema,
    backgroundColor: z.string(),
    textColor: z.string(),
    backgroundImage: z.string(),
    displayId: z.string().nullable(),
    weatherLocation: z.string(),
    weatherLocationParts: z
      .tuple([z.string().max(256), z.string().max(256), z.string().max(256)])
      .default(['', '', '']),
    useBuiltInWeatherApi: z.boolean().default(true),
    secretRevision: z.number().int().nonnegative().default(0),
    positionMode: PositionModeSchema,
    islandX: z.number().finite().min(0).max(100),
    islandY: z.number().finite().min(0).max(2000),
    defaultTabId: PageIdSchema,
    tabOrder: z
      .array(PageIdSchema)
      .min(1)
      .max(128)
      .refine((values) => new Set(values).size === values.length),
    hiddenTabs: z
      .array(PageIdSchema)
      .max(128)
      .refine((values) => new Set(values).size === values.length),
    leaveDelayMs: z.number().finite().min(0).max(2000),
  })
  .strict();
export type AppSettings = z.infer<typeof AppSettingsSchema>;

const AppStateSchema = z
  .object({
    settings: AppSettingsSchema,
    tasks: z.array(z.string()),
    workflows: z.array(WorkflowSchema),
    quickApps: z.array(QuickAppSchema),
  })
  .strict();
export type AppState = z.infer<typeof AppStateSchema>;

const AppStatePatchSchema = z
  .object({
    settings: AppSettingsSchema.partial().optional(),
    tasks: z.array(z.string()).optional(),
    workflows: z.array(WorkflowSchema).optional(),
    quickApps: z.array(QuickAppSchema).optional(),
  })
  .strict();
export type AppStatePatch = z.infer<typeof AppStatePatchSchema>;

export const defaultAppState: AppState = {
  settings: {
    ...defaultGlassPreferences,
    language: 'system' satisfies LanguagePreference,
    uiFont: 'default',
    searchUrlTemplate: 'https://www.google.com/search?q={query}',
    ai: defaultAIConfiguration(),
    autoLaunch: false,
    showTray: true,
    batteryAlerts: true,
    islandBorder: false,
    islandCornerRadius: 30,
    standbyMode: false,
    largeStandbyMode: false,
    hideIslandWhenInactive: false,
    showInfoWhenIdle: false,
    hourFormat: '12-hr',
    showAmPm: false,
    timeZone: 'system',
    weatherUnit: 'f',
    theme: 'default',
    backgroundColor: '#000000',
    textColor: '#FFFFFF',
    backgroundImage: 'none',
    displayId: null,
    weatherLocation: '',
    weatherLocationParts: ['', '', ''],
    useBuiltInWeatherApi: true,
    secretRevision: 0,
    positionMode: 'free',
    islandX: 50,
    islandY: 20,
    defaultTabId: DEFAULT_PAGE_ID,
    tabOrder: [...DEFAULT_PAGE_IDS],
    hiddenTabs: [],
    leaveDelayMs: 400,
  },
  tasks: [],
  workflows: [] as Workflow[],
  quickApps: [] as QuickApp[],
};

export function isAppState(value: unknown): value is AppState {
  return AppStateSchema.safeParse(value).success;
}

export function parseAppState(value: unknown): AppState | null {
  const result = AppStateSchema.safeParse(value);
  return result.success ? result.data : null;
}

export function isAppStatePatch(value: unknown): value is AppStatePatch {
  return AppStatePatchSchema.safeParse(value).success;
}
