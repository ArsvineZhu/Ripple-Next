import { promises as fs } from 'node:fs';
import os from 'node:os';
import { bugs, license, productName, repository } from '../../../package.json';
import type { PromptInjectionName } from '../../shared/aiPromptVariables';
import { formatBatteryPrompt, type AssistantBattery } from '../../shared/aiPerception';
import { formatDeveloperRoster, productWebsite } from '../../shared/productCredits';
import type { WeatherPreferences, WeatherSnapshot } from '../../shared/weather';

export interface PromptInjectionContext {
  product: string;
  version: string;
  developer: string;
  license: string;
  repository: string;
  website: string;
  tracker: string;
  timezone: string;
  current_time: string;
  locale: string;
  location: string;
  os: string;
  arch: string;
  weather: string;
  temperature: string;
  memory: string;
  storage: string;
  network: string;
  battery: string;
  music: string;
  diagnose: string;
  settings: string;
  desktop: string;
  customizations: string;
  user_input: string;
}

function resolvePromptTimeContext(
  timeZonePreference: string,
  now = new Date(),
): Pick<PromptInjectionContext, 'timezone' | 'current_time'> {
  const timezone =
    timeZonePreference === 'system'
      ? new Intl.DateTimeFormat().resolvedOptions().timeZone
      : timeZonePreference;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => {
    const part = parts.find((item) => item.type === type)?.value;
    if (!part) throw new Error(`Unable to format current time: missing ${type}`);
    return part;
  };

  return {
    timezone,
    current_time: `${value('year')}-${value('month')}-${value('day')} ${value('hour')}:${value('minute')}:${value('second')}`,
  };
}

function formatBytes(value: number) {
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'] as const;
  let amount = value;
  let index = 0;
  while (amount >= 1024 && index < units.length - 1) {
    amount /= 1024;
    index += 1;
  }
  return `${amount.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatNetwork() {
  const addresses = Object.entries(os.networkInterfaces()).flatMap(([name, entries]) =>
    (entries ?? [])
      .filter((entry) => entry.family === 'IPv4' && !entry.internal)
      .map((entry) => `${name} ${entry.address}`),
  );
  return addresses.length > 0 ? addresses.join(', ') : 'unavailable';
}

async function formatStorage(path: string) {
  try {
    const stats = await fs.statfs(path);
    const total = Number(stats.blocks) * Number(stats.bsize);
    const free = Number(stats.bavail) * Number(stats.bsize);
    if (!Number.isFinite(total) || !Number.isFinite(free) || total <= 0) return 'unavailable';
    return `${formatBytes(free)} free / ${formatBytes(total)} total`;
  } catch {
    return 'unavailable';
  }
}

function formatWeatherPromptFields(
  preferences: WeatherPreferences,
  snapshot: WeatherSnapshot | null,
): Pick<PromptInjectionContext, 'weather' | 'temperature' | 'location'> {
  const configured =
    preferences.location.mode === 'automatic'
      ? 'automatic'
      : [preferences.location.city, preferences.location.region, preferences.location.country]
          .map((value) => value.trim())
          .filter(Boolean)
          .join(', ');
  const resolved = snapshot?.location
    ? [snapshot.location.city, snapshot.location.region, snapshot.location.country]
        .map((value) => value.trim())
        .filter(Boolean)
        .join(', ')
    : '';
  const location = resolved || configured || 'unavailable';
  if (!snapshot?.reading) {
    return {
      weather: snapshot?.error ?? 'unavailable',
      temperature: 'unavailable',
      location,
    };
  }
  const unit = preferences.unit === 'c' ? 'C' : 'F';
  return {
    weather: snapshot.reading.status,
    temperature: `${snapshot.reading.temp}°${unit}`,
    location,
  };
}

async function resolveHostPromptContext(
  storagePath = os.homedir(),
): Promise<Pick<PromptInjectionContext, 'os' | 'arch' | 'memory' | 'storage' | 'network'>> {
  return {
    os: `${process.platform} ${os.release()}`,
    arch: process.arch,
    memory: `${formatBytes(os.freemem())} free / ${formatBytes(os.totalmem())} total`,
    storage: await formatStorage(storagePath),
    network: formatNetwork(),
  };
}

const promptMetadata = {
  product: productName,
  developer: formatDeveloperRoster(),
  license,
  repository: repository.url.replace(/\.git$/, ''),
  website: productWebsite,
  tracker: bugs.url,
} as const;

export async function resolvePromptInjectionContext(input: {
  version: string;
  timeZone: string;
  locale: string;
  user_input: string;
  weatherPreferences: WeatherPreferences;
  weatherSnapshot?: WeatherSnapshot | null;
  diagnose?: string;
  battery?: AssistantBattery | null;
  music?: string;
  settings?: string;
  storagePath?: string;
  now?: Date;
}): Promise<PromptInjectionContext> {
  const time = resolvePromptTimeContext(input.timeZone, input.now);
  const host = await resolveHostPromptContext(input.storagePath);
  const weather = formatWeatherPromptFields(
    input.weatherPreferences,
    input.weatherSnapshot ?? null,
  );
  return {
    ...promptMetadata,
    ...time,
    ...host,
    ...weather,
    version: input.version,
    locale: input.locale,
    user_input: input.user_input,
    battery: formatBatteryPrompt(input.battery),
    music: input.music?.trim() || 'idle',
    diagnose: input.diagnose?.trim() || 'unavailable',
    settings: input.settings?.trim() || 'unavailable',
    desktop: 'Unavailable.',
    customizations: 'Unavailable: Disabled by user.',
  };
}

interface PromptInjectionDefinition {
  description: string;
  resolve(context: PromptInjectionContext): string;
}

const PROMPT_INJECTION_TABLE = {
  product: {
    description: 'Ripple Next product name',
    resolve: ({ product }) => product,
  },
  version: {
    description: 'Ripple Next application version',
    resolve: ({ version }) => version,
  },
  developer: {
    description: 'Application developer',
    resolve: ({ developer }) => developer,
  },
  license: {
    description: 'Application license',
    resolve: ({ license }) => license,
  },
  repository: {
    description: 'Source repository URL',
    resolve: ({ repository }) => repository,
  },
  website: {
    description: 'Product website',
    resolve: ({ website }) => website,
  },
  tracker: {
    description: 'Issue tracker URL',
    resolve: ({ tracker }) => tracker,
  },
  timezone: {
    description: 'Current timezone',
    resolve: ({ timezone }) => timezone,
  },
  current_time: {
    description: 'Current time in the format "YYYY-MM-DD HH:mm:ss"',
    resolve: ({ current_time }) => current_time,
  },
  locale: {
    description: 'Application UI locale',
    resolve: ({ locale }) => locale,
  },
  location: {
    description: 'Configured or resolved weather location',
    resolve: ({ location }) => location,
  },
  os: {
    description: 'Operating system platform and release',
    resolve: ({ os }) => os,
  },
  arch: {
    description: 'CPU architecture',
    resolve: ({ arch }) => arch,
  },
  weather: {
    description: 'Current weather condition',
    resolve: ({ weather }) => weather,
  },
  temperature: {
    description: 'Current weather temperature',
    resolve: ({ temperature }) => temperature,
  },
  memory: {
    description: 'Host memory free and total',
    resolve: ({ memory }) => memory,
  },
  storage: {
    description: 'Host storage free and total',
    resolve: ({ storage }) => storage,
  },
  network: {
    description: 'Host IPv4 network interfaces',
    resolve: ({ network }) => network,
  },
  battery: {
    description: 'Battery level and charging state',
    resolve: ({ battery }) => battery,
  },
  music: {
    description: 'Current music session',
    resolve: ({ music }) => music,
  },
  diagnose: {
    description: 'Current application diagnostic snapshot',
    resolve: ({ diagnose }) => diagnose,
  },
  settings: {
    description: 'Sanitized application preference summary',
    resolve: ({ settings }) => settings,
  },
  desktop: {
    description: 'Desktop frame status for this request',
    resolve: ({ desktop }) => desktop,
  },
  customizations: {
    description: 'Enabled personal instructions',
    resolve: ({ customizations }) => customizations,
  },
  user_input: {
    description: 'Current user request text',
    resolve: ({ user_input }) => user_input,
  },
} satisfies Record<PromptInjectionName, PromptInjectionDefinition>;

const placeholderPattern = /\{\{\s*([a-z][a-z\d_.-]*)\s*\}\}/g;

/** Keep injected text from closing a section tag or a surrounding code fence. */
function protectTemplateDelimiters(value: string) {
  return value.replaceAll('<!--', '< !--').replaceAll('```', '``\u200b`');
}

export function renderPromptTemplate(template: string, context: PromptInjectionContext): string {
  return template.replace(placeholderPattern, (placeholder, name: string) => {
    const injection = PROMPT_INJECTION_TABLE[name as keyof typeof PROMPT_INJECTION_TABLE];
    return injection ? protectTemplateDelimiters(injection.resolve(context)) : placeholder;
  });
}
