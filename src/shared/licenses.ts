export interface LicenseRecord {
  id: string;
  name: string;
  version: string;
  license: string;
  url: string;
  text: string;
  format?: 'html';
}
export type LicenseMetadata = Omit<LicenseRecord, 'text' | 'format'>;
