export function formatDateShort(
  locale: string,
  input?: string | number | Date,
  timeZone = 'system',
) {
  const date = input === undefined ? new Date() : new Date(input);
  const formatted = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(timeZone === 'system' ? {} : { timeZone }),
  }).format(date);
  if (!['zh', 'ja'].includes(new Intl.Locale(locale).language)) return formatted;
  return formatted
    .replace(/(\d)([月日])/g, '$1 $2')
    .replace(/([月日])(\d)/g, '$1 $2')
    .replace(/日(?=\S)/g, '日 ');
}
export const supportedTimeZones = [
  'UTC',
  ...(typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []),
].filter((timeZone, index, values) => values.indexOf(timeZone) === index);

export function formatTime(
  locale: string,
  hour12: boolean,
  input: Date,
  timeZone = 'system',
  showAmPm = false,
) {
  const options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: hour12 ? 'h12' : 'h23',
    ...(timeZone === 'system' ? {} : { timeZone }),
  };
  const parts = new Intl.DateTimeFormat(locale, options).formatToParts(input);
  const text = parts
    .filter((part) => part.type !== 'dayPeriod')
    .map((part) => part.value)
    .join('')
    .trim();
  if (!hour12 || !showAmPm) return text;
  return parts
    .map((part) => {
      if (part.type !== 'dayPeriod') return part.value;
      return new Intl.Locale(locale).language === 'en'
        ? part.value === 'AM'
          ? 'A.M.'
          : 'P.M.'
        : part.value;
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The expanded clock keeps the period at the smaller date hierarchy. */
export function formatOverviewDate(
  locale: string,
  input: Date,
  timeZone = 'system',
  showPeriod = false,
) {
  const zone = timeZone === 'system' ? {} : { timeZone };
  const language = new Intl.Locale(locale).language;
  let date = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...zone,
  }).format(input);
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short', ...zone }).format(input);
  const period = showPeriod
    ? new Intl.DateTimeFormat(locale, { hour: 'numeric', hourCycle: 'h12', ...zone })
        .formatToParts(input)
        .find((part) => part.type === 'dayPeriod')?.value
    : undefined;
  if (['zh', 'ja'].includes(language)) {
    date = date.replace(/(\d)([年月日])/g, '$1 $2').replace(/([年月日])(\d)/g, '$1 $2');
    return `${date}${period ? ` ${period}` : ''} · ${weekday}`;
  }
  return `${period ? `${period} · ` : ''}${weekday}, ${date}`;
}
