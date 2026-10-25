import type { Messages } from '../../shared/i18n/en';
import type { PerceptionChannelId } from '../../shared/aiPerception';

export type SettingsDetail =
  | {
      page:
        | 'backgroundImage'
        | 'liquidGlass'
        | 'fonts'
        | 'music'
        | 'searchTemplate'
        | 'weatherLocation'
        | 'weatherApiKey'
        | 'aiEndpoints'
        | 'aiCredentials'
        | 'aiModels'
        | 'aiShared'
        | 'thirdPartyLicenses'
        | 'addQuickApp'
        | 'addWorkflow';
    }
  | { page: 'quickAppName'; appId: string }
  | { page: 'workflow'; index: number }
  | { page: 'aiEndpoint' | 'aiCredential' | 'aiModel'; id: number }
  | { page: 'perceptionChannel'; channel: PerceptionChannelId };

const perceptionChannelTitle: Record<PerceptionChannelId, keyof Messages> = {
  clock: 'perceptionClock',
  locale: 'perceptionLocale',
  place: 'perceptionPlace',
  host: 'perceptionHost',
  resources: 'perceptionResources',
  battery: 'perceptionBattery',
  music: 'perceptionMusic',
  weather: 'perceptionWeather',
  diagnose: 'perceptionDiagnose',
  settings: 'perceptionSettings',
  desktop: 'perceptionDesktop',
};

const detailLabels: Record<SettingsDetail['page'], keyof Messages> = {
  backgroundImage: 'backgroundImage',
  liquidGlass: 'liquidGlassExperimental',
  fonts: 'fontSettings',
  music: 'musicSettings',
  searchTemplate: 'searchEngineUrl',
  weatherLocation: 'location',
  weatherApiKey: 'weatherApiKey',
  addQuickApp: 'addApp',
  addWorkflow: 'addWorkflow',
  quickAppName: 'appName',
  workflow: 'editWorkflow',
  aiEndpoints: 'aiBaseUrlConfig',
  aiEndpoint: 'aiBaseUrlConfig',
  aiCredentials: 'aiKeysConfig',
  aiCredential: 'apiKey',
  aiModels: 'aiModelsConfig',
  aiModel: 'aiModel',
  aiShared: 'aiSharedSettings',
  perceptionChannel: 'perception',
  thirdPartyLicenses: 'thirdPartyLicenses',
};

export function detailTitleKey(detail: SettingsDetail): keyof Messages {
  return detail.page === 'perceptionChannel'
    ? perceptionChannelTitle[detail.channel]
    : detailLabels[detail.page];
}

export function detailEntryId(detail: SettingsDetail) {
  if (detail.page === 'perceptionChannel') return `perceptionChannel-${detail.channel}`;
  if ('id' in detail) return `${detail.page}-${detail.id}`;
  return detail.page === 'quickAppName'
    ? `quick-app-${detail.appId}`
    : detail.page === 'workflow'
      ? `workflow-${detail.index}`
      : detail.page;
}
