import { describe, expect, it } from 'vitest';
import { createInstance } from 'i18next';
import {
  languagePreference,
  messages,
  resolveLocale,
  localeForI18next,
  localeForFormatting,
  baseLanguage,
} from '../../src/shared/i18n';
import { formatDateShort, formatTime, formatOverviewDate } from '../../src/renderer/lib/date';
import { defaultAppState } from '../../src/shared/appState';
describe('language selection', () => {
  it('matches Chinese script before region and maps supported system languages', () => {
    for (const language of ['zh-CN', 'zh_SG', 'zh-Hans-TW', 'zh'])
      expect(resolveLocale('system', language)).toBe('zh-CN');
    for (const language of ['zh-TW', 'zh-HK', 'zh-MO', 'zh-Hant-CN'])
      expect(resolveLocale('system', language)).toBe('zh-TW');
    expect(resolveLocale('system', 'ja-JP')).toBe('ja');
    expect(resolveLocale('system', 'en-GB')).toBe('en');
    expect(resolveLocale('system', 'de-DE')).toBe('en');
    expect(resolveLocale('en', 'zh-TW')).toBe('en');
  });
  it('defaults to the system language and accepts only supported preferences', () => {
    expect(languagePreference(defaultAppState.settings.language)).toBe('system');
    expect(languagePreference('unsupported')).toBe('system');
    expect(resolveLocale(languagePreference('ja'), 'en-US')).toBe('ja');
  });
});
describe('bundled messages and formatting', () => {
  it('switches Chinese styles with standard fallback, clear critical actions and zh-CN formats', async () => {
    const instance = createInstance();
    await instance.init({
      resources: Object.fromEntries(
        Object.entries(messages).map(([locale, translation]) => [
          localeForI18next(locale as keyof typeof messages),
          { translation },
        ]),
      ),
      fallbackLng: 'zh-CN',
      keySeparator: false,
    });
    const date = new Date('2026-10-13T06:05:00Z');
    for (const locale of ['zh-ms', 'zh-apple'] as const) {
      expect(languagePreference(locale)).toBe(locale);
      expect(baseLanguage(locale)).toBe('zh-CN');
      expect(localeForFormatting(localeForI18next(locale))).toBe('zh-CN');
      await instance.changeLanguage(localeForI18next(locale));
      expect(instance.t('guideTitle')).toBe(messages[locale].guideTitle);
      expect(instance.t('guideTitle')).not.toBe(messages['zh-CN'].guideTitle);
      expect(instance.t('quit')).toBe(messages['zh-CN'].quit);
      expect(instance.t('glassIorLabel')).toBe(messages['zh-CN'].glassIorLabel);
      expect(formatOverviewDate(locale, date, 'Asia/Tokyo', true)).toBe(
        formatOverviewDate('zh-CN', date, 'Asia/Tokyo', true),
      );
      expect(formatTime(locale, true, date, 'Asia/Tokyo', true)).toBe(
        formatTime('zh-CN', true, date, 'Asia/Tokyo', true),
      );
    }
  });
  it('uses contextual styles across features while keeping critical failure and confirmation semantics', () => {
    for (const locale of ['zh-ms', 'zh-apple'] as const) {
      for (const key of [
        'guideTitle',
        'workflowsEmpty',
        'tasksEmpty',
        'clipboardEmpty',
        'musicIdleArtistHint',
        'fontSettingsHint',
        'glassPreviewHint',
        'searchHint',
      ])
        expect(messages[locale][key as keyof typeof messages.en]).not.toBe(
          messages['zh-CN'][key as keyof typeof messages.en],
        );
      for (const key of [
        'stateLoadFailed',
        'stateSaveFailed',
        'confirmAction',
        'cancelAction',
        'confirmRemove',
        'secretStorageUnavailable',
      ])
        expect(messages[locale][key as keyof typeof messages.en]).toBe(
          messages['zh-CN'][key as keyof typeof messages.en],
        );
    }
  });
  it('ships matching non-empty keys and interpolation variables in every language', () => {
    const keys = Object.keys(messages.en).sort();
    const variables = (text: string) =>
      [...text.matchAll(/{{\s*([^},]+)(?:,[^}]+)?}}/g)].map((match) => match[1]).sort();
    for (const catalog of Object.values(messages)) {
      expect(Object.keys(catalog).sort()).toEqual(keys);
      for (const key of keys) {
        const message = catalog[key as keyof typeof catalog];
        expect(message.trim().length, key).toBeGreaterThan(0);
        expect(variables(message), key).toEqual(
          variables(messages.en[key as keyof typeof messages.en]),
        );
      }
    }
  });
  it('switches dictionaries without leaking keys or interpolation markers and supports item counts', async () => {
    const instance = createInstance();
    await instance.init({
      resources: Object.fromEntries(
        Object.entries(messages).map(([locale, translation]) => [locale, { translation }]),
      ),
      lng: 'en',
      fallbackLng: 'en',
      keySeparator: false,
    });
    expect(instance.t('items', { count: 1 })).toBe('1 item');
    expect(instance.t('items', { count: 2 })).toBe('2 items');
    for (const locale of ['zh-CN', 'zh-TW', 'ja']) {
      await instance.changeLanguage(locale);
      expect(instance.t('language')).toBe(messages[locale as keyof typeof messages].language);
      expect(instance.t('positionX', { value: '50.0' })).not.toContain('{{');
      expect(instance.t('items', { count: 2 })).not.toContain('items');
    }
  });
  it('pads midnight in 24-hour mode while preserving explicit 12-hour preferences', () => {
    for (const locale of ['en', 'zh-CN', 'zh-TW', 'ja']) {
      expect(formatTime(locale, false, new Date('2026-10-23T16:54:00Z'), 'Asia/Shanghai')).toBe(
        '00:54',
      );
      expect(formatTime(locale, false, new Date('2026-10-24T00:05:00Z'), 'UTC')).toBe('00:05');
      expect(formatTime(locale, true, new Date('2026-10-24T00:05:00Z'), 'UTC')).toBe('12:05');
    }
  });
  it('formats dates in the selected language and preserves the selected clock cycle', () => {
    const date = new Date(2026, 9, 4, 13, 5);
    expect(formatDateShort('ja', date)).not.toEqual(formatDateShort('en', date));
    expect(formatTime('en', true, date)).toBe('1:05');
    expect(formatTime('en', false, date)).toBe('13:05');
    expect(formatTime('ja', true, date)).not.toContain('午後');
    const instant = new Date('2026-10-04T13:05:00.000Z');
    expect(formatTime('en', false, instant, 'UTC')).toBe('13:05');
    expect(formatTime('en', false, instant, 'Asia/Tokyo')).toBe('22:05');
    expect(formatTime('en', true, instant, 'UTC', true)).toBe('1:05 P.M.');
    expect(formatTime('en', true, new Date('2026-10-04T00:05:00Z'), 'UTC', true)).toBe(
      '12:05 A.M.',
    );
    expect(formatTime('ja', true, instant, 'Asia/Tokyo', true)).toBe('午後10:05');
    expect(formatTime('en', false, instant, 'UTC', true)).toBe('13:05');
    const acrossDay = new Date('2026-10-04T23:30:00.000Z');
    expect(formatDateShort('en', acrossDay, 'UTC')).not.toBe(
      formatDateShort('en', acrossDay, 'Asia/Tokyo'),
    );
  });
  it('puts a localized period in the smaller expanded date line in locale order', () => {
    const instant = new Date('2026-10-13T06:05:00Z');
    expect(formatOverviewDate('zh-CN', instant, 'Asia/Tokyo', true)).toBe(
      '2026 年 10 月 13 日 下午 · 周二',
    );
    expect(formatOverviewDate('en', instant, 'Asia/Tokyo', true)).toBe('PM · Tue, Oct 13, 2026');
    expect(formatOverviewDate('zh-TW', instant, 'UTC', true)).toContain('日 上午');
    expect(formatOverviewDate('ja', instant, 'Asia/Tokyo', true)).toContain('日 午後');
    expect(formatOverviewDate('zh-CN', instant, 'Asia/Tokyo')).not.toContain('下午');
  });
  it('spaces Chinese and Japanese date numbers, units and weekdays', () => {
    const date = new Date('2026-10-09T12:00:00Z');
    expect(formatDateShort('zh-CN', date, 'UTC')).toBe('10 月 9 日 周五');
    expect(formatDateShort('zh-TW', date, 'UTC')).toBe('10 月 9 日 週五');
    expect(formatDateShort('ja', date, 'UTC')).toBe('10 月 9 日 (金)');
    expect(formatDateShort('en', date, 'UTC')).toBe(
      new Intl.DateTimeFormat('en', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      }).format(date),
    );
  });
});
