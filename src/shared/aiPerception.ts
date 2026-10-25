import { z } from 'zod';

export const perceptionChannelIds = [
  'clock',
  'locale',
  'place',
  'host',
  'resources',
  'battery',
  'music',
  'weather',
  'diagnose',
  'settings',
  'desktop',
] as const;
export type PerceptionChannelId = (typeof perceptionChannelIds)[number];

export const defaultPerception: Record<PerceptionChannelId, boolean> = {
  clock: true,
  locale: true,
  place: true,
  host: true,
  resources: true,
  battery: true,
  music: true,
  weather: true,
  diagnose: true,
  settings: false,
  desktop: false,
};

export const PerceptionPatchSchema = z
  .object({
    clock: z.boolean().optional(),
    locale: z.boolean().optional(),
    place: z.boolean().optional(),
    host: z.boolean().optional(),
    resources: z.boolean().optional(),
    battery: z.boolean().optional(),
    music: z.boolean().optional(),
    weather: z.boolean().optional(),
    diagnose: z.boolean().optional(),
    settings: z.boolean().optional(),
    desktop: z.boolean().optional(),
  })
  .strict();

export const PerceptionSchema = z
  .object({
    clock: z.boolean().default(true),
    locale: z.boolean().default(true),
    place: z.boolean().default(true),
    host: z.boolean().default(true),
    resources: z.boolean().default(true),
    battery: z.boolean().default(true),
    music: z.boolean().default(true),
    weather: z.boolean().default(true),
    diagnose: z.boolean().default(true),
    settings: z.boolean().default(false),
    desktop: z.boolean().default(false),
  })
  .strict();
export type Perception = z.infer<typeof PerceptionSchema>;

export const VisionSchema = z.enum(['unknown', 'supported', 'unsupported']);

export const AssistantBatterySchema = z
  .object({
    percent: z.number().int().min(0).max(100).nullable(),
    charging: z.boolean(),
  })
  .strict();
export type AssistantBattery = z.infer<typeof AssistantBatterySchema>;

export function formatBatteryPrompt(battery: AssistantBattery | null | undefined) {
  if (!battery || battery.percent === null) return 'unavailable';
  return `${battery.percent}%, ${battery.charging ? 'charging' : 'on battery'}`;
}

export interface SettingsPromptSummary {
  language: string;
  theme: string;
  hourFormat: string;
  showAmPm: boolean;
  timeZone: string;
  weatherUnit: 'c' | 'f';
  weatherLocationMode: 'automatic' | 'manual';
  visiblePages: string[];
  fonts: string[];
  activeModel: string;
}

export function formatSettingsPrompt(summary: SettingsPromptSummary) {
  return [
    `Language: ${summary.language}`,
    `Theme: ${summary.theme}`,
    `Clock: ${summary.hourFormat}${summary.showAmPm ? ', AM/PM' : ''}`,
    `Time zone: ${summary.timeZone}`,
    `Weather: ${summary.weatherLocationMode}, °${summary.weatherUnit === 'c' ? 'C' : 'F'}`,
    `Visible pages: ${summary.visiblePages.join(', ') || 'none'}`,
    `Fonts: ${summary.fonts.join(', ') || 'none'}`,
    `Active model: ${summary.activeModel}`,
  ].join('\n');
}

export interface PerceptionPromptFields {
  timezone: string;
  current_time: string;
  locale: string;
  location: string;
  os: string;
  arch: string;
  memory: string;
  storage: string;
  network: string;
  battery: string;
  music: string;
  weather: string;
  temperature: string;
  diagnose: string;
  settings: string;
}

export const disabledByUser = 'Unavailable: Disabled by user.';

const attachedDesktop =
  'One frame of the display containing this application is attached. It is not stored by the application.';

export function maskPerceptionFields(
  perception: Perception,
  fields: PerceptionPromptFields,
  desktop: 'disabled' | 'image' | 'unavailable',
): PerceptionPromptFields & { desktop: string } {
  const shown = <T extends string>(enabled: boolean, value: T) =>
    enabled ? value : disabledByUser;
  return {
    timezone: shown(perception.clock, fields.timezone),
    current_time: shown(perception.clock, fields.current_time),
    locale: shown(perception.locale, fields.locale),
    location: shown(perception.place, fields.location),
    os: shown(perception.host, fields.os),
    arch: shown(perception.host, fields.arch),
    memory: shown(perception.resources, fields.memory),
    storage: shown(perception.resources, fields.storage),
    network: shown(perception.resources, fields.network),
    battery: shown(perception.battery, fields.battery),
    music: shown(perception.music, fields.music),
    weather: shown(perception.weather, fields.weather),
    temperature: shown(perception.weather, fields.temperature),
    diagnose: shown(perception.diagnose, fields.diagnose),
    settings: shown(perception.settings, fields.settings),
    desktop:
      desktop === 'disabled'
        ? disabledByUser
        : desktop === 'image'
          ? attachedDesktop
          : 'Unavailable.',
  };
}

export interface AssistantContextPreview {
  values: PerceptionPromptFields;
  settings: string;
}
