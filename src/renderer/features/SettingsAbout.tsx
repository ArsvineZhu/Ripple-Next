import {
  PreferenceButton,
  PreferenceGroup,
  PreferenceCard,
  PreferenceRow,
  SettingLink,
} from '../components/preferences';
import { useTranslation } from 'react-i18next';
import { ExternalLink } from 'lucide-react';
import { author, bugs, license, productName, repository, version } from '../../../package.json';
import appIcon from '../../assets/icons/icon.png';
import { InlineNotices } from '../components/InlineNotices';
import { DangerAction } from '../components/DangerAction';
import { type SettingsDetail } from '../lib/settingsDetails';
import styles from '../components/preferences/Preferences.module.css';

export function SettingsAbout({ onOpenDetail }: { onOpenDetail(detail: SettingsDetail): void }) {
  const { t } = useTranslation();
  const repositoryUrl = repository.url.replace(/\.git$/, '');
  const licenseUrl = `${repositoryUrl}/blob/main/LICENSE`;
  return (
    <>
      <section className={styles.aboutHero} aria-labelledby="about-product-title" data-about-hero>
        <img src={appIcon} alt="" width={72} height={72} draggable={false} />
        <h2 id="about-product-title">{productName}</h2>
        <p>{t('aboutTagline')}</p>
        <span>
          {t('appVersion')} {version}
        </span>
      </section>
      <PreferenceGroup>
        <PreferenceRow label={t('developer')}>
          <span className={styles.aboutValue}>{author.name}</span>
        </PreferenceRow>
        <PreferenceRow label={t('license')}>
          <button
            type="button"
            className={styles.aboutLink}
            onClick={() => void window.electronAPI.openExternal(licenseUrl)}
          >
            {license}
            <ExternalLink size={13} aria-hidden="true" />
          </button>
        </PreferenceRow>
        <PreferenceRow label={t('repository')}>
          <button
            type="button"
            className={styles.aboutLink}
            onClick={() => void window.electronAPI.openExternal(repositoryUrl)}
          >
            {repositoryUrl.replace(/^https:\/\//, '')}
            <ExternalLink size={13} aria-hidden="true" />
          </button>
        </PreferenceRow>
        <PreferenceRow label={t('feedback')}>
          <button
            type="button"
            className={styles.aboutLink}
            onClick={() => void window.electronAPI.openExternal(bugs.url)}
          >
            {t('reportIssue')}
            <ExternalLink size={13} aria-hidden="true" />
          </button>
        </PreferenceRow>
        <PreferenceRow label={t('diagnostics')}>
          <PreferenceButton
            type="button"

            onClick={() => {
              void window.electronAPI.openDiagnosticsFolder().catch(() => {});
            }}
          >
            {t('openDiagnosticsFolder')}
          </PreferenceButton>
        </PreferenceRow>
      </PreferenceGroup>
      <InlineNotices area="settings" codes={['diagnosticsFolderOpenFailed']} />
      <PreferenceGroup>
        <SettingLink
          detail={{ page: 'thirdPartyLicenses' }}
          label={t('thirdPartyLicenses')}
          value={undefined}
          hint={t('thirdPartyLicenseHint')}
          navigate={onOpenDetail}
        />
      </PreferenceGroup>
      <PreferenceCard>
        <div className={styles.aboutQuit}>
          <p className={styles.hint}>{t('quitRippleHint')}</p>
          <DangerAction
            label={t('quitRipple')}
            className={styles.quitButton}
            onConfirm={() => window.electronAPI.quitApp()}
          >
            {t('quitRipple')}
          </DangerAction>
        </div>
      </PreferenceCard>
    </>
  );
}
