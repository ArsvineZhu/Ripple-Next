import {
  PreferenceButton,
  PreferenceGroup,
  PreferenceCard,
  PreferenceRow,
  SettingLink,
} from '../components/preferences';
import { useTranslation } from 'react-i18next';
import { ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { bugs, license, productName, repository, version } from '../../../package.json';
import {
  githubAvatarUrl,
  githubProfileUrl,
  productDevelopers,
  productWebsite,
} from '../../shared/productCredits';
import appIcon from '../../assets/icons/icon.png';
import { InlineNotices } from '../components/InlineNotices';
import { DangerAction } from '../components/DangerAction';
import { type SettingsDetail } from '../lib/settingsDetails';
import styles from '../components/preferences/Preferences.module.css';

function DeveloperAvatar({ name, github }: { name: string; github: string }) {
  const [failed, setFailed] = useState(false);
  if (failed)
    return (
      <span className={styles.developerFallback} aria-hidden="true">
        {[...name][0] ?? '?'}
      </span>
    );
  return (
    <img
      className={styles.developerAvatar}
      src={githubAvatarUrl(github)}
      alt=""
      width={36}
      height={36}
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}

export function SettingsAbout({ onOpenDetail }: { onOpenDetail(detail: SettingsDetail): void }) {
  const { t } = useTranslation();
  const repositoryUrl = repository.url.replace(/\.git$/, '');
  const licenseUrl = `${repositoryUrl}/blob/main/LICENSE`;
  const open = (url: string) => void window.electronAPI.openExternal(url);
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
        <PreferenceRow label={t('website')}>
          <button type="button" className={styles.aboutLink} onClick={() => open(productWebsite)}>
            {productWebsite.replace(/^https:\/\//, '')}
            <ExternalLink size={13} aria-hidden="true" />
          </button>
        </PreferenceRow>
        <PreferenceRow label={t('license')}>
          <button type="button" className={styles.aboutLink} onClick={() => open(licenseUrl)}>
            {license}
            <ExternalLink size={13} aria-hidden="true" />
          </button>
        </PreferenceRow>
        <PreferenceRow label={t('repository')}>
          <button type="button" className={styles.aboutLink} onClick={() => open(repositoryUrl)}>
            {repositoryUrl.replace(/^https:\/\//, '')}
            <ExternalLink size={13} aria-hidden="true" />
          </button>
        </PreferenceRow>
        <PreferenceRow label={t('feedback')}>
          <button type="button" className={styles.aboutLink} onClick={() => open(bugs.url)}>
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
      <PreferenceCard caption={t('developers')}>
        <ul className={styles.developerList}>
          {productDevelopers.map((person) => (
            <li key={person.github} className={styles.developerRow}>
              <button
                type="button"
                className={styles.developerIdentity}
                onClick={() => open(githubProfileUrl(person.github))}
              >
                <DeveloperAvatar name={person.name} github={person.github} />
                <span>{person.name}</span>
              </button>
              {person.website && (
                <button
                  type="button"
                  className={styles.aboutLink}
                  onClick={() => {
                    if (person.website) open(person.website);
                  }}
                >
                  {t('developerWebsite')}
                  <ExternalLink size={13} aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      </PreferenceCard>
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
