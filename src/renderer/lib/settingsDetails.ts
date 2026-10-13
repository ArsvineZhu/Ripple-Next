import type { Messages } from '../../shared/i18n/en';

export type SettingsDetail =
  | {
      page:
        | 'backgroundImage'
        | 'searchTemplate'
        | 'weatherLocation'
        | 'aiBaseUrl'
        | 'apiKey'
        | 'addQuickApp'
        | 'addWorkflow';
    }
  | { page: 'quickAppName'; appId: string };

export const detailLabels: Record<SettingsDetail['page'], keyof Messages> = {
  backgroundImage: 'backgroundImage',
  searchTemplate: 'searchEngineUrl',
  weatherLocation: 'location',
  aiBaseUrl: 'aiBaseUrl',
  apiKey: 'apiKey',
  addQuickApp: 'addApp',
  addWorkflow: 'addWorkflow',
  quickAppName: 'appName',
};

export function detailEntryId(detail: SettingsDetail) {
  return detail.page === 'quickAppName' ? `quick-app-${detail.appId}` : detail.page;
}
