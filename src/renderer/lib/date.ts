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
  const period = new Intl.DateTimeFormat('en-US', options)
    .formatToParts(input)
    .find((part) => part.type === 'dayPeriod')?.value;
  return `${text} ${period === 'AM' ? 'A.M.' : 'P.M.'}`;
}
