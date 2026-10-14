export interface PromptInjectionContext {
  product: string;
  version: string;
  developer: string;
  license: string;
  repository: string;
  issues: string;
  timezone: string;
  current_time: string;
}

export function resolvePromptTimeContext(
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
  issues: {
    description: 'Issue tracker URL',
    resolve: ({ issues }) => issues,
  },
  timezone: {
    description: 'Current timezone',
    resolve: ({ timezone }) => timezone,
  },
  current_time: {
    description: 'Current time in the format "YYYY-MM-DD HH:mm:ss"',
    resolve: ({ current_time }) => current_time,
  },
} satisfies Record<string, PromptInjectionDefinition>;

const placeholderPattern = /\{\{\s*([a-z][a-z\d_.-]*)\s*\}\}/g;

export function renderPromptTemplate(template: string, context: PromptInjectionContext): string {
  return template.replace(placeholderPattern, (placeholder, name: string) => {
    const injection = PROMPT_INJECTION_TABLE[name as keyof typeof PROMPT_INJECTION_TABLE];
    return injection ? injection.resolve(context) : placeholder;
  });
}
