import type { Messages } from '../../shared/i18n/en';

export type SettingsDetail =
  | {
      page:
        | 'backgroundImage'
        | 'liquidGlass'
        | 'searchTemplate'
        | 'weatherLocation'
        | 'weatherApiKey'
        | 'aiEndpoints'
        | 'aiCredentials'
        | 'aiModels'
        | 'aiCustomizations'
        | 'thirdPartyLicenses'
        | 'addQuickApp'
        | 'addWorkflow';
    }
  | { page: 'quickAppName'; appId: string }
  | { page: 'workflow'; index: number }
  | { page: 'aiEndpoint' | 'aiCredential' | 'aiModel' | 'aiCustomization'; id: number };

export const detailLabels: Record<SettingsDetail['page'], keyof Messages> = {
  backgroundImage: 'backgroundImage',
  liquidGlass: 'liquidGlassExperimental',
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
  aiCustomizations: 'aiModelCustomization',
  aiCustomization: 'aiModelCustomization',
  thirdPartyLicenses: 'thirdPartyLicenses',
};

export function detailEntryId(detail: SettingsDetail) {
  if ('id' in detail) return `${detail.page}-${detail.id}`;
  return detail.page === 'quickAppName'
    ? `quick-app-${detail.appId}`
    : detail.page === 'workflow'
      ? `workflow-${detail.index}`
      : detail.page;
}
