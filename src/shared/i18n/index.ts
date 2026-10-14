import { en } from './en';
import { zhCN } from './zh-CN';
import { zhTW } from './zh-TW';
import { ja } from './ja';
import { zhMS } from './zh-ms';
import { zhApple } from './zh-apple';
const locales = ['en', 'zh-CN', 'zh-TW', 'ja', 'zh-ms', 'zh-apple'] as const;
export type Locale = (typeof locales)[number];
export type LanguagePreference = Locale | 'system';
export const messages = {
  en,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  ja,
  'zh-ms': { ...zhCN, ...zhMS },
  'zh-apple': { ...zhCN, ...zhApple },
};
export function localeForI18next(locale: Locale) {
  return locale === 'zh-ms' ? 'zh-CN-x-ms' : locale === 'zh-apple' ? 'zh-CN-x-apple' : locale;
}
export function localeForFormatting(locale: string) {
  return ['zh-ms', 'zh-apple', 'zh-cn-x-ms', 'zh-cn-x-apple'].includes(locale.toLowerCase())
    ? 'zh-CN'
    : locale;
}
export function baseLanguage(preference: LanguagePreference) {
  return preference === 'zh-ms' || preference === 'zh-apple' ? 'zh-CN' : preference;
}
export function isLocale(value: unknown): value is Locale {
  return locales.some((locale) => locale === value);
}
export function languagePreference(value: unknown): LanguagePreference {
  return value === 'system' || isLocale(value) ? value : 'system';
}
export function resolveLocale(preference: LanguagePreference, systemLocale: string): Locale {
  if (preference !== 'system') return preference;
  const parts = systemLocale.replaceAll('_', '-').toLowerCase().split('-');
  if (parts[0] === 'ja') return 'ja';
  if (parts[0] !== 'zh') return 'en';
  if (parts.includes('hans')) return 'zh-CN';
  if (parts.includes('hant') || parts.some((part) => ['tw', 'hk', 'mo'].includes(part)))
    return 'zh-TW';
  return 'zh-CN';
}
