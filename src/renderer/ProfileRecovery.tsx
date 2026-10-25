import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './styles/StartupError.module.css';

export function ProfileRecovery() {
  const { t } = useTranslation();
  const [backupPath, setBackupPath] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const backup = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await window.electronAPI.backupIncompatibleProfile();
      setBackupPath(result.path);
      setConfirming(false);
    } catch {
      setError(t('profileBackupFailed'));
    } finally {
      setBusy(false);
    }
  };

  const reset = async (confirmedDiscard: boolean) => {
    setBusy(true);
    setError(null);
    try {
      await window.electronAPI.resetIncompatibleProfile(confirmedDiscard);
    } catch {
      setError(t('profileResetFailed'));
      setBusy(false);
    }
  };

  const startFresh = () => {
    if (backupPath) void reset(false);
    else setConfirming(true);
  };

  if (confirming) {
    return (
      <main className={styles.screen}>
        <section className={styles.panel} role="alertdialog" aria-labelledby="profile-reset-title">
          <h1 id="profile-reset-title">{t('profileResetTitle')}</h1>
          <p>{t('profileResetBody')}</p>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primary}
              disabled={busy}
              onClick={() => void reset(true)}
            >
              {t('profileResetConfirm')}
            </button>
            <button
              type="button"
              className={styles.secondary}
              disabled={busy}
              onClick={() => setConfirming(false)}
            >
              {t('profileResetCancel')}
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.screen}>
      <section className={styles.panel} role="alert" aria-labelledby="profile-incompatible-title">
        <h1 id="profile-incompatible-title">{t('profileIncompatibleTitle')}</h1>
        <p>{t('profileIncompatibleBody')}</p>
        {backupPath && (
          <p className={styles.path}>{t('profileBackupSaved', { path: backupPath })}</p>
        )}
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primary}
            disabled={busy}
            onClick={() => void backup()}
          >
            {t('profileBackup')}
          </button>
          <button type="button" className={styles.secondary} disabled={busy} onClick={startFresh}>
            {t('profileStartFresh')}
          </button>
        </div>
      </section>
    </main>
  );
}
