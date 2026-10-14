import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LicenseMetadata, LicenseRecord } from '../../shared/licenses';
import { PreferenceCard, PreferenceGroup, PreferenceLink } from '../components/preferences';
import styles from '../components/preferences/Preferences.module.css';
import { useNotifications } from '../components/NotificationProvider';

export function ThirdPartyLicenses() {
  const { t } = useTranslation();
  const { notify } = useNotifications();
  const request = useRef(0);
  const [items, setItems] = useState<LicenseMetadata[]>([]);
  const [selected, setSelected] = useState<LicenseRecord | null>(null);
  const [query, setQuery] = useState('');
  useEffect(() => {
    let active = true;
    void window.electronAPI
      .listThirdPartyLicenses()
      .then((value) => {
        if (active) setItems(value);
      })
      .catch(() => {
        if (active) notify({ severity: 'error', code: 'stateLoadFailed', area: 'settings' });
      });
    return () => {
      active = false;
      // oxlint-disable-next-line react-hooks/exhaustive-deps -- This counter invalidates requests; it is not a DOM ref.
      request.current++;
    };
  }, [notify]);
  const show = async (id: string) => {
    const version = ++request.current;
    try {
      const record = await window.electronAPI.readThirdPartyLicense(id);
      if (version !== request.current) return;
      if (record.format === 'html') {
        const doc = new DOMParser().parseFromString(record.text, 'text/html');
        doc.querySelectorAll('script,style').forEach((node) => node.remove());
        record.text = doc.body.textContent ?? '';
      }
      setSelected(record);
    } catch {
      if (version === request.current)
        notify({ severity: 'error', code: 'stateLoadFailed', area: 'settings' });
    }
  };
  return (
    <>
      <PreferenceCard>
        <div className={styles.prefStack}>
          <p className={styles.hint}>{t('thirdPartyLicenseHint')}</p>
          <input
            className={styles.input}
            aria-label={t('searchLicenses')}
            placeholder={t('searchLicenses')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </PreferenceCard>
      {selected && (
        <PreferenceCard caption={`${selected.name} · ${selected.version}`}>
          <div className={styles.prefStack}>
            <pre className={styles.licenseText}>{selected.text}</pre>
          </div>
        </PreferenceCard>
      )}
      <PreferenceGroup>
        {items
          .filter((item) =>
            `${item.name} ${item.license}`.toLowerCase().includes(query.toLowerCase()),
          )
          .map((item) => (
            <PreferenceLink
              key={item.id}
              entry={`license-${item.id}`}
              label={item.name}
              value={item.license}
              hint={item.version}
              onClick={() => void show(item.id)}
            />
          ))}
      </PreferenceGroup>
    </>
  );
}
