import { z } from 'zod';
import { QuickAppSchema, WorkflowSchema } from './contracts';
import type { QuickApp, Workflow } from './contracts';
import type { LanguagePreference } from './i18n';
import { DEFAULT_PAGE_ID, DEFAULT_PAGE_IDS, PageIdSchema } from './pages';

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
    language: z.enum(['system', 'en', 'zh-CN', 'zh-TW', 'ja']),
    searchUrlTemplate: z.string().max(2048).default('https://www.google.com/search?q={query}'),
    aiBaseUrl: z.string().max(2048),
    aiModel: z.string(),
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
    welcomeShown: z.boolean(),
  })
  .strict();
export type AppSettings = z.infer<typeof AppSettingsSchema>;

const AppStateSchema = z
  .object({
    schemaVersion: z.literal(1),
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
  schemaVersion: 1,
  settings: {
    language: 'system' satisfies LanguagePreference,
    searchUrlTemplate: 'https://www.google.com/search?q={query}',
    aiBaseUrl: 'https://api.openai.com/v1',
    aiModel: '',
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
    positionMode: 'free',
    islandX: 50,
    islandY: 20,
    defaultTabId: DEFAULT_PAGE_ID,
    tabOrder: [...DEFAULT_PAGE_IDS],
    hiddenTabs: [],
    leaveDelayMs: 400,
    welcomeShown: false,
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
