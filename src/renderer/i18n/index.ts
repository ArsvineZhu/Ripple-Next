import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import {
  messages,
  languagePreference,
  resolveLocale,
  localeForI18next,
  localeForFormatting,
} from '../../shared/i18n';
import type { LanguagePreference } from '../../shared/i18n';
const i18n = createInstance();
let systemLocale = navigator.language;
async function synchronizeLanguage(preference: LanguagePreference) {
  const locale = resolveLocale(preference, systemLocale);
  await i18n.changeLanguage(localeForI18next(locale));
  document.documentElement.lang = localeForFormatting(locale);
  await window.electronAPI?.setUILocale?.(locale);
}
export async function initializeI18n(savedPreference: LanguagePreference) {
  systemLocale = (await window.electronAPI?.getSystemLocale()) || navigator.language;
  const preference = languagePreference(savedPreference);
  await i18n.use(initReactI18next).init({
    resources: Object.fromEntries(
      Object.entries(messages).map(([locale, translation]) => [
        localeForI18next(locale as keyof typeof messages),
        { translation },
      ]),
    ),
    lng: localeForI18next(resolveLocale(preference, systemLocale)),
    fallbackLng: {
      'zh-CN-x-ms': ['zh-CN', 'en'],
      'zh-CN-x-apple': ['zh-CN', 'en'],
      default: ['en'],
    },
    keySeparator: false,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
  await synchronizeLanguage(preference);
}
export async function changeLanguagePreference(preference: LanguagePreference) {
  await synchronizeLanguage(preference);
}
